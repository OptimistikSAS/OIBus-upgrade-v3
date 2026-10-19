import { Database } from 'better-sqlite3';
import { NorthConnectorEntity } from '../model/north-connector.model';
import { NorthSettings } from '../model/north-settings.model';
import { generateRandomId } from '../service/utils';

const NORTH_CONNECTORS_TABLE = 'north_connectors';
const NORTH_TRANSFORMERS_TABLE = 'north_transformers';
const TRANSFORMERS_TABLE = 'transformers';
const CREATED_BY = 'system';

/**
 * Repository used for North connectors
 */
export default class NorthConnectorRepository {
  constructor(private readonly database: Database) {}

  saveNorthConnector(north: NorthConnectorEntity<NorthSettings>): void {
    const transaction = this.database.transaction(() => {
      const insertQuery =
        `INSERT INTO ${NORTH_CONNECTORS_TABLE} (id, name, type, description, enabled, settings, ` +
        `caching_trigger_schedule, caching_trigger_number_of_elements, caching_trigger_number_of_files, ` +
        `caching_throttling_run_min_delay, caching_throttling_cache_max_size, caching_throttling_max_number_of_elements, ` +
        `caching_error_retry_interval, caching_error_retry_count, caching_error_retention_duration, ` +
        `caching_archive_enabled, caching_archive_retention_duration, created_by, updated_by) ` +
        `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
      this.database
        .prepare(insertQuery)
        .run(
          north.id,
          north.name,
          north.type,
          north.description,
          +north.enabled,
          JSON.stringify(north.settings),
          north.caching.triggerSchedule,
          north.caching.triggerNumberOfElements,
          north.caching.triggerNumberOfFiles,
          north.caching.throttlingRunMinDelay,
          north.caching.throttlingCacheMaxSize,
          north.caching.throttlingMaxNumberOfElements,
          north.caching.errorRetryInterval,
          north.caching.errorRetryCount,
          north.caching.errorRetentionDuration,
          +north.caching.archiveEnabled,
          north.caching.archiveRetentionDuration,
          CREATED_BY,
          CREATED_BY
        );

      if (north.subscriptions.length > 0) {
        // In v3.8+, subscriptions are modelled as north_transformers linked to south connectors.
        // Look up the built-in 'iso' transformer (created by OIBus migrations on first run).
        const isoTransformer = this.database.prepare(`SELECT id FROM ${TRANSFORMERS_TABLE} WHERE function_name = 'iso' LIMIT 1;`).get() as
          | { id: string }
          | undefined;

        if (isoTransformer) {
          const insert = this.database.prepare(
            `INSERT INTO ${NORTH_TRANSFORMERS_TABLE} (id, north_id, transformer_id, source_type, source_south_south_id) VALUES (?, ?, ?, ?, ?);`
          );
          for (const subscription of north.subscriptions) {
            insert.run(generateRandomId(6), north.id, isoTransformer.id, 'south', subscription.id);
          }
        }
      }
    });
    transaction();
  }
}
