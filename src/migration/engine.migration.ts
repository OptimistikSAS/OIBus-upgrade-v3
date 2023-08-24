import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { EngineV2 } from '../model/config.model';
import EncryptionService from '../service/encryption.service';
import { EngineSettingsCommandDTO } from '../model/engine.model';
import { convertLogLevel } from './utils';

export default class EngineMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger,
    private readonly encryptionService: EncryptionService
  ) {}

  async migrate(engine: EngineV2): Promise<void> {
    this.logger.info(`Migrating OIBus engine "${engine.name}"`);
    try {
      const maxFileSize = engine.logParameters.fileLog.maxSize > 10 ? 10 : engine.logParameters.fileLog.maxSize;
      const maxNumberOfLogs =
        engine.logParameters.sqliteLog.maxNumberOfLogs < 100_000 ? 100_000 : engine.logParameters.sqliteLog.maxNumberOfLogs;
      const command: EngineSettingsCommandDTO = {
        name: engine.name,
        port: engine.port,
        logParameters: {
          console: {
            level: convertLogLevel(engine.logParameters.consoleLog.level)
          },
          file: {
            level: convertLogLevel(engine.logParameters.fileLog.level),
            maxFileSize: maxFileSize || 5,
            numberOfFiles: engine.logParameters.fileLog.numberOfFiles
          },
          database: {
            level: convertLogLevel(engine.logParameters.sqliteLog.level),
            maxNumberOfLogs: maxNumberOfLogs
          },
          loki: {
            level: convertLogLevel(engine.logParameters.lokiLog.level),
            interval: engine.logParameters.lokiLog.interval,
            address: engine.logParameters.lokiLog.lokiAddress,
            tokenAddress: engine.logParameters.lokiLog.tokenAddress,
            username: engine.logParameters.lokiLog.username,
            password: engine.logParameters.lokiLog.password
              ? await this.encryptionService.convertCiphering(engine.logParameters.lokiLog.password)
              : ''
          }
        }
      };
      this.repositoryService.engineRepository.updateEngineSettings(command);
    } catch (error) {
      this.logger.error(`Error when migrating engine settings of "${engine.name}": ${error}`);
    }
  }
}
