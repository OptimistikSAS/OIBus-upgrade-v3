import { SouthItemSettings, SouthSettings } from './south-settings.model';
import { BaseEntity, Instant } from './types';
import { OIBusSouthType } from './engine.model';

export interface SouthConnectorEntityLight extends BaseEntity {
  name: string;
  type: OIBusSouthType;
  description: string;
  enabled: boolean;
}

export interface SouthConnectorEntity<T extends SouthSettings, I extends SouthItemSettings> extends BaseEntity {
  name: string;
  type: OIBusSouthType;
  description: string;
  enabled: boolean;
  settings: T;
  items: Array<SouthConnectorItemEntity<I>>;
}

export interface SouthConnectorItemEntity<T extends SouthItemSettings> extends BaseEntity {
  name: string;
  enabled: boolean;
  scanModeId: string;
  settings: T;
}

export interface SouthCache {
  southId: string;
  scanModeId: string;
  itemId: string;
  maxInstant: Instant;
}
