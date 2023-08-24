import { LogLevel } from '../model/engine.model';
import { AuthenticationTypeV2, ItemV2, LogLevelV2, NorthTypeV2, NorthV2, ProxyV2, SouthTypeV2, SouthV2 } from '../model/config.model';
import ScanModeRepository from '../repository/scan-mode.repository';
import EncryptionService from '../service/encryption.service';
import pino from 'pino';
import {
  NorthAmazonS3Settings,
  NorthAzureBlobSettings,
  NorthConsoleSettings,
  NorthFileWriterSettings,
  NorthOIAnalyticsSettings,
  NorthOIConnectSettings
} from '../model/north-settings.model';
import {
  SouthADSItemSettings,
  SouthADSSettings,
  SouthFolderScannerSettings,
  SouthModbusItemSettings,
  SouthModbusItemSettingsDataType,
  SouthModbusItemSettingsModbusType,
  SouthModbusSettings,
  SouthMQTTItemSettings,
  SouthMQTTSettings,
  SouthMQTTSettingsQos,
  SouthMSSQLSettings,
  SouthMySQLSettings,
  SouthODBCSettings,
  SouthOIAnalyticsSettings,
  SouthOPCHDAItemSettings,
  SouthOPCHDASettings,
  SouthOPCUAItemSettings,
  SouthOPCUAItemSettingsHaModeAggregate,
  SouthOPCUAItemSettingsHaModeResampling,
  SouthOPCUASettings,
  SouthOPCUASettingsAuthentication,
  SouthOracleSettings,
  SouthPostgreSQLSettings,
  SouthSlimsSettings,
  SouthSQLiteSettings
} from '../model/south-settings.model';
import { CsvCharacter } from '../model/types';

export const convertLogLevel = (logLevel: LogLevelV2): LogLevel => {
  switch (logLevel) {
    case 'trace':
    case 'debug':
    case 'info':
    case 'warning':
    case 'error':
      return logLevel;
    case 'none':
    default:
      return 'silent';
  }
};

export const convertAuthentication = (authType: AuthenticationTypeV2, key: string, encryptedSecret: string): any => {
  switch (authType) {
    case 'Basic':
      return { type: 'basic', username: key, password: encryptedSecret };
    case 'Bearer':
      return { type: 'bearer', token: encryptedSecret };
    case 'Api Key':
      return { type: 'api-key', key: key, secret: encryptedSecret };
    case 'None':
    default:
      return { type: 'none' };
  }
};

export const convertCronTime = (cronTime: string): string => {
  const cronParts = cronTime.trim().split(' ').reverse();

  // Add "every" if some fields are missing from the cron
  for (let i = cronParts.length; i < 6; i++) {
    cronParts.push('*');
  }

  // Reverse ms field of non-standard cron
  while (cronParts.length > 6) {
    cronParts.shift();
  }

  let standardCron = '';
  cronParts.forEach((cronPart, index) => {
    if (cronPart.startsWith('/')) {
      // add a * in front of a div in cron, example : * * * * * /10
      standardCron += `*${cronPart}`;
    } else {
      standardCron += cronPart;
    }
    if (index !== cronParts.length) {
      standardCron += ' ';
    }
  });

  return standardCron;
};

export const intervalToCron = (interval: number, repository: ScanModeRepository, logger: pino.Logger): string => {
  const scanMode = repository.getByName('Every 10 seconds');
  logger.warn(`North send interval ${interval} replaced with scan mode ${JSON.stringify(scanMode)}`);
  if (scanMode) {
    return scanMode.id;
  } else {
    throw `Could not find scan mode associated to interval ${interval}`;
  }
};

