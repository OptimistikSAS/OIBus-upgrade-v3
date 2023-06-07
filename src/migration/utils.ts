import { Authentication, LogLevel } from '../model/engine.model';
import { AuthenticationTypeV2, ItemV2, LogLevelV2, NorthV2, SouthV2 } from '../model/config.model';
import ScanModeRepository from '../repository/scan-mode.repository';
import ProxyRepository from '../repository/proxy.repository';
import EncryptionService from '../service/encryption.service';
import pino from 'pino';

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

export const convertAuthentication = (authType: AuthenticationTypeV2, key: string, encryptedSecret: string): Authentication => {
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
  repository: ProxyRepository,
  encryptionService: EncryptionService,
  logger: pino.Logger
) => {
  logger.trace(`Migrating North settings ${JSON.stringify(connector.settings)}`);

  switch (connector.type) {
    case 'Console':
      return migrateConsole(connector);
    case 'OIAnalytics':
      return await migrateOIAnalytics(connector, repository, encryptionService);
    case 'OIConnect':
      return await migrateOIConnect(connector, repository, encryptionService);
    case 'AmazonS3':
      return await migrateAmazonS3(connector, repository, encryptionService);
    case 'FileWriter':
      return migrateFileWriter(connector);
    default:
      logger.warn(`North type ${connector.type} not recognized`);
      return connector.settings;
  }
};

