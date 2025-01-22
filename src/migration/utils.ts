import { LogLevel, OIBusNorthType, OIBusSouthType } from '../model/engine.model';
import { ItemV2, LogLevelV2, NorthTypeV2, NorthV2, ProxyV2, SouthTypeV2, SouthV2 } from '../model/config.model';
import ScanModeRepository from '../repository/scan-mode.repository';
import EncryptionService from '../service/encryption.service';
import pino from 'pino';
import {
  NorthAmazonS3Settings,
  NorthAzureBlobSettings,
  NorthConsoleSettings,
  NorthFileWriterSettings,
  NorthOIAnalyticsSettings,
  NorthSettings
} from '../model/north-settings.model';
import {
  SouthADSItemSettings,
  SouthADSSettings,
  SouthFolderScannerSettings,
  SouthModbusItemSettings,
  SouthModbusSettings,
  SouthMQTTItemSettings,
  SouthMQTTSettings,
  SouthMQTTSettingsAuthentication,
  SouthMQTTSettingsQos,
  SouthMSSQLSettings,
  SouthMySQLSettings,
  SouthODBCSettings,
  SouthOIAnalyticsSettings,
  SouthOPCItemSettings,
  SouthOPCSettings,
  SouthOPCUAItemSettings,
  SouthOPCUAItemSettingsHaModeAggregate,
  SouthOPCUAItemSettingsHaModeResampling,
  SouthOPCUASettings,
  SouthOPCUASettingsAuthentication,
  SouthOracleSettings,
  SouthPostgreSQLSettings,
  SouthSettings,
  SouthSlimsSettings,
  SouthSQLiteSettings
} from '../model/south-settings.model';
import { CsvCharacter } from '../model/types';

export const convertLogLevel = (logLevel: LogLevelV2): LogLevel => {
  switch (logLevel) {
    case 'trace':
    case 'debug':
    case 'info':
    case 'error':
      return logLevel;
    case 'warning':
      return 'warn';
    case 'none':
    default:
      return 'silent';
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
): Promise<NorthSettings> => {
  logger.trace(`Migrating North settings ${JSON.stringify(connector.settings)}`);

  switch (connector.type) {
    case 'Console':
      return migrateConsole(connector);
    case 'OIAnalytics':
      return await migrateOIAnalytics(connector, encryptionService, proxies);
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

export const convertNorthType = (type: NorthTypeV2): OIBusNorthType => {
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
    useOiaModule: false,
    timeout: 30,
    compress: false,
    specificSettings: {
      host: connector.settings.host,
      authentication: 'basic',
      accessKey: connector.settings.authentication.key,
      secretKey: connector.settings.authentication.secret
        ? await encryptionService.convertCiphering(connector.settings.authentication.secret)
        : '',
      acceptUnauthorized: connector.settings.acceptUnauthorized,
      ...(await migrateProxy(proxyV2, encryptionService))
    }
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
    authentication: toNewAzureBlobAuthentication(connector.settings.authentication),
    sasToken: connector.settings.sasToken ? await encryptionService.convertCiphering(connector.settings.sasToken) : null,
    accessKey: connector.settings.accessKey ? await encryptionService.convertCiphering(connector.settings.accessKey) : null,
    tenantId: connector.settings.tenantId,
    clientId: connector.settings.clientId,
    clientSecret: connector.settings.clientSecret ? await encryptionService.convertCiphering(connector.settings.clientSecret) : null,
    useADLS: false,
    useCustomUrl: false,
    useProxy: false
  };
};

function toNewAzureBlobAuthentication(authentication: string): 'access-key' | 'sas-token' | 'aad' | 'external' {
  switch (authentication) {
    case 'external':
      return 'external';
    case 'aad':
      return 'aad';
    case 'accessKey':
      return 'access-key';
    case 'sasToken':
      return 'sas-token';
    default:
      return 'access-key';
  }
}

const migrateConsole = (connector: NorthV2): NorthConsoleSettings => {
  return {
    verbose: connector.settings.verbose
  };
};

export const migrateSouthSettings = async (
  connector: SouthV2,
  encryptionService: EncryptionService,
  logger: pino.Logger
): Promise<SouthSettings> => {
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
    case 'OdbcRemote':
      return await migrateRemoteODBCSQL(connector);
    case 'RestApi':
      return await migrateRestApi(connector, encryptionService);
    default:
      throw new Error(`South connector type ${connector.type} unknown in V3`);
  }
};

export const convertSouthType = (type: SouthTypeV2, settings: { payloadParser: string; driver: string }): OIBusSouthType => {
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
      return 'opc';
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
    case 'OdbcRemote':
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
    enumAsText: toNewADSAsText(connector.settings.enumAsText),
    boolAsText: toNewADSAsText(connector.settings.boolAsText),
    structureFiltering: connector.settings.structureFiltering ?? []
  };
};

