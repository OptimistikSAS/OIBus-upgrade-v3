import { SouthItemSettings, SouthSettings } from './south-settings.model';
import { BaseEntity } from './types';
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
  groups: Array<SouthItemGroupEntity>;
}

export type SouthHistoryRecoveryStrategy = 'oldest' | 'newest';

/**
 * History settings shared by items and groups of history-capable connectors (v3.9.0+)
 */
export interface SouthHistorySettings {
  maxReadInterval: number | null;
  readDelay: number | null;
  startTimeOffset: number | null;
  endTimeOffset: number | null;
  recoveryStrategy: SouthHistoryRecoveryStrategy | null;
}

export interface SouthItemGroupEntity extends BaseEntity, SouthHistorySettings {
  name: string;
  scanModeId: string;
  itemIds: Array<string>;
}

export interface SouthConnectorItemEntity<T extends SouthItemSettings> extends BaseEntity {
  name: string;
  enabled: boolean;
  scanModeId: string | null;
  settings: T;
  history: SouthHistorySettings | null;
  syncWithGroup: boolean;
}