export const migrateSouthSettings = async (
  connector: SouthV2,
  repository: ProxyRepository,
  encryptionService: EncryptionService,
  logger: pino.Logger
) => {
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
      return 'oiconnect';
    case 'SQL':
      switch (settings.driver) {
        case 'ip21':
          return 'ip21';
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

const migrateFileWriter = (connector: NorthV2) => {
  return {
    outputFolder: connector.settings.outputFolder,
    prefix: connector.settings.prefixFileName,
    suffix: connector.settings.suffixFileName
  };
};

const migrateOIAnalytics = async (connector: NorthV2, repository: ProxyRepository, encryptionService: EncryptionService) => {
  return {
    host: connector.settings.host,
    authentication: await migrateRestAuth(connector.settings.authentication, encryptionService),
    acceptUnauthorized: connector.settings.acceptUnauthorized,
    timeout: connector.caching.timeout,
    proxy: connector.settings.proxy ? repository.getByName(connector.settings.proxy)?.id : null
  };
};

const migrateAmazonS3 = async (connector: NorthV2, repository: ProxyRepository, encryptionService: EncryptionService) => {
  return {
    bucket: connector.settings.bucket,
    folder: connector.settings.folder,
    region: connector.settings.region,
    authentication: await migrateRestAuth({ ...connector.settings.authentication, type: 'api-key' }, encryptionService),
    proxy: connector.settings.proxy ? repository.getByName(connector.settings.proxy)?.id : null
  };
};

const migrateOIConnect = async (connector: NorthV2, repository: ProxyRepository, encryptionService: EncryptionService) => {
  return {
    host: connector.settings.host,
    valuesEndpoint: connector.settings.valuesEndpoint,
    fileEndpoint: connector.settings.fileEndpoint,
    authentication: await migrateRestAuth(connector.settings.authentication, encryptionService),
    acceptUnauthorized: connector.settings.acceptUnauthorized,
    timeout: connector.caching.timeout,
    proxy: connector.settings.proxy ? repository.getByName(connector.settings.proxy)?.id : null
  };
};

const migrateConsole = (connector: NorthV2) => {
  return {
    verbose: connector.settings.verbose
  };
};

const migrateAds = (connector: SouthV2) => {
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
    boolAsText: connector.settings.boolAsText
  };
};

const migrateSouthMQTT = async (connector: SouthV2, encryptionService: EncryptionService) => {
  return {
    url: connector.settings.url,
    qos: connector.settings.qos,
    persistent: connector.settings.persistent,
    rejectUnauthorized: connector.settings.rejectUnauthorized,
    reconnectPeriod: connector.settings.reconnectPeriod,
    connectTimeout: connector.settings.connectTimeout,
    caPath: connector.settings.caFile,
    dataArrayPath: connector.settings.dataArrayPath,
    valuePath: connector.settings.valuePath,
    pointIdPath: connector.settings.pointIdPath,
    qualityPath: connector.settings.qualityPath,
    timestampOrigin: connector.settings.timestampOrigin,
    timestampPath: connector.settings.timestampPath,
    timestampFormat: connector.settings.timestampFormat,
    timestampTimezone: connector.settings.timestampTimezone,
    authentication: await migrateMQTTAuth(connector.settings, encryptionService)
  };
};

const migrateFolderScanner = (connector: SouthV2) => {
  return {
    inputFolder: connector.settings.inputFolder,
    preserveFiles: connector.settings.preserveFiles,
    ignoreModifiedDate: connector.settings.ignoreModifiedDate,
    minAge: connector.settings.minAge,
    compression: connector.settings.compression
  };
};

const migrateModbus = (connector: SouthV2) => {
  return {
    host: connector.settings.host,
    slaveId: connector.settings.slaveId,
    retryInterval: connector.settings.retryInterval,
    addressOffset: connector.settings.addressOffset,
    endianness: connector.settings.endianness,
    swapBytesInWords: connector.settings.swapBytesInWords,
    swapWordsInDWords: connector.settings.swapWordsInDWords
  };
};

const migrateOPCHDA = (connector: SouthV2) => {
  return {
    host: connector.settings.host,
    tcpPort: connector.settings.tcpPort,
    retryInterval: connector.settings.retryInterval,
    readTimeout: connector.settings.readTimeout,
    agentFilename: connector.settings.agentFilename,
    logLevel: connector.settings.logLevel,
    serverName: connector.settings.serverName
  };
};

const migrateOPCUADA = async (connector: SouthV2, encryptionService: EncryptionService) => {
  return {
    url: connector.settings.url,
    securityMode: connector.settings.securityMode,
    securityPolicy: connector.settings.securityPolicy,
    keepSessionAlive: connector.settings.keepSessionAlive,
    retryInterval: connector.settings.retryInterval,
    authentication: await migrateOPCUAAuth(connector.settings, encryptionService)
  };
};

const migrateOPCUAHA = async (connector: SouthV2, encryptionService: EncryptionService) => {
  return {
    url: connector.settings.url,
    securityMode: connector.settings.securityMode,
    securityPolicy: connector.settings.securityPolicy,
    keepSessionAlive: connector.settings.keepSessionAlive,
    retryInterval: connector.settings.retryInterval,
    authentication: await migrateOPCUAAuth(connector.settings, encryptionService)
  };
};

const migrateOPCUAAuth = async (settings: any, encryptionService: EncryptionService) => {
  if (settings.keyFile && settings.cert) {
    return { type: 'cert', certPath: settings.cert, keyPath: settings.keyFile };
  }
  if (settings.username && settings.password) {
    return { type: 'basic', username: settings.username, password: await encryptionService.convertCiphering(settings.password) };
  }
  return { type: 'none' };
};

const migrateMQTTAuth = async (settings: any, encryptionService: EncryptionService): Promise<Authentication> => {
  if (settings.certFile && settings.keyFile) {
    return { type: 'cert', certPath: settings.certFile, keyPath: settings.keyFile };
  }
  if (settings.username && settings.password) {
    return { type: 'basic', username: settings.username, password: await encryptionService.convertCiphering(settings.password) };
  }
  return { type: 'none' };
};

const migrateRestAuth = async (settings: any, encryptionService: EncryptionService) => {
  switch (settings.authentication.type) {
    case 'Basic':
      return {
        type: 'basic',
        username: settings.authentication.key,
        password: await encryptionService.convertCiphering(settings.authentication.secret)
      };
    case 'Bearer':
      return {
        type: 'bearer',
        token: await encryptionService.convertCiphering(settings.authentication.secret)
      };
    case 'Api-Key':
      return {
        type: 'api-key',
        key: settings.authentication.key,
        secret: await encryptionService.convertCiphering(settings.authentication.secret)
      };

    default:
      return {
        type: 'none'
      };
  }
};

const migrateSQL = async (connector: SouthV2, encryptionService: EncryptionService) => {
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
        compression: connector.settings.compression
      };
    case 'mysql':
      return {
        host: connector.settings.host,
        port: connector.settings.port,
        database: connector.settings.database,
        username: connector.settings.username,
        password: connector.settings.password ? await encryptionService.convertCiphering(connector.settings.password) : '',
        connectionTimeout: connector.settings.connectionTimeout,
        requestTimeout: connector.settings.requestTimeout,
        compression: connector.settings.compression
      };
    case 'postgresql':
      return {
        host: connector.settings.host,
        port: connector.settings.port,
        database: connector.settings.database,
        username: connector.settings.username,
        password: connector.settings.password ? await encryptionService.convertCiphering(connector.settings.password) : '',
        connectionTimeout: connector.settings.connectionTimeout,
        requestTimeout: connector.settings.requestTimeout,
        compression: connector.settings.compression
      };
    case 'oracle':
      return {
        host: connector.settings.host,
        port: connector.settings.port,
        database: connector.settings.database,
        username: connector.settings.username,
        password: connector.settings.password ? await encryptionService.convertCiphering(connector.settings.password) : '',
        connectionTimeout: connector.settings.connectionTimeout,
        requestTimeout: connector.settings.requestTimeout,
        compression: connector.settings.compression
      };
    case 'sqlite':
      return {
        databasePath: connector.settings.databasePath,
        compression: connector.settings.compression
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
        trustServerCertificate: connector.settings.selfSigned,
        compression: connector.settings.compression
      };
    default:
      return {};
  }
};

