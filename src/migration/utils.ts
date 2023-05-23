import { Authentication, AuthenticationType, LogLevel } from '../model/engine.model';
import { AUTHENTICATION_TYPES_V2, AuthenticationTypeV2, LogLevelV2 } from '../model/config.model';

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
