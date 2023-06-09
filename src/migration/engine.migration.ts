import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { EngineV2 } from '../model/config.model';
import EncryptionService from '../service/encryption.service';
import { EngineSettingsCommandDTO } from '../model/engine.model';
import { convertAuthentication, convertLogLevel } from './utils';

export default class EngineMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger,
    private readonly encryptionService: EncryptionService
  ) {}

  async migrate(engine: EngineV2): Promise<void> {
    this.logger.info(`Migrating OIBus engine "${engine.name}"`);
    try {
      const command: EngineSettingsCommandDTO = {
        name: engine.name,
        port: engine.port,
        logParameters: {
          console: {
            level: convertLogLevel(engine.logParameters.consoleLog.level)
          },
          file: {
            level: convertLogLevel(engine.logParameters.fileLog.level),
            maxFileSize: engine.logParameters.fileLog.maxSize,
            numberOfFiles: engine.logParameters.fileLog.numberOfFile
          },
          database: {
            level: convertLogLevel(engine.logParameters.sqliteLog.level),
            maxNumberOfLogs: engine.logParameters.sqliteLog.maxNumberOfLogs
          },
          loki: {
            level: convertLogLevel(engine.logParameters.lokiLog.level),
            interval: engine.logParameters.lokiLog.interval,
            address: engine.logParameters.lokiLog.lokiAddress,
            tokenAddress: engine.logParameters.lokiLog.tokenAddress,
            username: engine.logParameters.lokiLog.username,
            password: engine.logParameters.lokiLog.password
              ? await this.encryptionService.convertCiphering(engine.logParameters.lokiLog.password)
              : '',
            proxyId: null
          }
        },
        healthSignal: {
          logging: {
            enabled: engine.healthSignal.logging.enabled,
            interval: engine.healthSignal.logging.frequency
          },
          http: {
            enabled: engine.healthSignal.http.enabled,
            interval: engine.healthSignal.http.frequency,
            verbose: true,
            address: `${engine.healthSignal.http.host}${engine.healthSignal.http.endpoint}`,
            proxyId: null,
            authentication: convertAuthentication(
              'basic',
              engine.healthSignal.http.authentication.username,
              engine.healthSignal.http.authentication.password
                ? await this.encryptionService.convertCiphering(engine.healthSignal.http.authentication.password)
                : ''
            )
          }
        }
      };
      this.repositoryService.engineRepository.updateEngineSettings(command);
    } catch (error) {
      this.logger.error(`Error when migrating engine settings of "${engine.name}": ${error}`);
    }
  }
}
