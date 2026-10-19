import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { SouthV2 } from '../model/config.model';
import path from 'node:path';
import { filesExists } from '../service/utils';
import Database from 'better-sqlite3';
import { DateTime } from 'luxon';
import { ScanMode } from '../model/scan-mode.model';
import { SouthConnectorEntity } from '../model/south-connector.model';
import { SouthItemSettings, SouthSettings } from '../model/south-settings.model';

const LAST_COMPLETED_AT_PREFIX = 'lastCompletedAt-';

/**
 * Migrate the v2 south caches (one cache.db per connector) into the OIBus 3.9 south_item_cache table:
 * - the last completed instant of each v2 scan mode becomes the tracked instant of the groups / items using this scan mode
 * - the files already handled by a folder scanner with preserveFiles become the cache value of its item
 */
export default class SouthCacheMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger
  ) {}

  async migrate(
    connectors: Array<SouthV2> = [],
    cacheFolder: string,
    idMapping: Map<string, string>,
    scanModeMapping = new Map<string, ScanMode>()
  ): Promise<void> {
    this.logger.info(`Migrating cache for ${connectors.length} South connectors`);
    for (const connector of connectors) {
      const newConnectorId = idMapping.get(connector.id);
      if (!newConnectorId) continue;
      const south = this.repositoryService.southConnectorRepository.findSouthById(newConnectorId);
      if (!south) continue;

      const cacheFile = await this.findCacheFile(cacheFolder, connector.id);
      if (!cacheFile) {
        this.logger.debug(`No cache found for South "${connector.name}"`);
        continue;
      }

      this.logger.debug(`Migrating cache ${cacheFile} for South "${connector.name}" of type ${connector.type}`);
      let cacheDatabase: Database.Database | null = null;
      try {
        cacheDatabase = Database(cacheFile, { readonly: true, fileMustExist: true });
        const cacheEntries = cacheDatabase.prepare('SELECT name, value FROM cache;').all() as Array<{ name: string; value: string }>;
        if (connector.type === 'FolderScanner') {
          this.migrateFolderScannerCache(connector, south, cacheEntries);
        } else {
          this.migrateTrackedInstants(connector, south, cacheEntries, scanModeMapping);
        }
      } catch (error) {
        this.logger.error(`Error when migrating cache for South "${connector.name}": ${error}`);
      } finally {
        cacheDatabase?.close();
      }
    }
  }

  /**
   * v2 south caches are in cache/data-stream/south-<id>, or in cache/south-<id> if the data folder has already been refactored
   */
  private async findCacheFile(cacheFolder: string, v2ConnectorId: string): Promise<string | null> {
    for (const candidate of [
      path.resolve(cacheFolder, 'data-stream', `south-${v2ConnectorId}`, 'cache.db'),
      path.resolve(cacheFolder, `south-${v2ConnectorId}`, 'cache.db')
    ]) {
      if (await filesExists(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  private migrateTrackedInstants(
    connector: SouthV2,
    south: SouthConnectorEntity<SouthSettings, SouthItemSettings>,
    cacheEntries: Array<{ name: string; value: string }>,
    scanModeMapping: Map<string, ScanMode>
  ): void {
    for (const entry of cacheEntries.filter(cacheEntry => cacheEntry.name.startsWith(LAST_COMPLETED_AT_PREFIX))) {
      const v2ScanModeName = entry.name.substring(LAST_COMPLETED_AT_PREFIX.length);
      const scanMode = scanModeMapping.get(v2ScanModeName) ?? this.repositoryService.scanModeRepository.getByName(v2ScanModeName);
      const trackedInstant = DateTime.fromISO(entry.value).toUTC().toISO();
      if (!scanMode || !trackedInstant) {
        this.logger.warn(`Could not migrate cache entry "${entry.name}" (${entry.value}) of South "${connector.name}"`);
        continue;
      }

      // Items synchronized with a group share the cache of their group
      const groups = south.groups.filter(group => group.scanModeId === scanMode.id);
      const groupedItemIds = new Set(south.groups.flatMap(group => group.itemIds));
      const items = south.items.filter(item => item.scanModeId === scanMode.id && !(item.syncWithGroup && groupedItemIds.has(item.id)));
      for (const group of groups) {
        this.repositoryService.southCacheRepository.saveGroup(south.id, group.id, trackedInstant);
      }
      for (const item of items) {
        this.repositoryService.southCacheRepository.saveItem(south.id, item.id, trackedInstant);
      }
      this.logger.debug(
        `Tracked instant ${trackedInstant} of scan mode "${v2ScanModeName}" set on ${groups.length} group(s) and ${items.length} item(s) of South "${connector.name}"`
      );
    }
  }

  private migrateFolderScannerCache(
    connector: SouthV2,
    south: SouthConnectorEntity<SouthSettings, SouthItemSettings>,
    cacheEntries: Array<{ name: string; value: string }>
  ): void {
    if (!connector.settings.preserveFiles || south.items.length === 0 || cacheEntries.length === 0) return;
    const filesPreserved = cacheEntries.map(entry => ({ filename: entry.name, modifiedTime: parseFloat(entry.value) }));
    this.repositoryService.southCacheRepository.saveItem(south.id, south.items[0].id, null, filesPreserved);
    this.logger.debug(`${filesPreserved.length} preserved file(s) migrated for South "${connector.name}"`);
  }
}
