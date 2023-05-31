import { generateRandomId } from '../service/utils';
import { ProxyCommandDTO, ProxyDTO } from '../model/proxy.model';
import { Database } from 'better-sqlite3';
import { ScanModeDTO } from '../model/scan-mode.model';
import { SCAN_MODE_TABLE } from './scan-mode.repository';

export const PROXY_TABLE = 'proxy';

/**
 * Repository used for proxies
 */
export default class ProxyRepository {
  private readonly database: Database;
  constructor(database: Database) {
    this.database = database;
    const query =
      `CREATE TABLE IF NOT EXISTS ${PROXY_TABLE} (id TEXT PRIMARY KEY, name TEXT, description TEXT, ` +
      'address TEXT, username TEXT, password TEXT);';
    this.database.prepare(query).run();
  }

  /**
   * Retrieve all proxies
   */
  getProxies(): Array<ProxyDTO> {
    const query = `SELECT id, name, description, address, username, password FROM ${PROXY_TABLE};`;
    return this.database.prepare(query).all() as Array<ProxyDTO>;
  }

  /**
   * Retrieve a proxy by its ID
   */
  getProxy(id: string): ProxyDTO | null {
    const query = `SELECT id, name, description, address, username, password FROM ${PROXY_TABLE} WHERE id = ?;`;
    return this.database.prepare(query).get(id) as ProxyDTO | null;
  }

  getByName(name: string): ProxyDTO | null {
    const query = `SELECT id, name, description, address, username, password FROM ${PROXY_TABLE} WHERE name = ?;`;
    const result: ProxyDTO | null = this.database.prepare(query).get(name) as ProxyDTO | null;
    if (!result) return null;
    return {
      id: result.id,
      name: result.name,
      description: result.description,
      address: result.address,
      username: result.username,
      password: result.password
    };
  }

  /**
   * Create a proxy with a random generated ID
   */
  createProxy(command: ProxyCommandDTO): ProxyDTO {
    const id = generateRandomId(6);
    const insertQuery = `INSERT INTO ${PROXY_TABLE} (id, name, description, address, username, password) ` + 'VALUES (?, ?, ?, ?, ?, ?);';
    const result = this.database
      .prepare(insertQuery)
      .run(id, command.name, command.description, command.address, command.username, command.password);
    const query = `SELECT id, name, description, address, username, password FROM ${PROXY_TABLE} WHERE ROWID = ?;`;
    return this.database.prepare(query).get(result.lastInsertRowid) as ProxyDTO;
  }

  /**
   * Update a proxy by its ID
   */
  updateProxy(id: string, command: ProxyCommandDTO): void {
    const query = `UPDATE ${PROXY_TABLE} SET name = ?, description = ?, address = ?, username = ?, password = ? WHERE id = ?;`;
    this.database.prepare(query).run(command.name, command.description, command.address, command.username, command.password, id);
  }

  /**
   * Delete a proxy by its ID
   */
  deleteProxy(id: string): void {
    const query = `DELETE FROM ${PROXY_TABLE} WHERE id = ?;`;
    this.database.prepare(query).run(id);
  }
}
