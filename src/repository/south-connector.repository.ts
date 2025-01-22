import { generateRandomId } from '../service/utils';
import { Database } from 'better-sqlite3';
import { SouthConnectorEntity, SouthConnectorItemEntity } from '../model/south-connector.model';
import { SouthItemSettings, SouthSettings } from '../model/south-settings.model';
import { OIBusSouthType } from '../model/engine.model';

const SOUTH_CONNECTORS_TABLE = 'south_connectors';
const SOUTH_ITEMS_TABLE = 'south_items';

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
      const insertQuery = `INSERT INTO ${SOUTH_CONNECTORS_TABLE} (id, name, type, description, enabled, settings) VALUES (?, ?, ?, ?, ?, ?);`;
      this.database
        .prepare(insertQuery)
        .run(south.id, south.name, south.type, south.description, +south.enabled, JSON.stringify(south.settings));

      if (south.items.length > 0) {
        const insert = this.database.prepare(
          `INSERT INTO ${SOUTH_ITEMS_TABLE} (id, name, enabled, connector_id, scan_mode_id, settings) VALUES (?, ?, ?, ?, ?, ?);`
        );
        for (const item of south.items) {
          insert.run(item.id, item.name, +item.enabled, south.id, item.scanModeId, JSON.stringify(item.settings));
        }
      }
    });
    transaction();
  }

  start(id: string): void {
    const query = `UPDATE ${SOUTH_CONNECTORS_TABLE} SET enabled = ? WHERE id = ?;`;
    this.database.prepare(query).run(1, id);
  }

  findAllItemsForSouth<I extends SouthItemSettings>(southId: string): Array<SouthConnectorItemEntity<I>> {
    const query = `SELECT id, name, enabled, scan_mode_id, settings FROM ${SOUTH_ITEMS_TABLE} WHERE connector_id = ?;`;
    return this.database
      .prepare(query)
      .all(southId)
      .map(result => this.toSouthConnectorItemEntity<I>(result as Record<string, string>));
  }

  private toSouthConnectorItemEntity<I extends SouthItemSettings>(result: Record<string, string>): SouthConnectorItemEntity<I> {
    return {
      id: result.id,
      name: result.name,
      enabled: Boolean(result.enabled),
      scanModeId: result.scan_mode_id,
      settings: JSON.parse(result.settings) as I
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
      items: this.findAllItemsForSouth<I>(result.id as string)
    };
  }
}
