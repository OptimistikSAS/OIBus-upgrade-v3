import { BaseEntity } from './types';
import { NorthSettings } from './north-settings.model';
import { SouthConnectorEntityLight } from './south-connector.model';
import { OIBusNorthType } from './engine.model';

export interface NorthConnectorEntity<T extends NorthSettings> extends BaseEntity {
  name: string;
  type: OIBusNorthType;
  description: string;
  enabled: boolean;
  settings: T;
  caching: {
    triggerSchedule: string;
    triggerNumberOfElements: number;
    triggerNumberOfFiles: number;
    throttlingRunMinDelay: number;
    throttlingCacheMaxSize: number;
    throttlingMaxNumberOfElements: number;
    errorRetryInterval: number;
    errorRetryCount: number;
    errorRetentionDuration: number;
    archiveEnabled: boolean;
    archiveRetentionDuration: number;
  };
  subscriptions: Array<SouthConnectorEntityLight>;
}