const migrateRestApi = async (connector: SouthV2, encryptionService: EncryptionService) => {
  return {
    url: `${connector.settings.protocol}://${connector.settings.host}:${connector.settings.port}`,
    acceptSelfSigned: connector.settings.acceptSelfSigned,
    connectionTimeout: connector.settings.connectionTimeout,
    requestTimeout: connector.settings.requestTimeout,
    retryInterval: connector.settings.retryInterval,
    convertToCsv: connector.settings.convertToCsv,
    compression: connector.settings.compression,
    requestMethod: connector.settings.requestMethod,
    body: connector.settings.body,
    variableDateFormat: connector.settings.variableDateFormat,
    payloadParser: connector.settings.payloadParser,
    delimiter: connector.settings.delimiter,
    fileName: connector.settings.fileName,
    queryParams: connector.settings.queryParams,
    authentication: await migrateRestAuth(connector.settings, encryptionService)
  };
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

const migrateAdsItem = (connector: SouthV2, item: ItemV2) => {
  return {
    address: item.pointId
  };
};

const migrateSouthMQTTItem = (connector: SouthV2, item: ItemV2) => {
  return {
    topic: item.topic
  };
};

const migrateOPCUADAItem = (connector: SouthV2, item: ItemV2) => {
  return {
    nodeId: item.nodeId
  };
};

const migrateOPCUAHAItem = (connector: SouthV2, item: ItemV2) => {
  const scanGroup = connector.settings.scanGroups.find((group: any) => group.scanMode === item.scanMode);
  return {
    aggregate: scanGroup?.aggregate || 'Raw',
    resampling: scanGroup?.resampling || 'None',
    nodeId: item.nodeId
  };
};

const migrateOPCHDAItem = (connector: SouthV2, item: ItemV2) => {
  const scanGroup = connector.settings.scanGroups.find((group: any) => group.scanMode === item.scanMode);
  return {
    aggregate: scanGroup?.aggregate || 'Raw',
    resampling: scanGroup?.resampling || 'None',
    nodeId: item.nodeId
  };
};

const migrateModbusItem = (connector: SouthV2, item: ItemV2) => {
  return {
    address: item.address,
    modbusType: item.modbusType,
    dataType: item.dataType,
    multiplierCoefficient: item.multiplierCoefficient
  };
};
