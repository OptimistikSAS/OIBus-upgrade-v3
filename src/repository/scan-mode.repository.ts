import { generateRandomId } from '../service/utils';
import { Database } from 'better-sqlite3';
import { ScanMode } from '../model/scan-mode.model';

const SCAN_MODES_TABLE = 'scan_modes';

/**
 * Repository used for scan modes (cron definitions)
 */
export default class ScanModeRepository {
  constructor(private readonly database: Database) {}

  getByName(name: string): ScanMode | null {
    const query = `SELECT id, name, description, cron FROM ${SCAN_MODES_TABLE} WHERE name = ?;`;
    const result = this.database.prepare(query).get(name);
    return result ? this.toScanMode(result as Record<string, string>) : null;
  }

  create(command: Omit<ScanMode, 'id'>, id = generateRandomId(6)): ScanMode {
    const insertQuery = `INSERT INTO ${SCAN_MODES_TABLE} (id, name, description, cron) VALUES (?, ?, ?, ?);`;
    const result = this.database.prepare(insertQuery).run(id, command.name, command.description, command.cron);
    const query = `SELECT id, name, description, cron FROM ${SCAN_MODES_TABLE} WHERE ROWID = ?;`;
    return this.toScanMode(this.database.prepare(query).get(result.lastInsertRowid) as Record<string, string>);
  }

  update(id: string, command: Omit<ScanMode, 'id'>): void {
    const query = `UPDATE ${SCAN_MODES_TABLE} SET name = ?, description = ?, cron = ? WHERE id = ?;`;
    this.database.prepare(query).run(command.name, command.description, command.cron, id);
  }

  delete(id: string): void {
    const query = `DELETE FROM ${SCAN_MODES_TABLE} WHERE id = ?;`;
    this.database.prepare(query).run(id);
  }

  private toScanMode(result: Record<string, string>): ScanMode {
    return {
      id: result.id,
      name: result.name,
      description: result.description,
      cron: result.cron
    };
  }
}
