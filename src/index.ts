import path from 'node:path';

import { deleteFile, filesExists, getCommandLineArguments } from './service/utils';
import LoggerService from './service/logger/logger.service';
import migrationLegacy from './migration/legacy/migration.service.js';
import { OIBusV2Config } from './model/config.model';
import RepositoryService from './service/repository.service';
import IPFiltersMigration from './migration/ip-filters.migration';
import EncryptionService from './service/encryption.service';
import EngineMigration from './migration/engine.migration';
import UserMigration from './migration/user.migration';
import ScanModesMigration from './migration/scan-modes.migration';
import NorthMigration from './migration/north.migration';
import SouthMigration from './migration/south.migration';
import SouthCacheMigration from './migration/cache.migration';
import fs from 'node:fs/promises';
import DataFolderMigration from './migration/data-folder.migration';

const CONFIG_FILE_NAME = 'oibus.json';

const CONFIG_DATABASE = 'oibus.db';
const CRYPTO_DATABASE = 'crypto.db';
const CACHE_FOLDER = './cache';
const CACHE_DATABASE = 'cache.db';
const LOG_FOLDER_NAME = 'logs';
const LOG_DB_NAME = 'logs.db';

(async () => {
  const { dataFolder, check } = getCommandLineArguments();

  const baseDir = dataFolder;
  process.chdir(baseDir);

  if (check) {
    console.info('OIBus migration started in check mode. Exiting process.');
    return;
  }

  const loggerService = new LoggerService();
  await loggerService.start();
  loggerService.logger!.info(`Starting OIBus Upgrade tool with base directory ${baseDir}...`);

  const configFilePath = path.resolve(CONFIG_FILE_NAME);
  // Migrate config file to its latest version, if needed
  let config: OIBusV2Config;
  try {
    config = (await migrationLegacy(configFilePath, loggerService.logger!)) as OIBusV2Config;
  } catch (migrationError) {
    loggerService.logger!.error(`Error in migration: ${migrationError}`);
    return;
  }

  loggerService.logger!.info('Migrating config file into OIBus v3 database');

  if (!(await filesExists(path.resolve(CONFIG_DATABASE)))) {
    loggerService.logger!.error(
      `The file ${path.resolve(CONFIG_DATABASE)} does not exist. Make sure an OIBus v3 is running and its settings are in ${dataFolder}`
    );
    return;
  }
  if (!(await filesExists(path.resolve(CRYPTO_DATABASE)))) {
    loggerService.logger!.error(
      `The file ${path.resolve(CRYPTO_DATABASE)} does not exist. Make sure an OIBus v3 is running and its settings are in ${dataFolder}`
    );
    return;
  }

  if (!(await filesExists(path.resolve(CACHE_FOLDER, CACHE_DATABASE)))) {
    loggerService.logger!.error(
      `The file ${path.resolve(
        CACHE_FOLDER,
        CACHE_DATABASE
      )} does not exist. Make sure an OIBus v3 is running and its settings are in ${dataFolder}`
    );
    return;
  }

  if (!(await filesExists(path.resolve(LOG_FOLDER_NAME, LOG_DB_NAME)))) {
    loggerService.logger!.error(
      `The file ${path.resolve(
        LOG_FOLDER_NAME,
        LOG_DB_NAME
      )} does not exist. Make sure an OIBus v3 is running and its settings are in ${dataFolder}`
    );
    return;
  }

  const repositoryService = new RepositoryService(
    path.resolve(CONFIG_DATABASE),
    path.resolve(LOG_FOLDER_NAME, LOG_DB_NAME),
    path.resolve(CRYPTO_DATABASE),
    path.resolve(CACHE_FOLDER, CACHE_DATABASE)
  );
  const oibusSettings = repositoryService.engineRepository.get();
  if (!oibusSettings) {
    console.error('Error while loading OIBus settings from database');
    return;
  }
  const cryptoSettings = repositoryService.cryptoRepository.getCryptoSettings(oibusSettings.id);
  if (!cryptoSettings) {
    loggerService.logger!.error('Error while loading OIBus crypto settings from database');
    return;
  }
  const encryptionService = new EncryptionService(cryptoSettings);

  const ipFiltersMigration = new IPFiltersMigration(repositoryService, loggerService.logger!);
  await ipFiltersMigration.migrate(config.engine.filter);

  const engineMigration = new EngineMigration(repositoryService, loggerService.logger!);
  await engineMigration.migrate(config.engine);

  const userMigration = new UserMigration(repositoryService, loggerService.logger!, encryptionService);
  await userMigration.migrate(config.engine.user, config.engine.password);

  const scanModeMigration = new ScanModesMigration(repositoryService, loggerService.logger!);
  await scanModeMigration.migrate(config.engine.scanModes);

  const southMigration = new SouthMigration(repositoryService, loggerService.logger!, encryptionService);
  await southMigration.migrate(config.south);

  const southCacheMigration = new SouthCacheMigration(repositoryService, loggerService.logger!);
  const SOUTH_WITH_CACHE = ['OPCUA_HA', 'OPCHDA', 'SQL', 'RestApi'];
  await southCacheMigration.migrate(
    config.south.filter(south => SOUTH_WITH_CACHE.includes(south.type)),
    CACHE_FOLDER
  );

  const northMigration = new NorthMigration(repositoryService, loggerService.logger!, encryptionService);
  await northMigration.migrate(config.north, config.engine.proxies);

  const dataFolderMigration = new DataFolderMigration(baseDir, loggerService.logger!);
  await dataFolderMigration.migrate();

  // Removing obsolete files
  await deleteFile(path.resolve(LOG_FOLDER_NAME, 'journal.db'), loggerService.logger!);
  await deleteFile(path.resolve(CONFIG_FILE_NAME), loggerService.logger!);
  await deleteFile(path.resolve('./history-query.db'), loggerService.logger!);

  await fs.rm(path.resolve('./certs'), { recursive: true, force: true });
  await fs.rm(path.resolve(CACHE_FOLDER, 'archived'), { recursive: true, force: true });
  await fs.rm(path.resolve(CACHE_FOLDER, 'history-query'), { recursive: true, force: true });
  await fs.rm(path.resolve('./keys'), { recursive: true, force: true });

  loggerService.logger!.info('OIBus migration completed. Please restart OIBus');
})();
