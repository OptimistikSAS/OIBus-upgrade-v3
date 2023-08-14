import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { SouthV2 } from '../model/config.model';
import path from 'node:path';
import { filesExists } from '../service/utils';
import Database from 'better-sqlite3';
import { Instant } from '../model/types';
import { DateTime } from 'luxon';
import fs from 'node:fs/promises';

export default class SouthCacheMigration {
  constructor(private readonly repositoryService: RepositoryService, private readonly logger: pino.Logger) {}

  async migrate(connectors: Array<SouthV2> = [], cacheFolder: string): Promise<void> {
    this.logger.info(`Migrating cache for ${connectors.length} South connectors`);
    for (const connector of connectors) {
      this.logger.debug(`Migrating cache for South "${connector.name}" of type ${connector.type}`);
      try {
        const cacheFile = path.resolve(cacheFolder, `south-${connector.id}`, 'cache.db');
        if (!(await filesExists(cacheFile))) {
          this.logger.error(`${cacheFile} does not exist`);
          continue;
        }

        const cacheDatabase = Database(cacheFile);

        const cacheEntries: Array<{ name: string; value: Instant }> = cacheDatabase
          .prepare(`SELECT name, value FROM cache WHERE name LIKE '%lastCompletedAt%';`)
          .all() as Array<{ name: string; value: Instant }>;
        cacheEntries.forEach(entry => {
          const maxInstant = DateTime.fromISO(entry.value).toUTC().toISO()!;
          const associatedScanMode = entry.name.split('-', 2);
          const foundScanMode = this.repositoryService.scanModeRepository.getByName(associatedScanMode[1]);
          if (foundScanMode && maxInstant) {
            this.repositoryService.southCacheRepository.createOrUpdateCacheScanMode({
              southId: connector.id,
              scanModeId: foundScanMode.id,
              itemId: this.getAssociatedItemId(connector),
              maxInstant
            });
          }
        });

        cacheDatabase.close();
        await fs.unlink(cacheFile);
      } catch (error) {
        this.logger.error(`Error when migrating cache for South "${connector.name}": ${error}`);
      }
    }
  }

  getAssociatedItemId(connector: SouthV2): string {
    switch (connector.type) {
      case 'SQL':
      case 'RestApi': {
        const southItems = this.repositoryService.southItemRepository.getSouthItems(connector.id);
        return southItems[0].id;
      }
      default:
        return 'all';
    }
  }
}
