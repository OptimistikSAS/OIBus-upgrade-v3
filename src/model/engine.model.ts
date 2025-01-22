import { BaseEntity } from './types';

export const LOG_LEVELS = ['silent', 'error', 'warn', 'info', 'debug', 'trace'];
export type LogLevel = (typeof LOG_LEVELS)[number];

export const SCOPE_TYPES = ['south', 'north', 'history-query', 'internal', 'web-server'];
export type ScopeType = (typeof SCOPE_TYPES)[number];

export interface EngineSettings extends BaseEntity {
  name: string;
  port: number;
  version: string;
  launcherVersion: string;
  proxyEnabled: boolean;
  proxyPort: number | null;
  logParameters: {
    console: {
      level: LogLevel;
    };
    file: {
      level: LogLevel;
      maxFileSize: number;
      numberOfFiles: number;
    };
    database: {
      level: LogLevel;
      maxNumberOfLogs: number;
    };
    loki: {
      level: LogLevel;
      interval: number;
      address: string;
      username: string;
      password: string;
    };
    oia: {
      level: LogLevel;
      interval: number;
    };
  };
}

export interface CryptoSettings {
  algorithm: string;
  initVector: string;
  securityKey: string;
}

export const OIBUS_NORTH_TYPES = ['azure-blob', 'aws-s3', 'console', 'file-writer', 'oianalytics', 'sftp'] as const;
export type OIBusNorthType = (typeof OIBUS_NORTH_TYPES)[number];

export const OIBUS_SOUTH_TYPES = [
  'ads',
  'folder-scanner',
  'modbus',
  'mqtt',
  'mssql',
  'mysql',
  'odbc',
  'oianalytics',
  'oledb',
  'opc',
  'opcua',
  'oracle',
  'osisoft-pi',
  'postgresql',
  'sftp',
  'slims',
  'sqlite'
] as const;
export type OIBusSouthType = (typeof OIBUS_SOUTH_TYPES)[number];
