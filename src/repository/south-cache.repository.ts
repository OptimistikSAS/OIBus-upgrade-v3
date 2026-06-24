import { Database } from 'better-sqlite3';

/**
 * Repository used for South connector cache (v3.8+ per-connector tables)
 */
export default class SouthCacheRepository {
  constructor(private readonly database: Database) {}

  /**
   * Ensures the per-connector cache table exists (created lazily like the runtime does).
   */
  ensureTable(connectorId: string): void {
    const tableName = this.tableName(connectorId);
    this.database
      .prepare(
        `CREATE TABLE IF NOT EXISTS "${tableName}" (` +
          'item_id TEXT PRIMARY KEY, ' +
          'group_id TEXT, ' +
          'query_time TEXT, ' +
          'value TEXT, ' +
          'tracked_instant TEXT' +
          ');'
      )
      .run();
  }

  save(connectorId: string, itemId: string, trackedInstant: string): void {
    this.ensureTable(connectorId);
    const tableName = this.tableName(connectorId);
    const existing = this.database.prepare(`SELECT item_id FROM "${tableName}" WHERE item_id = ?;`).get(itemId);
    if (!existing) {
      this.database
        .prepare(`INSERT INTO "${tableName}" (item_id, group_id, query_time, value, tracked_instant) VALUES (?, NULL, NULL, NULL, ?);`)
        .run(itemId, trackedInstant);
    } else {
      this.database
        .prepare(`UPDATE "${tableName}" SET tracked_instant = ? WHERE item_id = ?;`)
        .run(trackedInstant, itemId);
    }
  }

  private tableName(connectorId: string): string {
    return `south_item_cache_${connectorId}`;
  }
}
