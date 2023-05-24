import path from 'node:path';

import { filesExists, getCommandLineArguments } from './service/utils';
import LoggerService from './service/logger/logger.service';
import migrationLegacy from './migration/legacy/migration.service.js';
import { OIBusV2Config } from './model/config.model';
import RepositoryService from './service/repository.service';
import ExternalSourcesMigration from './migration/external-sources.migration';
import IPFiltersMigration from './migration/ip-filters.migration';
import ProxiesMigration from './migration/proxies.migration';
import EncryptionService from './service/encryption.service';
import EngineMigration from './migration/engine.migration';
import UserMigration from './migration/user.migration';

const CONFIG_FILE_NAME = 'oibus.json';
const CONFIG_DATABASE = 'oibus.db';
const CRYPTO_DATABASE = 'crypto.db';

(async () => {
  const { dataFolder } = getCommandLineArguments();

  const baseDir = dataFolder;
  process.chdir(baseDir);
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

  const repositoryService = new RepositoryService(path.resolve(CONFIG_DATABASE), path.resolve(CRYPTO_DATABASE));

  const oibusSettings = repositoryService.engineRepository.getEngineSettings();
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

  const externalSourcesMigration = new ExternalSourcesMigration(repositoryService, loggerService.logger!);
  await externalSourcesMigration.migrate(config.engine.externalSources);

  const ipFiltersMigration = new IPFiltersMigration(repositoryService, loggerService.logger!);
  await ipFiltersMigration.migrate(config.engine.filter);

  const proxiesMigration = new ProxiesMigration(repositoryService, loggerService.logger!, encryptionService);
  await proxiesMigration.migrate(config.engine.proxies);

  const engineMigration = new EngineMigration(repositoryService, loggerService.logger!, encryptionService);
  await engineMigration.migrate(config.engine);

  const userMigration = new UserMigration(repositoryService, loggerService.logger!, encryptionService);
  await userMigration.migrate(config.engine.user, config.engine.password);

  //TODO migrate to v3 here
  // Scan mode
  // North
  // South

  loggerService.logger!.info('OIBus migration completed. Please restart OIBus');
})();
