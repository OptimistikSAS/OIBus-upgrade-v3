import { Authentication, LogLevel } from '../model/engine.model';
import { AuthenticationTypeV2, ItemV2, LogLevelV2 } from '../model/config.model';
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

export const migrateNorthSettings = (
  settings: any,
  repository: ProxyRepository,
  encryptionService: EncryptionService,
  logger: pino.Logger
) => {
  // TODO
  return settings;
};

export const migrateSouthSettings = (
  settings: any,
  repository: ProxyRepository,
  encryptionService: EncryptionService,
  logger: pino.Logger
) => {
  // TODO
  return settings;
};

export const migrateItemSettings = (item: ItemV2, encryptionService: EncryptionService, logger: pino.Logger) => {
  // TODO
  return item;
};