export const migrateNorthSettings = async (
  connector: NorthV2,
  encryptionService: EncryptionService,
  logger: pino.Logger,
  proxies: Array<ProxyV2>
) => {
  logger.trace(`Migrating North settings ${JSON.stringify(connector.settings)}`);

  switch (connector.type) {
    case 'Console':
      return migrateConsole(connector);
    case 'OIAnalytics':
      return await migrateOIAnalytics(connector, encryptionService, proxies);
    case 'OIConnect':
      return await migrateOIConnect(connector, encryptionService, proxies);
    case 'AmazonS3':
      return await migrateAmazonS3(connector, encryptionService, proxies);
    case 'AzureBlob':
      return await migrateAzureBlob(connector, encryptionService);
    case 'FileWriter':
      return migrateFileWriter(connector);
    default:
      throw new Error(`North connector type ${connector.type} unknown in V3`);
  }
};

export const convertNorthType = (type: NorthTypeV2): string => {
  switch (type) {
    case 'AmazonS3':
      return 'aws-s3';
    case 'AzureBlob':
      return 'azure-blob';
    case 'Console':
      return 'console';
    case 'FileWriter':
      return 'file-writer';
    case 'OIAnalytics':
      return 'oianalytics';
    case 'OIConnect':
      return 'oiconnect';
    default:
      throw new Error(`North connector type ${type} unknown in V3`);
  }
};

const migrateFileWriter = (connector: NorthV2): NorthFileWriterSettings => {
  return {
    outputFolder: connector.settings.outputFolder,
    prefix: connector.settings.prefixFileName,
    suffix: connector.settings.suffixFileName
  };
};

const migrateOIAnalytics = async (
  connector: NorthV2,
  encryptionService: EncryptionService,
  proxies: Array<ProxyV2>
): Promise<NorthOIAnalyticsSettings> => {
  const proxyV2 = connector.settings.proxy ? proxies.find(proxy => proxy.name === connector.settings.proxy) : undefined;
  return {
    host: connector.settings.host,
    accessKey: connector.settings.authentication.key,
    secretKey: await encryptionService.convertCiphering(connector.settings.authentication.secret),
    acceptUnauthorized: connector.settings.acceptUnauthorized,
    timeout: connector.caching.timeout,
    ...(await migrateProxy(proxyV2, encryptionService))
  };
};

const migrateAmazonS3 = async (
  connector: NorthV2,
  encryptionService: EncryptionService,
  proxies: Array<ProxyV2>
): Promise<NorthAmazonS3Settings> => {
  const proxyV2 = connector.settings.proxy ? proxies.find(proxy => proxy.name === connector.settings.proxy) : undefined;
  return {
    bucket: connector.settings.bucket,
    folder: connector.settings.folder,
    region: connector.settings.region,
    accessKey: connector.settings.authentication.key,
    secretKey: await encryptionService.convertCiphering(connector.settings.authentication.secret),
    ...(await migrateProxy(proxyV2, encryptionService))
  };
};

const migrateAzureBlob = async (connector: NorthV2, encryptionService: EncryptionService): Promise<NorthAzureBlobSettings> => {
  return {
    account: connector.settings.account,
    container: connector.settings.container,
    path: connector.settings.path,
    authentication: connector.settings.authentication,
    sasToken: connector.settings.sasToken ? await encryptionService.convertCiphering(connector.settings.sasToken) : null,
    accessKey: connector.settings.accessKey ? await encryptionService.convertCiphering(connector.settings.accessKey) : null,
    tenantId: connector.settings.tenantId,
    clientId: connector.settings.clientId,
    clientSecret: connector.settings.clientSecret ? await encryptionService.convertCiphering(connector.settings.clientSecret) : null
  };
};

const migrateOIConnect = async (
  connector: NorthV2,
  encryptionService: EncryptionService,
  proxies: Array<ProxyV2>
): Promise<NorthOIConnectSettings> => {
  const proxyV2 = connector.settings.proxy ? proxies.find(proxy => proxy.name === connector.settings.proxy) : undefined;
  return {
    host: connector.settings.host,
    username: connector.settings.authentication.key,
    password: await encryptionService.convertCiphering(connector.settings.authentication.secret),
    acceptUnauthorized: connector.settings.acceptUnauthorized,
    timeout: connector.caching.timeout,
    ...(await migrateProxy(proxyV2, encryptionService))
  };
};