function toNewADSAsText(value: 'Text' | 'Integer'): 'text' | 'integer' {
  switch (value) {
    case 'Text':
      return 'text';
    case 'Integer':
      return 'integer';
  }
}

const migrateFolderScanner = (connector: SouthV2): SouthFolderScannerSettings => {
  return {
    inputFolder: connector.settings.inputFolder,
    compression: connector.settings.compression
  };
};

const migrateModbus = (connector: SouthV2): SouthModbusSettings => {
  return {
    host: connector.settings.host,
    port: connector.settings.port,
    slaveId: connector.settings.slaveId,
    retryInterval: connector.settings.retryInterval,
    addressOffset: toNewModbusAddressOffset(connector.settings.addressOffset),
    endianness: toNewModbusEndianness(connector.settings.endianness),
    swapBytesInWords: connector.settings.swapBytesInWords,
    swapWordsInDWords: connector.settings.swapWordsInDWords
  };
};

function toNewModbusEndianness(endianness: 'Big Endian' | 'Little Endian'): 'big-endian' | 'little-endian' {
  switch (endianness) {
    case 'Big Endian':
      return 'big-endian';
    case 'Little Endian':
      return 'little-endian';
  }
}

function toNewModbusAddressOffset(addressOffset: 'Modbus' | 'JBus'): 'modbus' | 'jbus' {
  switch (addressOffset) {
    case 'Modbus':
      return 'modbus';
    case 'JBus':
      return 'jbus';
  }
}

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

const migrateMQTTAuth = async (
  settings: { keyFile: string; certFile: string; caFile: string; username: string; password: string },
  encryptionService: EncryptionService
): Promise<SouthMQTTSettingsAuthentication> => {
  if (settings.certFile && settings.keyFile) {
    return {
      type: 'cert',
      certFilePath: settings.certFile,
      keyFilePath: settings.keyFile,
      caFilePath: settings.caFile
    };
  }
  if (settings.username && settings.password) {
    return {
      type: 'basic',
      username: settings.username,
      password: await encryptionService.convertCiphering(settings.password)
    };
  }
  return { type: 'none' };
};

const migrateOPCHDA = (connector: SouthV2): SouthOPCSettings => {
  return {
    throttling: {
      maxInstantPerItem: false,
      maxReadInterval: connector.settings.maxReadInterval ?? 60,
      readDelay: connector.settings.readIntervalDelay || 200,
      overlap: connector.settings.overlap || 0
    },
    agentUrl: 'http://ip-adress-or-host:2224',
    retryInterval: connector.settings.retryInterval,
    host: connector.settings.host,
    serverName: connector.settings.serverName
  };
};

const migrateOPCUADA = async (connector: SouthV2, encryptionService: EncryptionService): Promise<SouthOPCUASettings> => {
  return {
    throttling: {
      maxInstantPerItem: false,
      maxReadInterval: connector.settings.maxReadInterval ?? 60,
      readDelay: connector.settings.readIntervalDelay || 200,
      overlap: connector.settings.overlap || 0
    },
    sharedConnection: false,
    readTimeout: connector.settings.readTimeout || 15_000,
    url: connector.settings.url,
    keepSessionAlive: connector.settings.keepSessionAlive,
    retryInterval: connector.settings.retryInterval,
    securityMode: toNewOPCUASecurityMode(connector.settings.securityMode),
    securityPolicy: toNewOPCUASecurityPolicy(connector.settings.securityPolicy),
    authentication: await migrateOPCUAAuth(connector.settings, encryptionService)
  };
};

