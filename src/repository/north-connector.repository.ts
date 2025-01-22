import { Database } from 'better-sqlite3';
import { NorthConnectorEntity } from '../model/north-connector.model';
import { NorthSettings } from '../model/north-settings.model';

const NORTH_CONNECTORS_TABLE = 'north_connectors';
const SUBSCRIPTION_TABLE = 'subscription';

/**
 * Repository used for North connectors
 */
export default class NorthConnectorRepository {
  constructor(private readonly database: Database) {}

  saveNorthConnector(north: NorthConnectorEntity<NorthSettings>): void {
    const transaction = this.database.transaction(() => {
      const insertQuery =
        `INSERT INTO ${NORTH_CONNECTORS_TABLE} (id, name, type, description, enabled, settings, ` +
        `caching_scan_mode_id, caching_group_count, caching_retry_interval, caching_retry_count, caching_max_send_count, ` +
        `caching_send_file_immediately, caching_max_size, archive_enabled, archive_retention_duration) ` +
        `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
      this.database
        .prepare(insertQuery)
        .run(
          north.id,
          north.name,
          north.type,
          north.description,
          +north.enabled,
          JSON.stringify(north.settings),
          north.caching.scanModeId,
          north.caching.oibusTimeValues.groupCount,
          north.caching.retryInterval,
          north.caching.retryCount,
          north.caching.oibusTimeValues.maxSendCount,
          +north.caching.rawFiles.sendFileImmediately,
          north.caching.maxSize,
          +north.caching.rawFiles.archive.enabled,
          north.caching.rawFiles.archive.retentionDuration
        );

      if (north.subscriptions.length > 0) {
        this.database
          .prepare(
            `DELETE FROM ${SUBSCRIPTION_TABLE} WHERE north_connector_id = ? AND south_connector_id NOT IN (${north.subscriptions
              .map(() => '?')
              .join(', ')});`
          )
          .run(
            north.id,
            north.subscriptions.map(subscription => subscription.id)
          );

        const insert = this.database.prepare(
          `INSERT OR IGNORE INTO ${SUBSCRIPTION_TABLE} (north_connector_id, south_connector_id) VALUES (?, ?);`
        );
        for (const subscription of north.subscriptions) {
          insert.run(north.id, subscription.id);
        }
      }
    });
    transaction();
  }
}
