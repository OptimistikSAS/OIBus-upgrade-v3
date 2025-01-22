import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { EngineV2 } from '../model/config.model';
import { EngineSettings } from '../model/engine.model';
import { convertLogLevel } from './utils';

export default class EngineMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger
  ) {}

  async migrate(engine: EngineV2): Promise<void> {
    this.logger.info(`Migrating OIBus engine "${engine.name}"`);
    try {
      const maxFileSize = engine.logParameters.fileLog.maxSize > 10 ? 10 : engine.logParameters.fileLog.maxSize;
      const maxNumberOfLogs =
        engine.logParameters.sqliteLog.maxNumberOfLogs < 100_000 ? 100_000 : engine.logParameters.sqliteLog.maxNumberOfLogs;
      const command: Omit<EngineSettings, 'id' | 'version' | 'launcherVersion'> = {
        name: engine.name,
        port: engine.port,
        proxyEnabled: false,
        proxyPort: 9000,
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
            level: 'silent',
            interval: engine.logParameters.lokiLog.interval,
            address: '',
            username: '',
            password: ''
          },
          oia: {
            level: 'silent',
            interval: 10
          }
        }
      };
      this.repositoryService.engineRepository.update(command);
    } catch (error) {
      this.logger.error(`Error when migrating engine settings of "${engine.name}": ${error}`);
    }
  }
}