const migrateOPCUAHA = async (connector: SouthV2, encryptionService: EncryptionService): Promise<SouthOPCUASettings> => {
  return {
    throttling: {
      maxInstantPerItem: false,
      maxReadInterval: connector.settings.maxReadInterval ?? 60,
      readDelay: connector.settings.readIntervalDelay || 200,
      overlap: connector.settings.overlap || 0
    },
    sharedConnection: false,
    readTimeout: connector.settings.readTimeout || 15_000,
    url: connector.settings.url,
    keepSessionAlive: connector.settings.keepSessionAlive,
    retryInterval: connector.settings.retryInterval,
    securityMode: toNewOPCUASecurityMode(connector.settings.securityMode),
    securityPolicy: toNewOPCUASecurityPolicy(connector.settings.securityPolicy),
    authentication: await migrateOPCUAAuth(connector.settings, encryptionService)
  };
};

function toNewOPCUASecurityMode(securityMode: 'None' | 'Sign' | 'SignAndEncrypt'): 'none' | 'sign' | 'sign-and-encrypt' {
  switch (securityMode) {
    case 'None':
      return 'none';
    case 'Sign':
      return 'sign';
    case 'SignAndEncrypt':
      return 'sign-and-encrypt';
  }
}

function toNewOPCUASecurityPolicy(
  securityPolicy:
    | 'None'
    | 'Basic128'
    | 'Basic192'
    | 'Basic256'
    | 'Basic128Rsa15'
    | 'Basic192Rsa15'
    | 'Basic256Rsa15'
    | 'Basic256Sha256'
    | 'Aes128_Sha256_RsaOaep'
    | 'PubSub_Aes128_CTR'
    | 'PubSub_Aes256_CTR'
):
  | 'none'
  | 'basic128'
  | 'basic192'
  | 'basic192-rsa15'
  | 'basic256-rsa15'
  | 'basic256-sha256'
  | 'aes128-sha256-rsa-oaep'
  | 'pub-sub-aes-128-ctr'
  | 'pub-sub-aes-256-ctr' {
  switch (securityPolicy) {
    case 'None':
      return 'none';
    case 'Basic128':
      return 'basic128';
    case 'Basic192':
      return 'basic192';
    case 'Basic256': // obsolete
      return 'basic128';
    case 'Basic128Rsa15': // obsolete
      return 'basic128';
    case 'Basic192Rsa15':
      return 'basic192-rsa15';
    case 'Basic256Rsa15':
      return 'basic256-rsa15';
    case 'Basic256Sha256':
      return 'basic256-sha256';
    case 'Aes128_Sha256_RsaOaep':
      return 'aes128-sha256-rsa-oaep';
    case 'PubSub_Aes128_CTR':
      return 'pub-sub-aes-128-ctr';
    case 'PubSub_Aes256_CTR':
      return 'pub-sub-aes-256-ctr';
    default:
      return 'none';
  }
}

const migrateOPCUAAuth = async (
  settings: { keyFile: string; cert: string; username: string; password: string },
  encryptionService: EncryptionService
): Promise<SouthOPCUASettingsAuthentication> => {
  if (settings.keyFile && settings.cert) {
    return { type: 'cert', certFilePath: settings.cert, keyFilePath: settings.keyFile };
  }
  if (settings.username && settings.password) {
    return {
      type: 'basic',
      username: settings.username,
      password: await encryptionService.convertCiphering(settings.password)
    };
  }
  return { type: 'none' };
};

const migrateSQL = async (
  connector: SouthV2,
  encryptionService: EncryptionService
): Promise<
  SouthMSSQLSettings | SouthMySQLSettings | SouthPostgreSQLSettings | SouthOracleSettings | SouthSQLiteSettings | SouthODBCSettings
