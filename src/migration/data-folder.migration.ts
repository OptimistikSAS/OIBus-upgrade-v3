import fs from 'node:fs/promises';
import path from 'node:path';
import { DateTime } from 'luxon';
import { createFolder, generateRandomId } from '../service/utils';
import pino from 'pino';

const CONTENT_FOLDER = 'content';
const METADATA_FOLDER = 'metadata';

type DataFolderType = 'cache' | 'error' | 'archive';

interface CacheMetadata {
  contentFile: string;
  contentSize: number;
  numberOfElement: number;
  createdAt: string;
  contentType: string;
}

/**
 * Move the v2 cache/data-stream content into the OIBus 3.9 structure:
 * - cache|error|archive/north-<new id>/content/<file id> holds the data
 * - cache|error|archive/north-<new id>/metadata/<file id> holds its JSON metadata
 * South connectors no longer have their own cache folders (their cache is in cache.db)
 */
export default class DataFolderMigration {
  private readonly DATA_FOLDER_PATH: string;
  private readonly CACHE_FOLDER_PATH: string;
  private readonly ARCHIVE_FOLDER_PATH: string;
  private readonly ERROR_FOLDER_PATH: string;

  constructor(
    baseDir: string,
    private readonly logger: pino.Logger
  ) {
    this.DATA_FOLDER_PATH = baseDir;
    this.CACHE_FOLDER_PATH = path.resolve(this.DATA_FOLDER_PATH, 'cache');
    this.ARCHIVE_FOLDER_PATH = path.resolve(this.DATA_FOLDER_PATH, 'archive');
    this.ERROR_FOLDER_PATH = path.resolve(this.DATA_FOLDER_PATH, 'error');
  }

  async migrate(northIdMapping: Map<string, string>) {
    this.logger.info('[FolderStructureMigration] Started migrating cache folders');

    await createFolder(this.ARCHIVE_FOLDER_PATH);
    await createFolder(this.ERROR_FOLDER_PATH);

    const dataStreamFolderPath = path.join(this.CACHE_FOLDER_PATH, 'data-stream');
    if (await this.folderExists(dataStreamFolderPath)) {
      for (const northFolderName of await this.getFolderNames(dataStreamFolderPath, 'north-')) {
        const v2NorthId = northFolderName.substring('north-'.length);
        const newNorthId = northIdMapping.get(v2NorthId);
        if (!newNorthId) {
          this.logger.warn(`North connector ${v2NorthId} has not been migrated. Its cache folder ${northFolderName} is dropped`);
          continue;
        }
        await this.migrateNorthFolder(path.join(dataStreamFolderPath, northFolderName), newNorthId);
      }
      this.logger.info('Removing /cache/data-stream');
      await fs.rm(dataStreamFolderPath, { recursive: true, force: true });
    } else {
      this.logger.info('Folder /cache/data-stream does not exist, no cache to migrate');
    }

    // South connectors do not have cache folders anymore
    for (const folder of [this.CACHE_FOLDER_PATH, this.ERROR_FOLDER_PATH, this.ARCHIVE_FOLDER_PATH]) {
      for (const southFolderName of await this.getFolderNames(folder, 'south-')) {
        this.logger.info(`Removing legacy folder ${this.shortenPath(path.join(folder, southFolderName))}`);
        await fs.rm(path.join(folder, southFolderName), { recursive: true, force: true });
      }
    }

    this.logger.info('[FolderStructureMigration] Finished migrating cache folders');
  }

  private async migrateNorthFolder(v2NorthFolderPath: string, newNorthId: string): Promise<void> {
    this.logger.info(`Migrating ${this.shortenPath(v2NorthFolderPath)} into north-${newNorthId}`);
    const moves: Array<{ source: string; destination: DataFolderType; contentType: 'time-values' | 'any' }> = [
      { source: 'values', destination: 'cache', contentType: 'time-values' },
      { source: 'files', destination: 'cache', contentType: 'any' },
      { source: 'values-errors', destination: 'error', contentType: 'time-values' },
      { source: 'files-errors', destination: 'error', contentType: 'any' },
      { source: 'archive', destination: 'archive', contentType: 'any' }
    ];
    for (const move of moves) {
      const sourceFolder = path.join(v2NorthFolderPath, move.source);
      if (!(await this.folderExists(sourceFolder))) continue;
      const destinationFolder = path.join(this.getBaseFolder(move.destination), `north-${newNorthId}`);
      await createFolder(path.join(destinationFolder, CONTENT_FOLDER));
      await createFolder(path.join(destinationFolder, METADATA_FOLDER));

      let migrated = 0;
      for (const filename of await fs.readdir(sourceFolder)) {
        const sourceFile = path.join(sourceFolder, filename);
        try {
          const stats = await fs.stat(sourceFile);
          if (!stats.isFile()) continue;
          const fileId = generateRandomId(12);
          const metadata: CacheMetadata = {
            contentFile: move.contentType === 'time-values' ? `${fileId}.json` : filename,
            contentSize: stats.size,
            numberOfElement: 0,
            createdAt: DateTime.fromMillis(stats.mtimeMs).toUTC().toISO()!,
            contentType: move.contentType
          };
          if (move.contentType === 'time-values') {
            // Also checks that the file is complete: v2 may have been stopped while writing it
            const values: Array<object> = JSON.parse(await fs.readFile(sourceFile, { encoding: 'utf8' }));
            metadata.numberOfElement = values.length;
          }
          await fs.rename(sourceFile, path.join(destinationFolder, CONTENT_FOLDER, fileId));
          await fs.writeFile(path.join(destinationFolder, METADATA_FOLDER, fileId), JSON.stringify(metadata), { encoding: 'utf8' });
          migrated++;
        } catch (error: unknown) {
          this.logger.error(`Could not migrate cache file ${this.shortenPath(sourceFile)}: ${(error as Error).message}`);
        }
      }
      this.logger.info(`${migrated} file(s) migrated from ${this.shortenPath(sourceFolder)} to ${this.shortenPath(destinationFolder)}`);
    }
  }

  private getBaseFolder(type: DataFolderType): string {
    switch (type) {
      case 'cache':
        return this.CACHE_FOLDER_PATH;
      case 'error':
        return this.ERROR_FOLDER_PATH;
      case 'archive':
        return this.ARCHIVE_FOLDER_PATH;
    }
  }

  private async folderExists(folderPath: string): Promise<boolean> {
    try {
      await fs.access(folderPath);
      return true;
    } catch {
      return false;
    }
  }

  private async getFolderNames(baseFolder: string, prefix: string): Promise<Array<string>> {
    if (!(await this.folderExists(baseFolder))) return [];
    const entries = await fs.readdir(baseFolder, { withFileTypes: true });
    return entries.filter(entry => entry.isDirectory() && entry.name.startsWith(prefix)).map(entry => entry.name);
  }

  private shortenPath(filePath: string) {
    return filePath.startsWith(this.DATA_FOLDER_PATH) ? filePath.slice(this.DATA_FOLDER_PATH.length) : filePath;
  }
}