const migrateConsole = (connector: NorthV2): NorthConsoleSettings => {
  return {
    verbose: connector.settings.verbose
  };
};

export const migrateSouthSettings = async (connector: SouthV2, encryptionService: EncryptionService, logger: pino.Logger) => {
  logger.trace(`Migrating South settings ${JSON.stringify(connector.settings)}`);

  switch (connector.type) {
    case 'ADS':
      return migrateAds(connector);
    case 'FolderScanner':
      return migrateFolderScanner(connector);
    case 'Modbus':
      return migrateModbus(connector);
    case 'MQTT':
      return await migrateSouthMQTT(connector, encryptionService);
    case 'OPCUA_HA':
      return await migrateOPCUAHA(connector, encryptionService);
    case 'OPCUA_DA':
      return await migrateOPCUADA(connector, encryptionService);
    case 'OPCHDA':
      return migrateOPCHDA(connector);
    case 'SQL':
      return await migrateSQL(connector, encryptionService);
    case 'ODBC (remote)':
      return await migrateRemoteODBCSQL(connector);
    case 'RestApi':
      return await migrateRestApi(connector, encryptionService);
    default:
      throw new Error(`South connector type ${connector.type} unknown in V3`);
  }
};

export const convertSouthType = (type: SouthTypeV2, settings: any): string => {
  switch (type) {
    case 'ADS':
      return 'ads';
    case 'FolderScanner':
      return 'folder-scanner';
    case 'Modbus':
      return 'modbus';
    case 'MQTT':
      return 'mqtt';
    case 'OPCHDA':
      return 'opc-hda';
    case 'OPCUA_DA':
      return 'opcua';
    case 'OPCUA_HA':
      return 'opcua';
    case 'RestApi':
      switch (settings.payloadParser) {
        case 'SLIMS':
          return 'slims';
        case 'OIAnalytics time values':
          return 'oianalytics';
        default:
          throw new Error(`REST API with driver ${settings.payloadParser} unknown in V3`);
      }
    case 'SQL':
      switch (settings.driver) {
        case 'mssql':
          return 'mssql';
        case 'mysql':
          return 'mysql';
        case 'odbc':
          return 'odbc';
        case 'oracle':
          return 'oracle';
        case 'postgresql':
          return 'postgresql';
        case 'sqlite':
          return 'sqlite';
        default:
          throw new Error(`SQL with driver ${settings.driver} unknown in V3`);
      }
    case 'ODBC (remote)':
      return 'odbc';
    default:
      throw new Error(`South connector type ${type} unknown in V3`);
  }
};

const migrateAds = (connector: SouthV2): SouthADSSettings => {
  return {
    netId: connector.settings.netId,
    port: connector.settings.port,
    routerAddress: connector.settings.routerAddress,
    routerTcpPort: connector.settings.routerTcpPort,
    clientAmsNetId: connector.settings.clientAmsNetId,
    clientAdsPort: connector.settings.clientAdsPort,
    retryInterval: connector.settings.retryInterval,
    plcName: connector.settings.plcName,
    enumAsText: connector.settings.enumAsText,
    boolAsText: connector.settings.boolAsText,
    structureFiltering: connector.settings.structureFiltering ?? []
  };
};

const migrateFolderScanner = (connector: SouthV2): SouthFolderScannerSettings => {
  return {
    inputFolder: connector.settings.inputFolder,
    minAge: connector.settings.minAge,
    preserveFiles: connector.settings.preserveFiles,
    ignoreModifiedDate: connector.settings.ignoreModifiedDate,
    compression: connector.settings.compression
  };
};

const migrateModbus = (connector: SouthV2): SouthModbusSettings => {
  return {
    host: connector.settings.host,
    port: connector.settings.port,
    slaveId: connector.settings.slaveId,
    retryInterval: connector.settings.retryInterval,
    addressOffset: connector.settings.addressOffset,
    endianness: connector.settings.endianness,
    swapBytesInWords: connector.settings.swapBytesInWords,
    swapWordsInDWords: connector.settings.swapWordsInDWords
  };
};