> => {
  switch (connector.settings.driver) {
    case 'mssql':
      return {
        throttling: {
          maxReadInterval: connector.settings.maxReadInterval ?? 60,
          readDelay: connector.settings.readIntervalDelay || 200,
          overlap: connector.settings.overlap || 0
        },
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
        throttling: {
          maxReadInterval: connector.settings.maxReadInterval ?? 60,
          readDelay: connector.settings.readIntervalDelay || 200,
          overlap: connector.settings.overlap || 0
        },
        host: connector.settings.host,
        port: connector.settings.port,
        database: connector.settings.database,
        username: connector.settings.username,
        password: connector.settings.password ? await encryptionService.convertCiphering(connector.settings.password) : '',
        connectionTimeout: connector.settings.connectionTimeout
      };
    case 'postgresql':
      return {
        throttling: {
          maxReadInterval: connector.settings.maxReadInterval ?? 60,
          readDelay: connector.settings.readIntervalDelay || 200,
          overlap: connector.settings.overlap || 0
        },
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
        throttling: {
          maxReadInterval: connector.settings.maxReadInterval ?? 60,
          readDelay: connector.settings.readIntervalDelay || 200,
          overlap: connector.settings.overlap || 0
        },
        host: connector.settings.host,
        port: connector.settings.port,
        database: connector.settings.database,
        username: connector.settings.username,
        password: connector.settings.password ? await encryptionService.convertCiphering(connector.settings.password) : '',
        connectionTimeout: connector.settings.connectionTimeout
      };
    case 'sqlite':
      return {
        throttling: {
          maxReadInterval: connector.settings.maxReadInterval ?? 60,
          readDelay: connector.settings.readIntervalDelay || 200,
          overlap: connector.settings.overlap || 0
        },
        databasePath: connector.settings.databasePath
      };
    case 'odbc':
      return {
        throttling: {
          maxReadInterval: connector.settings.maxReadInterval ?? 60,
          readDelay: connector.settings.readIntervalDelay || 200,
          overlap: connector.settings.overlap || 0
        },
        remoteAgent: false,
        connectionString: `Driver=${connector.settings.odbcDriverPath};SERVER=${connector.settings.host},${
          connector.settings.port
        };TrustServerCertificate=${connector.settings.selfSigned ? 'yes' : 'no'};Database=${connector.settings.database};UID=${
          connector.settings.username
        }`,
        password: connector.settings.password ? await encryptionService.convertCiphering(connector.settings.password) : '',
        connectionTimeout: connector.settings.connectionTimeout,
        retryInterval: 5000,
        requestTimeout: connector.settings.requestTimeout
      };
    default:
      throw new Error(`SQL with driver ${connector.settings.driver} unknown in V3`);
  }
};

const migrateRemoteODBCSQL = async (connector: SouthV2): Promise<SouthODBCSettings> => {
  return {
    throttling: {
      maxReadInterval: connector.settings.maxReadInterval ?? 60,
      readDelay: connector.settings.readIntervalDelay || 200,
      overlap: connector.settings.overlap || 0
    },
    remoteAgent: true,
    agentUrl: connector.settings.agentUrl,
    connectionString: connector.settings.connectionString,
    password: '',
    connectionTimeout: connector.settings.connectionTimeout,
    retryInterval: 5000,
    requestTimeout: connector.settings.requestTimeout
  };
};

