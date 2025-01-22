import { Database } from 'better-sqlite3';
import { CryptoSettings } from '../model/engine.model';

export const CRYPTO_TABLE = 'crypto';

/**
 * Repository used for engine settings
 */
export default class CryptoRepository {
  constructor(private readonly database: Database) {}

  getCryptoSettings(oibusId: string): CryptoSettings | null {
    const query = `SELECT algorithm, init_vector, security_key FROM ${CRYPTO_TABLE} WHERE id = ?;`;

    const result = this.database.prepare(query).get(oibusId);
    if (!result) return null;
    return this.toCryptoSettings(result as Record<string, string>);
  }

  private toCryptoSettings(result: Record<string, string>): CryptoSettings {
    return {
      algorithm: result.algorithm,
      initVector: result.init_vector,
      securityKey: result.security_key
    };
  }
}