const migrateSouthMQTT = async (connector: SouthV2, encryptionService: EncryptionService): Promise<SouthMQTTSettings> => {
  return {
    url: connector.settings.url,
    qos: `${connector.settings.qos}` as SouthMQTTSettingsQos,
    persistent: connector.settings.persistent,
    rejectUnauthorized: connector.settings.rejectUnauthorized,
    reconnectPeriod: connector.settings.reconnectPeriod,
    connectTimeout: connector.settings.connectTimeout,
    authentication: await migrateMQTTAuth(connector.settings, encryptionService)
  };
};

const migrateMQTTAuth = async (settings: any, encryptionService: EncryptionService): Promise<any> => {
  if (settings.certFile && settings.keyFile) {
    return { type: 'cert', certFilePath: settings.certFile, keyFilePath: settings.keyFile, caFilePath: settings.caFile };
  }
  if (settings.username && settings.password) {
    return { type: 'basic', username: settings.username, password: await encryptionService.convertCiphering(settings.password) };
  }
  return { type: 'none' };
};

const migrateOPCHDA = (connector: SouthV2): SouthOPCHDASettings => {
  return {
    agentFilename: connector.settings.agentFilename,
    tcpPort: connector.settings.tcpPort,
    logLevel: connector.settings.logLevel,
    host: connector.settings.host,
    serverName: connector.settings.serverName,
    retryInterval: connector.settings.retryInterval,
    readTimeout: connector.settings.readTimeout,
    maxReturnValues: connector.settings.maxReturnValues
  };
};

const migrateOPCUADA = async (connector: SouthV2, encryptionService: EncryptionService): Promise<SouthOPCUASettings> => {
  return {
    url: connector.settings.url,
    keepSessionAlive: connector.settings.keepSessionAlive,
    retryInterval: connector.settings.retryInterval,
    securityMode: connector.settings.securityMode,
    securityPolicy: connector.settings.securityPolicy,
    authentication: await migrateOPCUAAuth(connector.settings, encryptionService)
  };
};

const migrateOPCUAHA = async (connector: SouthV2, encryptionService: EncryptionService): Promise<SouthOPCUASettings> => {
  return {
    url: connector.settings.url,
    keepSessionAlive: connector.settings.keepSessionAlive,
    retryInterval: connector.settings.retryInterval,
    securityMode: connector.settings.securityMode,
    securityPolicy: connector.settings.securityPolicy,
    authentication: await migrateOPCUAAuth(connector.settings, encryptionService)
  };
};

const migrateOPCUAAuth = async (settings: any, encryptionService: EncryptionService): Promise<SouthOPCUASettingsAuthentication> => {
  if (settings.keyFile && settings.cert) {
    return { type: 'cert', certFilePath: settings.cert, keyFilePath: settings.keyFile };
  }
  if (settings.username && settings.password) {
    return { type: 'basic', username: settings.username, password: await encryptionService.convertCiphering(settings.password) };
  }
  return { type: 'none' };
};

const migrateSQL = async (
  connector: SouthV2,
  encryptionService: EncryptionService
): Promise<
  | SouthMSSQLSettings
  | SouthMySQLSettings
  | SouthPostgreSQLSettings
  | SouthOracleSettings
  | SouthSQLiteSettings
  | SouthODBCSettings
  | Record<string, never>