const migrateRestApi = async (
  connector: SouthV2,
  encryptionService: EncryptionService
): Promise<SouthOIAnalyticsSettings | SouthSlimsSettings> => {
  switch (connector.settings.payloadParser) {
    case 'OIAnalytics time values':
      return {
        throttling: {
          maxReadInterval: connector.settings.maxReadInterval ?? 60,
          readDelay: connector.settings.readIntervalDelay || 200,
          overlap: connector.settings.overlap || 0
        },
        useOiaModule: false,
        timeout: 30,
        specificSettings: {
          host: `${connector.settings.protocol}://${connector.settings.host}:${connector.settings.port}`,
          authentication: 'basic',
          accessKey: connector.settings.authentication.key,
          secretKey: await encryptionService.convertCiphering(connector.settings.authentication.secret),
          acceptUnauthorized: connector.settings.acceptSelfSigned,
          ...(await migrateProxy(undefined, encryptionService))
        }
      };
    case 'SLIMS':
      return {
        throttling: {
          maxReadInterval: connector.settings.maxReadInterval ?? 60,
          readDelay: connector.settings.readIntervalDelay || 200,
          overlap: connector.settings.overlap || 0
        },
        url: `${connector.settings.protocol}://${connector.settings.host}`,
        port: connector.settings.port,
        username: connector.settings.authentication.key,
        password: await encryptionService.convertCiphering(connector.settings.authentication.secret),
        acceptUnauthorized: connector.settings.acceptSelfSigned,
        timeout: 30,
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
      dataArrayPath: connector.settings.dataArrayPath || '',
      pointIdOrigin: connector.settings.nodeIdPath ? 'oibus' : 'payload',
      pointIdPath: connector.settings.nodeIdPath || '',
      valuePath: connector.settings.valuePath || '',
      timestampOrigin: connector.settings.timestampOrigin,
      timestampPayload: {
        timestampPath: connector.settings.timestampPath || '',
        timestampType: 'string',
        timestampFormat: connector.settings.timestampFormat,
        timezone: connector.settings.timestampTimezone
      },
      otherFields: connector.settings.qualityPath ? [{ name: 'quality', path: connector.settings.qualityPath }] : []
    }
  };
};

const migrateOPCUADAItem = (connector: SouthV2, item: ItemV2): SouthOPCUAItemSettings => {
  return {
    nodeId: item.nodeId,
    mode: 'da'
  };
};

const migrateOPCUAHAItem = (connector: SouthV2, item: ItemV2): SouthOPCUAItemSettings => {
  const scanGroup = connector.settings.scanGroups.find((group: { scanMode: string }) => group.scanMode === item.scanMode);
  return {
    nodeId: item.nodeId,
    mode: 'ha',
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
      return '1s';
    case '10 Seconds':
      return '10s';
    case '30 Seconds':
      return '30s';
    case 'Minute':
      return '1min';
    case 'Hour':
      return '1h';
    case 'Day':
      return '1d';
    case 'None':
    default:
      return 'none';
  }
};

const migrateOPCHDAItem = (connector: SouthV2, item: ItemV2): SouthOPCItemSettings => {
  return {
    aggregate: 'raw',
    resampling: 'none',
    nodeId: item.nodeId
  };
};

const migrateModbusItem = (connector: SouthV2, item: ItemV2): SouthModbusItemSettings => {
  return {
    address: item.address,
    modbusType: toNewModbusRegisterType(item.modbusType),
    data: {
      dataType: toNewModbusDataType(item.dataType),
      multiplierCoefficient: parseInt(item.multiplierCoefficient)
    }
  };
};

function toNewModbusDataType(
  modbusType: string
): 'uint16' | 'int16' | 'uint32' | 'int32' | 'big-uint64' | 'big-int64' | 'float' | 'double' | 'bit' {
  switch (modbusType) {
    case 'UInt16':
      return 'uint16';
    case 'Int16':
      return 'int16';
    case 'UInt32':
      return 'uint32';
    case 'Int32':
      return 'uint32';
    case 'BigUInt64':
      return 'big-uint64';
    case 'BigInt64':
      return 'big-int64';
    case 'Float':
      return 'float';
    case 'Double':
      return 'double';
    case 'Bit':
      return 'bit';
    default:
      return 'uint16';
  }
}

function toNewModbusRegisterType(dataType: string): 'coil' | 'discrete-input' | 'input-register' | 'holding-register' {
  switch (dataType) {
    case 'coil':
      return 'coil';
    case 'discreteInput':
      return 'discrete-input';
    case 'inputRegister':
      return 'input-register';
    case 'holdingRegister':
      return 'holding-register';
    default:
      return 'holding-register';
  }
}

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
