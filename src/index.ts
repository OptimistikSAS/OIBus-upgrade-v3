import path from 'node:path';

import { filesExists, getCommandLineArguments } from './service/utils';
import LoggerService from './service/logger/logger.service';
import migrationLegacy from './migration/legacy/migration.service.js';

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
  await migrationLegacy(configFilePath, loggerService.logger!);

  loggerService.logger!.info('Migrating config file into OIBus v3 database');
  if (!(await filesExists(path.resolve(CONFIG_DATABASE)))) {
    loggerService.logger!.error(
      `Error while loading OIBus settings from database. Make sure an OIBus v3 is running and its settings are in ${dataFolder}`
    );
    return;
  }
  if (!(await filesExists(path.resolve(CRYPTO_DATABASE)))) {
    loggerService.logger!.error('Error while loading OIBus crypto settings from database');
    return;
  }

  //TODO migrate to v3 here

  loggerService.logger!.info('OIBus migration completed. Please restart OIBus');
})();
