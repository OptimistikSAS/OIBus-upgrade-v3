import fs from 'node:fs/promises';
import path from 'node:path';
import { createFolder } from '../service/utils';
import pino from 'pino';

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

  async migrate() {
    this.logger.info('\n[FolderStructureMigration]', 'Started migrating archive location');

    await createFolder(this.ARCHIVE_FOLDER_PATH);
    this.logger.info('[FolderStructureMigration]', 'Created archive folder');

    await createFolder(this.ERROR_FOLDER_PATH);
    this.logger.info('[FolderStructureMigration]', 'Created error folder');

    this.logger.info('[FolderStructureMigration]', 'Refactoring data stream');
    await this.refactorDataStream();

    this.logger.info('[FolderStructureMigration]', 'Finished migrating archive location\n');
  }

  async refactorDataStream() {
    const dataStreamFolderPath = path.join(this.CACHE_FOLDER_PATH, 'data-stream');
    const exists = await this.folderExists(dataStreamFolderPath);

    this.logger.info(`Folder /cache/data-stream ${exists ? 'exists' : 'does not exist, skipping'}`);
    if (!exists) {
      return;
    }

    // 1. Move North folders
    const northFolderNames = await this.getNorthFolderNames(dataStreamFolderPath);

    for (const northFolderName of northFolderNames) {
      let sourceNorthFolderPath = path.join(dataStreamFolderPath, northFolderName);

      // a. handling /cache/data-stream/north-id -> /cache/north-id
      this.logger.info(`\nMoving folder /cache/data-stream/${northFolderName} -> /cache/${northFolderName}`);
      const destNorthFolderPath = path.join(this.CACHE_FOLDER_PATH, northFolderName);
      await this.moveFolder(sourceNorthFolderPath, destNorthFolderPath);
      sourceNorthFolderPath = destNorthFolderPath;

      // b. handling /cache/north-id/values        -> /cache/north-id/time-values
      //             /cache/north-id/values-errors -> /errors/north-id/time-values
      this.logger.info(`\nMoving folder /cache/${northFolderName}/values -> /cache/${northFolderName}/time-values`);
      await this.moveFolder(path.join(sourceNorthFolderPath, 'values'), path.join(sourceNorthFolderPath, 'time-values'));

      this.logger.info(`\nMoving folder /cache/${northFolderName}/values-errors -> /errors/${northFolderName}/time-values`);
      await this.moveFolder(
        path.join(sourceNorthFolderPath, 'values-errors'),
        path.join(this.ERROR_FOLDER_PATH, northFolderName, 'time-values')
      );

      // c. handling /cache/north-id/files-errors -> /errors/north-id/files
      this.logger.info(`\nMoving folder /cache/${northFolderName}/files-errors -> /errors/${northFolderName}/files`);
      await this.moveFolder(path.join(sourceNorthFolderPath, 'files-errors'), path.join(this.ERROR_FOLDER_PATH, northFolderName, 'files'));

      // d. handling /cache/north-id/archive -> /archive/north-id/files
      this.logger.info(`\nMoving folder /cache/${northFolderName}/archive -> /archive/${northFolderName}/files`);
      await this.moveFolder(path.join(sourceNorthFolderPath, 'archive'), path.join(this.ARCHIVE_FOLDER_PATH, northFolderName, 'files'));
    }

    // 2. Move South folders
    const southFolderNames = await this.getSouthFolderNames(dataStreamFolderPath);

    for (const southFolderName of southFolderNames) {
      const sourceSouthFolderPath = path.join(dataStreamFolderPath, southFolderName);

      // a. handling /cache/data-stream/south-id -> /cache/south-id
      this.logger.info(`\nMoving folder /cache/data-stream/${southFolderName} -> /cache/${southFolderName}`);
      const destSouthFolderPath = path.join(this.CACHE_FOLDER_PATH, southFolderName);
      await this.moveFolder(sourceSouthFolderPath, destSouthFolderPath);
    }

    // 3. Remove data-stream folder
    this.logger.info('\nRemoving /cache/data-stream\n');
    await fs.rm(dataStreamFolderPath, { recursive: true, force: true });
  }

  /**
   * Moves the contents from sourcePath to destPath, then deletes sourcePath
   * @throws {Error}
   */
  async moveFolder(sourcePath: string, destPath: string) {
    if (await this.folderExists(sourcePath)) {
      await this.moveContents(sourcePath, destPath);
      await fs.rm(sourcePath, { recursive: true, force: true });
    }
  }

  async folderExists(folderPath: string): Promise<boolean> {
    try {
      await fs.access(folderPath);
      return true;
    } catch {
      return false;
    }
  }

  async getNorthFolderNames(baseFolder: string): Promise<Array<string>> {
    const entries = await fs.readdir(baseFolder);
    return entries.filter(entry => entry.startsWith('north-'));
  }

  async getSouthFolderNames(baseFolder: string): Promise<Array<string>> {
    const entries = await fs.readdir(baseFolder);
    return entries.filter(entry => entry.startsWith('south-'));
  }

  async moveContents(sourcePath: string, destPath: string, depth = 1): Promise<void> {
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });
    await createFolder(destPath);

    this.logger.info(`${'\t'.repeat(depth - 1)}Moving contents ${this.shortenPath(sourcePath)} -> ${this.shortenPath(destPath)}`);

    for (const entry of entries) {
      const sourceItemPath = path.join(sourcePath, entry.name);
      const destItemPath = path.join(destPath, entry.name);

      if (entry.isDirectory()) {
        await this.moveContents(sourceItemPath, destItemPath);
        // Remove the source directory after moving its contents
        await fs.rm(sourceItemPath, { recursive: true, force: true });
      } else {
        await fs.rename(sourceItemPath, destItemPath);
        this.logger.info(`${'\t'.repeat(depth)}Moved ${this.shortenPath(sourceItemPath)} -> ${this.shortenPath(destItemPath)}`);
      }
    }
  }

  shortenPath(path: string) {
    return path.startsWith(this.DATA_FOLDER_PATH) ? path.slice(this.DATA_FOLDER_PATH.length) : path;
  }
}