> => {
  switch (connector.settings.driver) {
    case 'mssql':
      return {
        host: connector.settings.host,
        port: connector.settings.port,
        database: connector.settings.database,
        username: connector.settings.username,
        password: connector.settings.password ? await encryptionService.convertCiphering(connector.settings.password) : '',
        domain: connector.settings.domain,
        encryption: connector.settings.encryption || false,
        trustServerCertificate: connector.settings.selfSigned || false,
        connectionTimeout: connector.settings.connectionTimeout,
        requestTimeout: connector.settings.requestTimeout
      };
    case 'mysql':
      return {
        host: connector.settings.host,
        port: connector.settings.port,
        database: connector.settings.database,
        username: connector.settings.username,
        password: connector.settings.password ? await encryptionService.convertCiphering(connector.settings.password) : '',
        connectionTimeout: connector.settings.connectionTimeout,
        requestTimeout: connector.settings.requestTimeout
      };
    case 'postgresql':
      return {
        host: connector.settings.host,
        port: connector.settings.port,
        database: connector.settings.database,
        username: connector.settings.username,
        password: connector.settings.password ? await encryptionService.convertCiphering(connector.settings.password) : '',
        connectionTimeout: connector.settings.connectionTimeout,
        requestTimeout: connector.settings.requestTimeout
      };
    case 'oracle':
      return {
        host: connector.settings.host,
        port: connector.settings.port,
        database: connector.settings.database,
        username: connector.settings.username,
        password: connector.settings.password ? await encryptionService.convertCiphering(connector.settings.password) : '',
        connectionTimeout: connector.settings.connectionTimeout,
        requestTimeout: connector.settings.requestTimeout
      };
    case 'sqlite':
      return {
        databasePath: connector.settings.databasePath
      };
    case 'odbc':
      return {
        remoteAgent: false,
        connectionString: `Driver=${connector.settings.odbcDriverPath};SERVER=${connector.settings.host},${
          connector.settings.port
        };TrustServerCertificate=${connector.settings.selfSigned ? 'yes' : 'no'};Database=${connector.settings.database};UID=${
          connector.settings.username
        }`,
        password: connector.settings.password ? await encryptionService.convertCiphering(connector.settings.password) : '',
        connectionTimeout: connector.settings.connectionTimeout,
        requestTimeout: connector.settings.requestTimeout
      };
    default:
      throw new Error(`SQL with driver ${connector.settings.driver} unknown in V3`);
  }
};

const migrateRemoteODBCSQL = async (connector: SouthV2): Promise<SouthODBCSettings> => {
  return {
    remoteAgent: true,
    agentUrl: connector.settings.agentUrl,
    connectionString: connector.settings.connectionString,
    password: '',
    connectionTimeout: connector.settings.connectionTimeout,
    requestTimeout: connector.settings.requestTimeout
  };
};

const migrateRestApi = async (
  connector: SouthV2,
  encryptionService: EncryptionService
): Promise<SouthOIAnalyticsSettings | SouthSlimsSettings | Record<string, never>> => {
  switch (connector.settings.payloadParser) {
    case 'OIAnalytics time values':
      return {
        host: `${connector.settings.protocol}://${connector.settings.host}:${connector.settings.port}`,
        accessKey: connector.settings.authentication.key,
        secretKey: await encryptionService.convertCiphering(connector.settings.authentication.secret),
        acceptUnauthorized: connector.settings.acceptSelfSigned,
        ...(await migrateProxy(undefined, encryptionService))
      };
    case 'SLIMS':
      return {
        url: `${connector.settings.protocol}://${connector.settings.host}`,
        port: connector.settings.port,
        username: connector.settings.authentication.key,
        password: await encryptionService.convertCiphering(connector.settings.authentication.secret),
        acceptUnauthorized: connector.settings.acceptSelfSigned,
        timeout: connector.settings.connectionTimeout,
        ...(await migrateProxy(undefined, encryptionService))
      };
    default:
      throw new Error(`REST API with driver ${connector.settings.driver} unknown in V3`);
  }
};

export const migrateItemSettings = (connector: SouthV2, item: ItemV2) => {
  switch (connector.type) {
    case 'ADS':
      return migrateAdsItem(connector, item);
    case 'Modbus':
      return migrateModbusItem(connector, item);
    case 'MQTT':
      return migrateSouthMQTTItem(connector, item);
    case 'OPCUA_HA':
      return migrateOPCUAHAItem(connector, item);
    case 'OPCUA_DA':
      return migrateOPCUADAItem(connector, item);
    case 'OPCHDA':
      return migrateOPCHDAItem(connector, item);
    default:
      throw new Error(`No point migration available for connector of type ${connector.type}`);
  }
};

