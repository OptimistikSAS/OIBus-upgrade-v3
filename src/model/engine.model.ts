import { Instant } from './types';

export const AUTHENTICATION_TYPES = ['none', 'basic', 'bearer', 'api-key', 'cert'];
export type AuthenticationType = (typeof AUTHENTICATION_TYPES)[number];

interface BaseAuthentication {
  type: AuthenticationType;
}

export interface BasicAuthentication extends BaseAuthentication {
  type: 'basic';
  username: string;
  password: string;
}

export interface BearerAuthentication extends BaseAuthentication {
  type: 'bearer';
  token: string;
}

export interface ApiKeyAuthentication extends BaseAuthentication {
  type: 'api-key';
  key: string;
  secret: string;
}

export interface CertAuthentication extends BaseAuthentication {
  type: 'cert';
  keyPath: string;
  certPath: string;
}

export interface NoAuthentication extends BaseAuthentication {
  type: 'none';
}

export type Authentication = BasicAuthentication | BearerAuthentication | ApiKeyAuthentication | CertAuthentication | NoAuthentication;

export const LOG_LEVELS = ['silent', 'error', 'warn', 'info', 'debug', 'trace'];
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * Base settings for log parameters
 */
interface BaseLogSettings {
  level: LogLevel;
}

/**
 * Settings to write logs into console
 */
interface ConsoleLogSettings extends BaseLogSettings {}

/**
 * Settings to write logs into files
 */
interface FileLogSettings extends BaseLogSettings {
  maxFileSize: number;
  numberOfFiles: number;
}

/**
 * Settings to write logs into a locale database
 */
interface DatabaseLogSettings extends BaseLogSettings {
  maxNumberOfLogs: number;
}

/**
 * Settings to write logs into a remote loki instance
 */
interface LokiLogSettings extends BaseLogSettings {
  interval: number;
  address: string;
  tokenAddress: string;
  username: string;
  password: string;
  proxyId: string | null;
}

/**
 * Logs settings used in the engine
 */
export interface LogSettings {
  console: ConsoleLogSettings;
  file: FileLogSettings;
  database: DatabaseLogSettings;
  loki: LokiLogSettings;
}

/**
 * Log settings for Health Signal
 */
interface HealthSignalLoggingDTO {
  enabled: boolean;
  interval: number;
}

/**
 * HTTP settings for Health Signal
 */
interface HealthSignalHTTPDTO {
  enabled: boolean;
  interval: number;
  verbose: boolean;
  address: string;
  proxyId: string | null;
  authentication: Authentication;
}

/**
 * DTO for health signal settings
 */
export interface HealthSignalDTO {
  logging: HealthSignalLoggingDTO;
  http: HealthSignalHTTPDTO;
}

/**
 * Engine settings DTO
 */
export interface EngineSettingsDTO {
  id: string;
  name: string;
  port: number;
  logParameters: LogSettings;
  healthSignal: HealthSignalDTO;
}

export interface CryptoSettings {
  algorithm: string;
  initVector: string;
  securityKey: string;
}

/**
 * Engine settings command DTO
 */
export interface EngineSettingsCommandDTO {
  name: string;
  port: number;
  logParameters: LogSettings;
  healthSignal: HealthSignalDTO;
}

export interface OIBusError {
  retry: boolean;
  message: string;
}

export interface OIBusInfo {
  version: string;
  dataDirectory: string;
  binaryDirectory: string;
  processId: string;
  hostname: string;
  operatingSystem: string;
  architecture: string;
}

export interface ConnectorMetrics {
  metricsStart: Instant;
  numberOfValues: number;
  numberOfFiles: number;
  lastValue: any | null;
  lastFile: string | null;
  lastConnection: Instant | null;
  lastRunStart: Instant | null;
  lastRunDuration: number | null;
}
