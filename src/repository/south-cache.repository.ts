import { Database } from 'better-sqlite3';

const SOUTH_CACHE_TABLE = 'south_item_cache';

/**
 * Repository used for South connector cache (v3.9+ single table shared by all connectors)
 */
export default class SouthCacheRepository {
  constructor(private readonly database: Database) {}

  /**
   * Save the cache of an item (not synchronized with a group, or connector not able to batch its items)
   */
  saveItem(southId: string, itemId: string, trackedInstant: string | null, value: unknown = null): void {
    this.database
      .prepare(
        `INSERT OR REPLACE INTO ${SOUTH_CACHE_TABLE} (south_id, item_id, group_id, query_time, value, tracked_instant) ` +
          'VALUES (?, ?, NULL, NULL, ?, ?);'
      )
      .run(southId, itemId, value !== null ? JSON.stringify(value) : null, trackedInstant);
  }

  /**
   * Save the cache shared by all the items of a synchronized group. As item_id is NULL, the primary key can not be used
   * to upsert the row
   */
  saveGroup(southId: string, groupId: string, trackedInstant: string): void {
    const result = this.database
      .prepare(`UPDATE ${SOUTH_CACHE_TABLE} SET tracked_instant = ? WHERE south_id = ? AND group_id = ? AND item_id IS NULL;`)
      .run(trackedInstant, southId, groupId);
    if (result.changes === 0) {
      this.database
        .prepare(
          `INSERT INTO ${SOUTH_CACHE_TABLE} (south_id, item_id, group_id, query_time, value, tracked_instant) VALUES (?, NULL, ?, NULL, NULL, ?);`
        )
        .run(southId, groupId, trackedInstant);
    }
  }
}