const migrateAdsItem = (connector: SouthV2, item: ItemV2): SouthADSItemSettings => {
  return {
    address: item.pointId
  };
};

const migrateSouthMQTTItem = (connector: SouthV2, item: ItemV2): SouthMQTTItemSettings => {
  return {
    topic: item.topic,
    valueType: 'json',
    jsonPayload: {
      useArray: !!connector.settings.dataArrayPath,
      dataArrayPath: connector.settings.dataArrayPath,
      valuePath: connector.settings.valuePath,
      timestampOrigin: connector.settings.timestampOrigin,
      timestampPayload: {
        timestampPath: connector.settings.timestampPath,
        timestampType: 'string',
        timestampFormat: connector.settings.timestampFormat,
        timezone: connector.settings.timestampTimezone
      },
      otherFields: []
    }
  };
};

const migrateOPCUADAItem = (connector: SouthV2, item: ItemV2): SouthOPCUAItemSettings => {
  return {
    nodeId: item.nodeId,
    mode: 'DA'
  };
};

const migrateOPCUAHAItem = (connector: SouthV2, item: ItemV2): SouthOPCUAItemSettings => {
  const scanGroup = connector.settings.scanGroups.find((group: any) => group.scanMode === item.scanMode);
  return {
    nodeId: item.nodeId,
    mode: 'HA',
    haMode: {
      aggregate: convertOPCUAAggregate(scanGroup?.aggregate),
      resampling: convertOPCUAResampling(scanGroup?.resampling)
    }
  };
};

const convertOPCUAAggregate = (aggregate: string | undefined): SouthOPCUAItemSettingsHaModeAggregate => {
  switch (aggregate) {
    case 'Average':
      return 'average';
    case 'Minimum':
      return 'minimum';
    case 'Maximum':
      return 'maximum';
    case 'Count':
      return 'count';
    case 'Raw':
    default:
      return 'raw';
  }
};

const convertOPCUAResampling = (aggregate: string | undefined): SouthOPCUAItemSettingsHaModeResampling => {
  switch (aggregate) {
    case 'Second':
      return 'second';
    case '10 Seconds':
      return '10Seconds';
    case '30 Seconds':
      return '30Seconds';
    case 'Minute':
      return 'minute';
    case 'Hour':
      return 'hour';
    case 'Day':
      return 'day';
    case 'None':
    default:
      return 'none';
  }
};

const migrateOPCHDAItem = (connector: SouthV2, item: ItemV2): SouthOPCHDAItemSettings => {
  const scanGroup = connector.settings.scanGroups.find((group: any) => group.scanMode === item.scanMode);
  return {
    aggregate: scanGroup?.aggregate || 'Raw',
    resampling: scanGroup?.resampling || 'None',
    nodeId: item.nodeId
  };
};

const migrateModbusItem = (connector: SouthV2, item: ItemV2): SouthModbusItemSettings => {
  return {
    address: item.address,
    modbusType: item.modbusType as SouthModbusItemSettingsModbusType,
    dataType: item.dataType as SouthModbusItemSettingsDataType,
    multiplierCoefficient: parseInt(item.multiplierCoefficient)
  };
};

const migrateProxy = async (proxy: ProxyV2 | undefined, encryptionService: EncryptionService) => {
  if (!proxy) {
    return {
      useProxy: false,
      proxyUrl: '',
      proxyUsername: '',
      proxyPassword: ''
    };
  }
  return {
    useProxy: true,
    proxyUrl: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
    proxyUsername: proxy.username,
    proxyPassword: await encryptionService.convertCiphering(proxy.password)
  };
};

export const migrateDelimiter = (character: string): CsvCharacter => {
  switch (character) {
    case '.':
      return 'DOT';
    case ';':
      return 'SEMI_COLON';
    case ':':
      return 'COLON';
    case '/':
      return 'SLASH';
    case '|':
      return 'PIPE';
    case ',':
    default:
      return 'COMMA';
  }
};
