import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { SouthV2 } from '../model/config.model';
import EncryptionService from '../service/encryption.service';
import { convertSouthType, migrateDelimiter, migrateItemSettings, migrateSouthSettings } from './utils';
import { SouthConnectorEntity, SouthConnectorItemEntity } from '../model/south-connector.model';
import { SouthItemSettings, SouthSettings } from '../model/south-settings.model';
import { generateRandomId } from '../service/utils';
import { ScanMode } from '../model/scan-mode.model';

export default class SouthMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger,
    private readonly encryptionService: EncryptionService
  ) {}

  private resolveScanMode(v2Name: string, scanModeMapping: Map<string, ScanMode>): ScanMode | null {
    return scanModeMapping.get(v2Name) ?? this.repositoryService.scanModeRepository.getByName(v2Name) ?? null;
  }

  async migrate(connectors: Array<SouthV2> = [], scanModeMapping = new Map<string, ScanMode>()): Promise<Map<string, string>> {
    this.logger.info(`Migrating ${connectors.length} South connectors`);
    const idMapping = new Map<string, string>();
    for (const connector of connectors) {
      this.logger.debug(`Migrating South "${connector.name}" of type ${connector.type}`);

      // SLIMS was removed in OIBus v3.6.0
      if (connector.type === 'RestApi' && connector.settings.payloadParser === 'SLIMS') {
        this.logger.warn(`Skipping South "${connector.name}": SLIMS south type was removed in OIBus v3.6.0`);
        continue;
      }

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
              items = await this.migratePoints(connector, scanModeMapping);
              break;
            case 'FolderScanner':
              items = await this.createFolderScannerItem(connector, scanModeMapping);
              break;
            case 'SQL':
              items = await this.createSQLItem(connector, scanModeMapping);
              break;
            case 'OdbcRemote':
              items = await this.createODBCItem(connector, scanModeMapping);
              break;
            case 'RestApi':
              items = await this.createRestApiItem(connector, scanModeMapping);
              break;
            default:
              this.logger.error(`South type ${connector.type} not recognized`);
          }
        } catch (error) {
          this.logger.error(`Error when migrating South item for connector "${JSON.stringify(connector.name)}": ${error}`);
        }

        // For historian connectors (v3.8.0+), throttling was moved from connector settings to items
        const historianTypes = ['OPCUA_HA', 'OPCUA_DA', 'OPCHDA', 'SQL', 'OdbcRemote', 'RestApi'];
        if (historianTypes.includes(connector.type)) {
          const maxReadInterval = connector.settings.maxReadInterval ?? 60;
          const readDelay = connector.settings.readIntervalDelay || 200;
          const overlap = connector.settings.overlap || 0;
          for (const item of items) {
            item.maxReadInterval = maxReadInterval;
            item.readDelay = readDelay;
            item.overlap = overlap;
          }
        }

        const seenNames = new Set<string>();
        const deduplicatedItems: typeof items = [];
        for (const item of items) {
          if (seenNames.has(item.name)) {
            this.logger.warn(`Skipping duplicate item name "${item.name}" for South connector "${connector.name}"`);
          } else {
            seenNames.add(item.name);
            deduplicatedItems.push(item);
          }
        }

        const newId = generateRandomId();
        idMapping.set(connector.id, newId);

        const command: SouthConnectorEntity<SouthSettings, SouthItemSettings> = {
          id: newId,
          name: connector.name,
          description: '',
          type: convertSouthType(connector.type, connector.settings),
          enabled: connector.enabled,
          settings: await migrateSouthSettings(connector, this.encryptionService, this.logger),
          items: deduplicatedItems
        };
        this.repositoryService.southConnectorRepository.saveSouthConnector(command);
      } catch (error) {
        this.logger.error(`Error when migrating South "${JSON.stringify(connector)}": ${error}`);
      }
    }
    return idMapping;
  }

  migratePoints = async (
    southConnector: SouthV2,
    scanModeMapping: Map<string, ScanMode>
  ): Promise<Array<SouthConnectorItemEntity<SouthItemSettings>>> => {
    const newItems: Array<SouthConnectorItemEntity<SouthItemSettings>> = [];
    const items = southConnector.points;
    this.logger.info(`Migrating ${items.length} items for South "${southConnector.name}" ($${southConnector.id})`);
    for (const item of items) {
      this.logger.trace(`Migrating South point "${item.pointId}"`);
      try {
        const scanMode = this.resolveScanMode(item.scanMode, scanModeMapping);
        if (!scanMode && item.scanMode !== 'listen') {
          this.logger.error(`Could not find scanMode ${item.scanMode}`);
          continue;
        }
        newItems.push({
          id: item.id || generateRandomId(),
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

  createFolderScannerItem = async (
    southConnector: SouthV2,
    scanModeMapping: Map<string, ScanMode>
  ): Promise<Array<SouthConnectorItemEntity<SouthItemSettings>>> => {
    const newItems: Array<SouthConnectorItemEntity<SouthItemSettings>> = [];
    const scanMode = this.resolveScanMode(southConnector.scanMode, scanModeMapping);
    if (!scanMode) {
      this.logger.error(`Could not find scanMode ${southConnector.scanMode}`);
      return newItems;
    }
    newItems.push({
      id: generateRandomId(),
      name: southConnector.name,
      enabled: true,
      scanModeId: scanMode.id,
      settings: {
        regex: southConnector.settings.regex,
        minAge: southConnector.settings.minAge,
        preserveFiles: southConnector.settings.preserveFiles,
        ignoreModifiedDate: southConnector.settings.ignoreModifiedDate,
        recursive: false,
        maxFiles: 0,
        maxSize: 0
      }
    });
    return newItems;
  };

  createSQLItem = async (
    southConnector: SouthV2,
    scanModeMapping: Map<string, ScanMode>
  ): Promise<Array<SouthConnectorItemEntity<SouthItemSettings>>> => {
    const newItems: Array<SouthConnectorItemEntity<SouthItemSettings>> = [];
    const scanMode = this.resolveScanMode(southConnector.scanMode, scanModeMapping);
    if (!scanMode) {
      this.logger.error(`Could not find scanMode ${southConnector.scanMode}`);
      return newItems;
    }

    switch (southConnector.settings.driver) {
      case 'mssql':
        newItems.push({
          id: generateRandomId(),
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
          id: generateRandomId(),
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
          id: generateRandomId(),
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
          id: generateRandomId(),
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
      case 'sqlite': {
        const isEvtDb = southConnector.settings.databasePath?.endsWith('evt.db');
        const sqliteTimezone = isEvtDb ? 'Europe/Paris' : (southConnector.settings.timezone ?? 'UTC');
        const sqliteDateTimeFields = isEvtDb
          ? [
              {
                fieldName: 'timestamp',
                useAsReference: true,
                type: 'string' as const,
                format: southConnector.settings.dateFormat,
                timezone: sqliteTimezone,
                locale: 'en-US'
              },
              {
                fieldName: 'end_date',
                useAsReference: false,
                type: 'string' as const,
                format: southConnector.settings.dateFormat,
                timezone: sqliteTimezone,
                locale: 'en-US'
              }
            ]
          : [
              {
                fieldName: southConnector.settings.timeColumn,
                useAsReference: true,
                type: 'string' as const,
                format: southConnector.settings.dateFormat,
                timezone: sqliteTimezone,
                locale: 'en-US'
              }
            ];
        let sqliteQuery = southConnector.settings.query;
        if (isEvtDb) {
          const stationMatch = (southConnector.settings.query as string)?.match(/(\S+)\s+AS\s+Station/i);
          const station = stationMatch ? stationMatch[1] : '1000';
          sqliteQuery = `SELECT
  ID AS id,
  Numero,
  Texte,
  Groupe,
  Status,
  strftime('%Y-%m-%d %H:%M:%f', REPLACE(SUBSTR(TimeStamp, 1, 19), '/', '-') || '.' || SUBSTR(TimeStamp, 21, 3)) AS timestamp,
  strftime('%Y-%m-%d %H:%M:%f', REPLACE(SUBSTR(TimeStamp, 1, 19), '/', '-') || '.' || SUBSTR(TimeStamp, 21, 3), '+1 second') AS end_date,
  ${station} AS Station
FROM TableEvt
WHERE TimeStamp IS NOT NULL
  AND strftime('%Y-%m-%d %H:%M:%f', REPLACE(SUBSTR(TimeStamp, 1, 19), '/', '-') || '.' || SUBSTR(TimeStamp, 21, 3)) > @StartTime
  AND strftime('%Y-%m-%d %H:%M:%f', REPLACE(SUBSTR(TimeStamp, 1, 19), '/', '-') || '.' || SUBSTR(TimeStamp, 21, 3)) <= @EndTime;`;
        }

        newItems.push({
          id: generateRandomId(),
          name: southConnector.name,
          enabled: true,
          scanModeId: scanMode.id,
          settings: {
            query: sqliteQuery,
            dateTimeFields: sqliteDateTimeFields,
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
      }
      case 'odbc':
        newItems.push({
          id: generateRandomId(),
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

  createODBCItem = async (
    southConnector: SouthV2,
    scanModeMapping: Map<string, ScanMode>
  ): Promise<Array<SouthConnectorItemEntity<SouthItemSettings>>> => {
    const newItems: Array<SouthConnectorItemEntity<SouthItemSettings>> = [];
    const scanMode = this.resolveScanMode(southConnector.scanMode, scanModeMapping);
    if (!scanMode) {
      this.logger.error(`Could not find scanMode ${southConnector.scanMode}`);
      return newItems;
    }

    newItems.push({
      id: generateRandomId(),
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

  createRestApiItem = async (
    southConnector: SouthV2,
    scanModeMapping: Map<string, ScanMode>
  ): Promise<Array<SouthConnectorItemEntity<SouthItemSettings>>> => {
    const newItems: Array<SouthConnectorItemEntity<SouthItemSettings>> = [];
    const scanMode = this.resolveScanMode(southConnector.scanMode, scanModeMapping);
    if (!scanMode) {
      this.logger.error(`Could not find scanMode ${southConnector.scanMode}`);
      return newItems;
    }

    switch (southConnector.settings.payloadParser) {
      case 'OIAnalytics time values':
        newItems.push({
          id: generateRandomId(),
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
        throw new Error(`REST API with payloadParser ${southConnector.settings.payloadParser} unknown in V3`);
    }
    return newItems;
  };
}
