import { DateTime } from 'luxon';
import { Database } from 'better-sqlite3';
import { SouthConnectorEntity, SouthConnectorItemEntity, SouthItemGroupEntity } from '../model/south-connector.model';
import { SouthItemSettings, SouthSettings } from '../model/south-settings.model';
import { OIBusSouthType } from '../model/engine.model';

const SOUTH_CONNECTORS_TABLE = 'south_connectors';
const SOUTH_ITEMS_TABLE = 'south_items';
const SOUTH_ITEM_GROUPS_TABLE = 'south_item_groups';
const GROUP_ITEMS_TABLE = 'group_items';
const CREATED_BY = 'system';

/**
 * Repository used for South connectors (Data sources)
 */
export default class SouthConnectorRepository {
  constructor(private readonly database: Database) {}

  findSouthById<S extends SouthSettings, I extends SouthItemSettings>(id: string): SouthConnectorEntity<S, I> | null {
    const query = `
        SELECT id, name, type, description, enabled, settings
        FROM ${SOUTH_CONNECTORS_TABLE}
        WHERE id = ?;`;

    const result = this.database.prepare(query).get(id);
    if (!result) {
      return null;
    }
    return this.toSouthConnector<S, I>(result as Record<string, string | number>);
  }

  saveSouthConnector<S extends SouthSettings, I extends SouthItemSettings>(south: SouthConnectorEntity<S, I>): void {
    const transaction = this.database.transaction(() => {
      const insertQuery =
        `INSERT INTO ${SOUTH_CONNECTORS_TABLE} (id, name, type, description, enabled, settings, created_by, updated_by) ` +
        `VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;
      this.database
        .prepare(insertQuery)
        .run(south.id, south.name, south.type, south.description, +south.enabled, JSON.stringify(south.settings), CREATED_BY, CREATED_BY);

      if (south.items.length > 0) {
        const insertItem = this.database.prepare(
          `INSERT INTO ${SOUTH_ITEMS_TABLE} (id, name, enabled, connector_id, scan_mode_id, settings, ` +
            `max_read_interval, read_delay, start_time_offset, end_time_offset, recovery_strategy, sync_with_group, created_by, updated_by) ` +
            `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
        );
        for (const item of south.items) {
          insertItem.run(
            item.id,
            item.name,
            +item.enabled,
            south.id,
            item.scanModeId ?? null,
            JSON.stringify(item.settings),
            item.history?.maxReadInterval ?? null,
            item.history?.readDelay ?? null,
            item.history?.startTimeOffset ?? null,
            item.history?.endTimeOffset ?? null,
            item.history?.recoveryStrategy ?? null,
            +item.syncWithGroup,
            CREATED_BY,
            CREATED_BY
          );
        }
      }

      if (south.groups.length > 0) {
        const now = DateTime.now().toUTC().toISO()!;
        const insertGroup = this.database.prepare(
          `INSERT INTO ${SOUTH_ITEM_GROUPS_TABLE} (id, name, south_id, scan_mode_id, max_read_interval, read_delay, ` +
            `start_time_offset, end_time_offset, recovery_strategy, created_at, updated_at, created_by, updated_by) ` +
            `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`
        );
        const insertGroupItem = this.database.prepare(`INSERT INTO ${GROUP_ITEMS_TABLE} (group_id, item_id) VALUES (?, ?);`);
        for (const group of south.groups) {
          insertGroup.run(
            group.id,
            group.name,
            south.id,
            group.scanModeId,
            group.maxReadInterval,
            group.readDelay,
            group.startTimeOffset,
            group.endTimeOffset,
            group.recoveryStrategy,
            now,
            now,
            CREATED_BY,
            CREATED_BY
          );
          for (const itemId of group.itemIds) {
            insertGroupItem.run(group.id, itemId);
          }
        }
      }
    });
    transaction();
  }

  findAllItemsForSouth<I extends SouthItemSettings>(southId: string): Array<SouthConnectorItemEntity<I>> {
    const query =
      `SELECT id, name, enabled, scan_mode_id, settings, max_read_interval, read_delay, start_time_offset, end_time_offset, ` +
      `recovery_strategy, sync_with_group FROM ${SOUTH_ITEMS_TABLE} WHERE connector_id = ?;`;
    return this.database
      .prepare(query)
      .all(southId)
      .map(result => this.toSouthConnectorItemEntity<I>(result as Record<string, string | number | null>));
  }

  findAllGroupsForSouth(southId: string): Array<SouthItemGroupEntity> {
    const query =
      `SELECT id, name, scan_mode_id, max_read_interval, read_delay, start_time_offset, end_time_offset, recovery_strategy ` +
      `FROM ${SOUTH_ITEM_GROUPS_TABLE} WHERE south_id = ?;`;
    const itemsQuery = this.database.prepare(`SELECT item_id FROM ${GROUP_ITEMS_TABLE} WHERE group_id = ?;`);
    return this.database
      .prepare(query)
      .all(southId)
      .map(row => {
        const result = row as Record<string, string | number | null>;
        return {
          id: result.id as string,
          name: result.name as string,
          scanModeId: result.scan_mode_id as string,
          maxReadInterval: result.max_read_interval as number | null,
          readDelay: result.read_delay as number | null,
          startTimeOffset: result.start_time_offset as number | null,
          endTimeOffset: result.end_time_offset as number | null,
          recoveryStrategy: result.recovery_strategy as SouthItemGroupEntity['recoveryStrategy'],
          itemIds: (itemsQuery.all(result.id) as Array<{ item_id: string }>).map(groupItem => groupItem.item_id)
        };
      });
  }

  private toSouthConnectorItemEntity<I extends SouthItemSettings>(
    result: Record<string, string | number | null>
  ): SouthConnectorItemEntity<I> {
    const isHistory = result.recovery_strategy !== null;
    return {
      id: result.id as string,
      name: result.name as string,
      enabled: Boolean(result.enabled),
      scanModeId: result.scan_mode_id as string | null,
      settings: JSON.parse(result.settings as string) as I,
      history: isHistory
        ? {
            maxReadInterval: result.max_read_interval as number | null,
            readDelay: result.read_delay as number | null,
            startTimeOffset: result.start_time_offset as number | null,
            endTimeOffset: result.end_time_offset as number | null,
            recoveryStrategy: result.recovery_strategy as SouthItemGroupEntity['recoveryStrategy']
          }
        : null,
      syncWithGroup: Boolean(result.sync_with_group)
    };
  }

  private toSouthConnector<S extends SouthSettings, I extends SouthItemSettings>(
    result: Record<string, string | number>
  ): SouthConnectorEntity<S, I> {
    return {
      id: result.id as string,
      name: result.name as string,
      type: result.type as OIBusSouthType,
      description: result.description as string,
      enabled: Boolean(result.enabled),
      settings: JSON.parse(result.settings as string) as S,
      items: this.findAllItemsForSouth<I>(result.id as string),
      groups: this.findAllGroupsForSouth(result.id as string)
    };
  }
}
