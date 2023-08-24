import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { SouthV2 } from '../model/config.model';
import { migrateDelimiter, migrateItemSettings } from './utils';
import { SouthConnectorItemCommandDTO } from '../model/south-connector.model';
import {
  SouthFolderScannerItemSettings,
  SouthMSSQLItemSettings,
  SouthMySQLItemSettings,
  SouthOIAnalyticsItemSettings,
  SouthOracleItemSettings,
  SouthPostgreSQLItemSettings,
  SouthSlimsItemSettings,
  SouthSQLiteItemSettings
} from '../model/south-settings.model';

export default class SouthItemsMigration {
  constructor(private readonly repositoryService: RepositoryService, private readonly logger: pino.Logger) {}

  async migrate(southConnector: SouthV2): Promise<void> {
    try {
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
        case 'OdbcRemote':
          return await this.createODBCItem(southConnector);
        case 'RestApi':
          return await this.createRestApiItem(southConnector);
        default:
          this.logger.error(`South type ${southConnector.type} not recognized`);
          return;
      }
    } catch (error) {
      this.logger.error(`Error when migrating South item for connector "${JSON.stringify(southConnector.name)}": ${error}`);
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
        const command: SouthConnectorItemCommandDTO = {
          name: item.pointId,
          scanModeId: scanMode?.id || 'subscription',
          settings: migrateItemSettings(southConnector, item)
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
    const command: SouthConnectorItemCommandDTO<SouthFolderScannerItemSettings> = {
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

    switch (southConnector.settings.driver) {
      case 'mssql':
        const mssqlCommand: SouthConnectorItemCommandDTO<SouthMSSQLItemSettings> = {
          name: southConnector.name,
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
        };
        this.repositoryService.southItemRepository.createSouthItem(southConnector.id, mssqlCommand);
        break;
      case 'mysql':
        const mysqlItemCommand: SouthConnectorItemCommandDTO<SouthMySQLItemSettings> = {
          name: southConnector.name,
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
        };
        this.repositoryService.southItemRepository.createSouthItem(southConnector.id, mysqlItemCommand);
        break;
      case 'postgresql':
        const postgresqlCommand: SouthConnectorItemCommandDTO<SouthPostgreSQLItemSettings> = {
          name: southConnector.name,
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
        };
        this.repositoryService.southItemRepository.createSouthItem(southConnector.id, postgresqlCommand);
        break;
      case 'oracle':
        const oracleCommand: SouthConnectorItemCommandDTO<SouthOracleItemSettings> = {
          name: southConnector.name,
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
        };
        this.repositoryService.southItemRepository.createSouthItem(southConnector.id, oracleCommand);
        break;
      case 'sqlite':
        const sqliteCommand: SouthConnectorItemCommandDTO<SouthSQLiteItemSettings> = {
          name: southConnector.name,
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
        };
        this.repositoryService.southItemRepository.createSouthItem(southConnector.id, sqliteCommand);
        break;
      case 'odbc':
        const odbcCommand: SouthConnectorItemCommandDTO<SouthSQLiteItemSettings> = {
          name: southConnector.name,
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
        };
        this.repositoryService.southItemRepository.createSouthItem(southConnector.id, odbcCommand);
        break;
      default:
        throw new Error(`SQL with driver ${southConnector.settings.driver} unknown in V3`);
    }
  };

  createODBCItem = async (southConnector: SouthV2) => {
    const scanMode = this.repositoryService.scanModeRepository.getByName(southConnector.scanMode);
    if (!scanMode) {
      this.logger.error(`Could not find scanMode ${southConnector.scanMode}`);
      return;
    }
    const odbcCommand: SouthConnectorItemCommandDTO<SouthSQLiteItemSettings> = {
      name: southConnector.name,
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
    };
    this.repositoryService.southItemRepository.createSouthItem(southConnector.id, odbcCommand);
  };

  createRestApiItem = async (southConnector: SouthV2) => {
    const scanMode = this.repositoryService.scanModeRepository.getByName(southConnector.scanMode);
    if (!scanMode) {
      this.logger.error(`Could not find scanMode ${southConnector.scanMode}`);
      return;
    }
    switch (southConnector.settings.payloadParser) {
      case 'SLIMS':
        const slimsCommand: SouthConnectorItemCommandDTO<SouthSlimsItemSettings> = {
          name: southConnector.name,
          scanModeId: scanMode.id,
          settings: {
            endpoint: southConnector.settings.endpoint,
            requestTimeout: southConnector.settings.requestTimeout,
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
        };
        this.repositoryService.southItemRepository.createSouthItem(southConnector.id, slimsCommand);
        break;
      case 'OIAnalytics time values':
        const oiaCommand: SouthConnectorItemCommandDTO<SouthOIAnalyticsItemSettings> = {
          name: southConnector.name,
          scanModeId: scanMode.id,
          settings: {
            endpoint: southConnector.settings.endpoint,
            requestTimeout: southConnector.settings.requestTimeout,
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
        };
        this.repositoryService.southItemRepository.createSouthItem(southConnector.id, oiaCommand);
        break;
      default:
        throw new Error(`REST API with driver ${southConnector.settings.payloadParser} unknown in V3`);
    }
  };
}
