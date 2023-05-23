export const AUTHENTICATION_TYPES_V2 = ['None', 'Basic', 'Bearer', 'Api Key'];
export type AuthenticationTypeV2 = (typeof AUTHENTICATION_TYPES_V2)[number];

export const NORTH_TYPES_V2 = [
  'AWS3',
  'Console',
  'CsvToHttp',
  'FileWriter',
  'InfluxDB',
  'MongoDB',
  'MQTT',
  'OIAnalytics',
  'OIConnect',
  'TimescaleDB',
  'WATSY'
];
export type NorthTypeV2 = (typeof NORTH_TYPES_V2)[number];

export const SOUTH_TYPES_V2 = ['ADS', 'FolderScanner', 'Modbus', 'MQTT', 'OPCHDA', 'OPCUA_DA', 'OPCUA_HA', 'RestApi', 'SQL'];
export type SouthTypeV2 = (typeof SOUTH_TYPES_V2)[number];

export const LOG_LEVEL_V2 = ['trace', 'debug', 'info', 'warning', 'error', 'none'];
export type LogLevelV2 = (typeof LOG_LEVEL_V2)[number];

export interface LogParametersV2 {
  consoleLog: {
    level: LogLevelV2;
  };
  fileLog: {
    level: LogLevelV2;
    maxSize: number;
    numberOfFile: number;
    tailable: boolean;
  };
  sqliteLog: {
    level: LogLevelV2;
    maxNumberOfLogs: number;
  };
  lokiLog: {
    level: LogLevelV2;
    lokiAddress: string;
    interval: number;
    password: string;
    username: string;
    tokenAddress: string;
  };
}

export interface HealthSignalV2 {
  logging: {
    enabled: boolean;
    frequency: number;
  };
  http: {
    enabled: false;
    host: string;
    endpoint: string;
    authentication: {
      type: AuthenticationTypeV2;
      username: string;
      password: string;
    };
    frequency: number;
  };
}

export interface ScanModeV2 {
  scanMode: string;
  cronTime: string;
}

export interface ProxyV2 {
  name: string;
  protocol: 'http' | 'https';
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface EngineV2 {
  name: string;
  port: number;
  user: string;
  password: string;
  filter: Array<string>;
  scanModes: Array<ScanModeV2>;
  proxies: Array<ProxyV2>;
  externalSources: Array<string>;
  safeMode: boolean;
  logParameters: LogParametersV2;
  caching: {
    bufferMax: number;
    bufferTimeoutInterval: number;
  };
  healthSignal: HealthSignalV2;
  httpRequest: {
    stack: string;
    timeout: number;
    retryCount: number;
  };
}

export interface NorthCacheV2 {
  sendInterval: number;
  retryInterval: number;
  groupCount: number;
  maxSendCount: number;
  retryCount: number;
  timeout: number;
  maxSize: number;
  archive: {
    enabled: boolean;
    retentionDuration: number;
  };
}

export interface NorthV2 {
  id: string;
  name: string;
  type: NorthTypeV2;
  enabled: boolean;
  settings: any;
  caching: NorthCacheV2;
  subscribedTo: Array<string>;
}

export interface ItemV2 {
  id: string;
  pointId: string;
  scanMode: string;
  [key: string]: string;
}

export interface SouthV2 {
  id: string;
  name: string;
  type: SouthTypeV2;
  enabled: boolean;
  settings: any;
  points: Array<ItemV2>;
}

export interface OIBusV2Config {
  engine: EngineV2;
  north: Array<NorthV2>;
  south: Array<SouthV2>;
  schemaVersion: number;
}
