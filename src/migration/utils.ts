import { LogLevel } from '../model/engine.model';
import { AuthenticationTypeV2, ItemV2, LogLevelV2, NorthV2, ProxyV2, SouthV2 } from '../model/config.model';
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
  SouthMSSQLSettings,
  SouthMySQLSettings,
  SouthODBCSettings,
  SouthOIAnalyticsSettings,
  SouthOPCHDAItemSettings,
  SouthOPCHDASettings,
  SouthOPCUADAItemSettings,
  SouthOPCUADASettings,
  SouthOPCUADASettingsAuthentication,
  SouthOPCUAHAItemSettings,
  SouthOPCUAHASettings,
  SouthOracleSettings,
  SouthPostgreSQLSettings,
  SouthSlimsSettings,
  SouthSQLiteSettings
} from '../model/south-settings.model';

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

export const intervalToCron = (interval: number, repository: ScanModeRepository): string => {
  const scanMode = repository.getByName('Every 10 seconds');
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
      logger.warn(`North type ${connector.type} not recognized`);
      return connector.settings;
  }
};

export const convertNorthType = (type: string): string => {
  switch (type) {
    case 'AmazonS3':
      return 'aws-s3';
    case 'Console':
      return 'console';
    case 'FileWriter':
      return 'file-writer';
    case 'OIAnalytics':
      return 'oianalytics';
    case 'OIConnect':
      return 'oiconnect';
    default:
      return type;
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
    case 'RestApi':
      return await migrateRestApi(connector, encryptionService);
    default:
      logger.warn(`South type ${connector.type} not recognized`);
      return connector.settings;
  }
};

export const convertSouthType = (type: string, settings: any): string => {
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
      return 'opcua-da';
    case 'OPCUA_HA':
      return 'opcua-ha';
    case 'RestApi':
      switch (settings.driver) {
        case 'SLIMS':
          return 'slims';
        case 'OIAnalytics time values':
          return 'oianalytics';
        default:
          return type;
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
          return type;
      }
    default:
      return type;
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
    structureFiltering: []
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
    qos: connector.settings.qos,
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

const migrateOPCUADA = async (connector: SouthV2, encryptionService: EncryptionService): Promise<SouthOPCUADASettings> => {
  return {
    url: connector.settings.url,
    keepSessionAlive: connector.settings.keepSessionAlive,
    retryInterval: connector.settings.retryInterval,
    securityMode: connector.settings.securityMode,
    securityPolicy: connector.settings.securityPolicy,
    readTimeout: connector.settings.readTimeout,
    authentication: await migrateOPCUAAuth(connector.settings, encryptionService)
  };
};

const migrateOPCUAHA = async (connector: SouthV2, encryptionService: EncryptionService): Promise<SouthOPCUAHASettings> => {
  return {
    url: connector.settings.url,
    keepSessionAlive: connector.settings.keepSessionAlive,
    retryInterval: connector.settings.retryInterval,
    securityMode: connector.settings.securityMode,
    securityPolicy: connector.settings.securityPolicy,
    readTimeout: connector.settings.readTimeout,
    authentication: await migrateOPCUAAuth(connector.settings, encryptionService)
  };
};

const migrateOPCUAAuth = async (settings: any, encryptionService: EncryptionService): Promise<SouthOPCUADASettingsAuthentication> => {
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
        encryption: connector.settings.encryption,
        trustServerCertificate: connector.settings.selfSigned,
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
        driverPath: connector.settings.odbcDriverPath,
        host: connector.settings.host,
        port: connector.settings.port,
        database: connector.settings.database,
        username: connector.settings.username,
        password: connector.settings.password ? await encryptionService.convertCiphering(connector.settings.password) : '',
        connectionTimeout: connector.settings.connectionTimeout,
        trustServerCertificate: connector.settings.selfSigned
      };
    default:
      return {};
  }
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
        acceptUnauthorized: connector.settings.acceptUnauthorized,
        timeout: connector.settings.connectionTimeout,
        ...(await migrateProxy(undefined, encryptionService))
      };
    case 'SLIMS':
      return {
        url: `${connector.settings.protocol}://${connector.settings.host}`,
        port: connector.settings.port,
        username: connector.settings.authentication.key,
        password: await encryptionService.convertCiphering(connector.settings.authentication.secret),
        acceptUnauthorized: connector.settings.acceptUnauthorized,
        timeout: connector.settings.connectionTimeout,
        ...(await migrateProxy(undefined, encryptionService))
      };
    default:
      return {};
  }
};

export const migrateItemSettings = (connector: SouthV2, item: ItemV2, logger: pino.Logger) => {
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
      logger.warn(`South type ${connector.type} does not support points`);
      return connector.settings;
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

const migrateOPCUADAItem = (connector: SouthV2, item: ItemV2): SouthOPCUADAItemSettings => {
  return {
    nodeId: item.nodeId
  };
};

const migrateOPCUAHAItem = (connector: SouthV2, item: ItemV2): SouthOPCUAHAItemSettings => {
  const scanGroup = connector.settings.scanGroups.find((group: any) => group.scanMode === item.scanMode);
  return {
    aggregate: scanGroup?.aggregate || 'Raw',
    resampling: scanGroup?.resampling || 'None',
    nodeId: item.nodeId
  };
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
