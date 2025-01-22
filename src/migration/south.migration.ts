import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { SouthV2 } from '../model/config.model';
import EncryptionService from '../service/encryption.service';
import { convertSouthType, migrateDelimiter, migrateItemSettings, migrateSouthSettings } from './utils';
import { SouthConnectorEntity, SouthConnectorItemEntity } from '../model/south-connector.model';
import { SouthItemSettings, SouthSettings } from '../model/south-settings.model';
import { generateRandomId } from '../service/utils';

export default class SouthMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger,
    private readonly encryptionService: EncryptionService
  ) {}

  async migrate(connectors: Array<SouthV2> = []): Promise<void> {
    this.logger.info(`Migrating ${connectors.length} South connectors`);
    for (const connector of connectors) {
      this.logger.debug(`Migrating South "${connector.name}" of type ${connector.type}`);
      try {
        let items: Array<SouthConnectorItemEntity<SouthItemSettings>> = [];
        try {
          switch (connector.type) {
            case 'ADS':
            case 'Modbus':
            case 'MQTT':
            case 'OPCUA_HA':
            case 'OPCUA_DA':
            case 'OPCHDA':
              items = await this.migratePoints(connector);
              break;
            case 'FolderScanner':
              items = await this.createFolderScannerItem(connector);
              break;
            case 'SQL':
              items = await this.createSQLItem(connector);
              break;
            case 'OdbcRemote':
              items = await this.createODBCItem(connector);
              break;
            case 'RestApi':
              items = await this.createRestApiItem(connector);
              break;
            default:
              this.logger.error(`South type ${connector.type} not recognized`);
          }
        } catch (error) {
          this.logger.error(`Error when migrating South item for connector "${JSON.stringify(connector.name)}": ${error}`);
        }
        const command: SouthConnectorEntity<SouthSettings, SouthItemSettings> = {
          id: connector.id,
          name: connector.name,
          description: '',
          type: convertSouthType(connector.type, connector.settings),
          enabled: connector.enabled,
          settings: await migrateSouthSettings(connector, this.encryptionService, this.logger),
          items
        };
        this.repositoryService.southConnectorRepository.saveSouthConnector(command);
      } catch (error) {
        this.logger.error(`Error when migrating South "${JSON.stringify(connector)}": ${error}`);
      }
    }
  }

  migratePoints = async (southConnector: SouthV2): Promise<Array<SouthConnectorItemEntity<SouthItemSettings>>> => {
    const newItems: Array<SouthConnectorItemEntity<SouthItemSettings>> = [];
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
        newItems.push({
          id: item.id,
          name: item.pointId,
          enabled: true,
          scanModeId: scanMode?.id || 'subscription',
          settings: migrateItemSettings(southConnector, item)
        });
      } catch (error) {
        this.logger.error(`Error when migrating South "${JSON.stringify(item)}": ${error}`);
      }
    }
    return newItems;
  };

  createFolderScannerItem = async (southConnector: SouthV2): Promise<Array<SouthConnectorItemEntity<SouthItemSettings>>> => {
    const newItems: Array<SouthConnectorItemEntity<SouthItemSettings>> = [];
    const scanMode = this.repositoryService.scanModeRepository.getByName(southConnector.scanMode);
    if (!scanMode) {
      this.logger.error(`Could not find scanMode ${southConnector.scanMode}`);
      return newItems;
    }
    newItems.push({
      id: generateRandomId(6),
      name: southConnector.name,
      enabled: true,
      scanModeId: scanMode.id,
      settings: {
        regex: southConnector.settings.regex,
        minAge: southConnector.settings.minAge,
        preserveFiles: southConnector.settings.preserveFiles,
        ignoreModifiedDate: southConnector.settings.ignoreModifiedDate
      }
    });
    return newItems;
  };

  createSQLItem = async (southConnector: SouthV2): Promise<Array<SouthConnectorItemEntity<SouthItemSettings>>> => {
    const newItems: Array<SouthConnectorItemEntity<SouthItemSettings>> = [];
    const scanMode = this.repositoryService.scanModeRepository.getByName(southConnector.scanMode);
    if (!scanMode) {
      this.logger.error(`Could not find scanMode ${southConnector.scanMode}`);
      return newItems;
    }

    switch (southConnector.settings.driver) {
      case 'mssql':
        newItems.push({
          id: generateRandomId(6),
          name: southConnector.name,
          enabled: true,
          scanModeId: scanMode.id,
          settings: {
            query: southConnector.settings.query,
            dateTimeFields: [
              {
                fieldName: southConnector.settings.timeColumn,
                useAsReference: true,
                type: 'string',
                format: southConnector.settings.dateFormat,
                timezone: southConnector.settings.timezone,
                locale: 'en-US'
              }
            ],
            serialization: {
              type: 'csv',
              filename: southConnector.settings.filename,
              delimiter: migrateDelimiter(southConnector.settings.delimiter),
              outputTimestampFormat: southConnector.settings.dateFormat,
              outputTimezone: southConnector.settings.timezone,
              compression: southConnector.settings.compression
            }
          }
        });
        break;
      case 'mysql':
        newItems.push({
          id: generateRandomId(6),
          name: southConnector.name,
          enabled: true,
          scanModeId: scanMode.id,
          settings: {
            query: southConnector.settings.query,
            requestTimeout: southConnector.settings.requestTimeout,
            dateTimeFields: [
              {
                fieldName: southConnector.settings.timeColumn,
                useAsReference: true,
                type: 'string',
                format: southConnector.settings.dateFormat,
                timezone: southConnector.settings.timezone,
                locale: 'en-US'
              }
            ],
            serialization: {
              type: 'csv',
              filename: southConnector.settings.filename,
              delimiter: migrateDelimiter(southConnector.settings.delimiter),
              outputTimestampFormat: southConnector.settings.dateFormat,
              outputTimezone: southConnector.settings.timezone,
              compression: southConnector.settings.compression
            }
          }
        });
        break;
      case 'postgresql':
        newItems.push({
          id: generateRandomId(6),
          name: southConnector.name,
          enabled: true,
          scanModeId: scanMode.id,
          settings: {
            query: southConnector.settings.query,
            dateTimeFields: [
              {
                fieldName: southConnector.settings.timeColumn,
                useAsReference: true,
                type: 'string',
                format: southConnector.settings.dateFormat,
                timezone: southConnector.settings.timezone,
                locale: 'en-US'
              }
            ],
            serialization: {
              type: 'csv',
              filename: southConnector.settings.filename,
              delimiter: migrateDelimiter(southConnector.settings.delimiter),
              outputTimestampFormat: southConnector.settings.dateFormat,
              outputTimezone: southConnector.settings.timezone,
              compression: southConnector.settings.compression
            }
          }
        });
        break;
      case 'oracle':
        newItems.push({
          id: generateRandomId(6),
          name: southConnector.name,
          enabled: true,
          scanModeId: scanMode.id,
          settings: {
            query: southConnector.settings.query,
            requestTimeout: southConnector.settings.requestTimeout,
            dateTimeFields: [
              {
                fieldName: southConnector.settings.timeColumn,
                useAsReference: true,
                type: 'string',
                format: southConnector.settings.dateFormat,
                timezone: southConnector.settings.timezone,
                locale: 'en-US'
              }
            ],
            serialization: {
              type: 'csv',
              filename: southConnector.settings.filename,
              delimiter: migrateDelimiter(southConnector.settings.delimiter),
              outputTimestampFormat: southConnector.settings.dateFormat,
              outputTimezone: southConnector.settings.timezone,
              compression: southConnector.settings.compression
            }
          }
        });
        break;
      case 'sqlite':
        newItems.push({
          id: generateRandomId(6),
          name: southConnector.name,
          enabled: true,
          scanModeId: scanMode.id,
          settings: {
            query: southConnector.settings.query,
            dateTimeFields: [
              {
                fieldName: southConnector.settings.timeColumn,
                useAsReference: true,
                type: 'string',
                format: southConnector.settings.dateFormat,
                timezone: southConnector.settings.timezone,
                locale: 'en-US'
              }
            ],
            serialization: {
              type: 'csv',
              filename: southConnector.settings.filename,
              delimiter: migrateDelimiter(southConnector.settings.delimiter),
              outputTimestampFormat: southConnector.settings.dateFormat,
              outputTimezone: southConnector.settings.timezone,
              compression: southConnector.settings.compression
            }
          }
        });
        break;
      case 'odbc':
        newItems.push({
          id: generateRandomId(6),
          name: southConnector.name,
          enabled: true,
          scanModeId: scanMode.id,
          settings: {
            query: southConnector.settings.query,
            dateTimeFields: [
              {
                fieldName: southConnector.settings.timeColumn,
                useAsReference: true,
                type: 'string',
                format: southConnector.settings.dateFormat,
                timezone: southConnector.settings.timezone,
                locale: 'en-US'
              }
            ],
            serialization: {
              type: 'csv',
              filename: southConnector.settings.filename,
              delimiter: migrateDelimiter(southConnector.settings.delimiter),
              outputTimestampFormat: southConnector.settings.dateFormat,
              outputTimezone: southConnector.settings.timezone,
              compression: southConnector.settings.compression
            }
          }
        });
        break;
      default:
        throw new Error(`SQL with driver ${southConnector.settings.driver} unknown in V3`);
    }
    return newItems;
  };

  createODBCItem = async (southConnector: SouthV2): Promise<Array<SouthConnectorItemEntity<SouthItemSettings>>> => {
    const newItems: Array<SouthConnectorItemEntity<SouthItemSettings>> = [];
    const scanMode = this.repositoryService.scanModeRepository.getByName(southConnector.scanMode);
    if (!scanMode) {
      this.logger.error(`Could not find scanMode ${southConnector.scanMode}`);
      return newItems;
    }

    newItems.push({
      id: generateRandomId(6),
      name: southConnector.name,
      enabled: true,
      scanModeId: scanMode.id,
      settings: {
        query: southConnector.settings.query,
        dateTimeFields: [
          {
            fieldName: southConnector.settings.timeColumn,
            useAsReference: true,
            type: 'string',
            format: southConnector.settings.datasourceTimestampFormat,
            timezone: southConnector.settings.datasourceTimezone,
            locale: 'en-US'
          }
        ],
        serialization: {
          type: 'csv',
          filename: southConnector.settings.filename,
          delimiter: migrateDelimiter(southConnector.settings.delimiter),
          outputTimestampFormat: southConnector.settings.outputTimestampFormat,
          outputTimezone: southConnector.settings.outputTimezone,
          compression: southConnector.settings.compression
        }
      }
    });
    return newItems;
  };

  createRestApiItem = async (southConnector: SouthV2): Promise<Array<SouthConnectorItemEntity<SouthItemSettings>>> => {
    const newItems: Array<SouthConnectorItemEntity<SouthItemSettings>> = [];
    const scanMode = this.repositoryService.scanModeRepository.getByName(southConnector.scanMode);
    if (!scanMode) {
      this.logger.error(`Could not find scanMode ${southConnector.scanMode}`);
      return newItems;
    }

    switch (southConnector.settings.payloadParser) {
      case 'SLIMS':
        newItems.push({
          id: generateRandomId(6),
          name: southConnector.name,
          enabled: true,
          scanModeId: scanMode.id,
          settings: {
            endpoint: southConnector.settings.endpoint,
            queryParams: southConnector.settings.queryParams
              ? southConnector.settings.queryParams.map((queryParam: { queryParamKey: string; queryParamValue: string }) => ({
                  key: queryParam.queryParamKey,
                  value: queryParam.queryParamValue
                }))
              : [],
            body: southConnector.settings.body,
            dateTimeFields: [
              {
                fieldName: southConnector.settings.timeColumn,
                useAsReference: true,
                type: 'string',
                format: southConnector.settings.dateFormat,
                timezone: southConnector.settings.timezone,
                locale: 'en-US'
              }
            ],
            serialization: {
              type: 'csv',
              filename: southConnector.settings.fileName,
              delimiter: migrateDelimiter(southConnector.settings.delimiter),
              outputTimestampFormat: southConnector.settings.dateFormat,
              outputTimezone: southConnector.settings.timezone,
              compression: southConnector.settings.compression
            }
          }
        });
        break;
      case 'OIAnalytics time values':
        newItems.push({
          id: generateRandomId(6),
          name: southConnector.name,
          enabled: true,
          scanModeId: scanMode.id,
          settings: {
            endpoint: southConnector.settings.endpoint,
            queryParams: southConnector.settings.queryParams
              ? southConnector.settings.queryParams.map((queryParam: { queryParamKey: string; queryParamValue: string }) => ({
                  key: queryParam.queryParamKey,
                  value: queryParam.queryParamValue
                }))
              : [],
            serialization: {
              type: 'csv',
              filename: southConnector.settings.fileName,
              delimiter: migrateDelimiter(southConnector.settings.delimiter),
              outputTimestampFormat: southConnector.settings.dateFormat,
              outputTimezone: southConnector.settings.timezone,
              compression: southConnector.settings.compression
            }
          }
        });
        break;
      default:
        throw new Error(`REST API with driver ${southConnector.settings.payloadParser} unknown in V3`);
    }
    return newItems;
  };
}
