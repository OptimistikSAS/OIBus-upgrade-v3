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
    scanModeId: string;
    retryInterval: number;
    retryCount: number;
    maxSize: number;
    oibusTimeValues: {
      groupCount: number;
      maxSendCount: number;
    };
    rawFiles: {
      sendFileImmediately: boolean;
      archive: {
        enabled: boolean;
        retentionDuration: number;
      };
    };
  };
  subscriptions: Array<SouthConnectorEntityLight>;
}
