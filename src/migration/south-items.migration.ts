import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { SouthV2 } from '../model/config.model';
import { migrateItemSettings } from './utils';
import { OibusItemCommandDTO } from '../model/south-connector.model';

export default class SouthItemsMigration {
  constructor(private readonly repositoryService: RepositoryService, private readonly logger: pino.Logger) {}

  async migrate(southConnector: SouthV2): Promise<void> {
    switch (southConnector.type) {
      case 'ADS':
      case 'Modbus':
      case 'MQTT':
      case 'OPCUA_HA':
      case 'OPCUA_DA':
      case 'OPCHDA':
        return await this.migratePoints(southConnector);
      case 'FolderScanner':
        return await this.createFolderScannerItem(southConnector);
      case 'SQL':
        return await this.createSQLItem(southConnector);
      case 'RestApi':
        return await this.createRestApiItem(southConnector);
      default:
        this.logger.error(`South type ${southConnector.type} not recognized`);
        return;
    }
  }

  migratePoints = async (southConnector: SouthV2) => {
    const items = southConnector.points;
    this.logger.info(`Migrating ${items.length} items for South "${southConnector.name}" ($${southConnector.id})`);
    for (const item of items) {
      this.logger.trace(`Migrating South point "${item.pointId}"`);
      try {
        const scanMode = this.repositoryService.scanModeRepository.getByName(item.scanMode);
        if (!scanMode && item.scanMode !== 'listen') {
          this.logger.error(`Could not find scanMode ${item.scanMode}`);
          continue;
        }
        const command: OibusItemCommandDTO = {
          name: item.pointId,
          scanModeId: scanMode?.id || 'subscription',
          settings: migrateItemSettings(southConnector, item, this.logger)
        };
        this.repositoryService.southItemRepository.createSouthItem(southConnector.id, command, item.id);
      } catch (error) {
        this.logger.error(`Error when migrating South "${JSON.stringify(item)}": ${error}`);
      }
    }
  };

  createFolderScannerItem = async (southConnector: SouthV2) => {
    const scanMode = this.repositoryService.scanModeRepository.getByName(southConnector.scanMode);
    if (!scanMode) {
      this.logger.error(`Could not find scanMode ${southConnector.scanMode}`);
      return;
    }
    const command: OibusItemCommandDTO = {
      name: southConnector.name,
      scanModeId: scanMode.id,
      settings: {
        regex: southConnector.settings.regex
      }
    };
    this.repositoryService.southItemRepository.createSouthItem(southConnector.id, command);
  };

  createSQLItem = async (southConnector: SouthV2) => {
    const scanMode = this.repositoryService.scanModeRepository.getByName(southConnector.scanMode);
    if (!scanMode) {
      this.logger.error(`Could not find scanMode ${southConnector.scanMode}`);
      return;
    }
    const command: OibusItemCommandDTO = {
      name: southConnector.name,
      scanModeId: scanMode.id,
      settings: {
        query: southConnector.settings.query,
        datetimeType: 'isostring',
        requestTimeout: southConnector.settings.requestTimeout,
        filename: southConnector.settings.filename,
        delimiter: southConnector.settings.delimiter,
        dateFormat: southConnector.settings.dateFormat,
        timeField: southConnector.settings.timeColumn,
        timezone: southConnector.settings.timezone
      }
    };
    this.repositoryService.southItemRepository.createSouthItem(southConnector.id, command);
  };

  createRestApiItem = async (southConnector: SouthV2) => {
    const scanMode = this.repositoryService.scanModeRepository.getByName(southConnector.scanMode);
    if (!scanMode) {
      this.logger.error(`Could not find scanMode ${southConnector.scanMode}`);
      return;
    }
    const command: OibusItemCommandDTO = {
      name: southConnector.name,
      scanModeId: scanMode.id,
      settings: {
        requestTimeout: southConnector.settings.requestTimeout,
        filename: southConnector.settings.filename,
        payloadParser: southConnector.settings.filename,
        delimiter: southConnector.settings.delimiter,
        variableDateFormat: southConnector.settings.variableDateFormat,
        requestMethod: southConnector.settings.requestMethod,
        endpoint: southConnector.settings.endpoint,
        queryParams: southConnector.settings.queryParams,
        body: southConnector.settings.body
      }
    };
    this.repositoryService.southItemRepository.createSouthItem(southConnector.id, command);
  };
}
