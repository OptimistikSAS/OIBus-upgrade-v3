import fs from 'node:fs/promises';
import path from 'node:path';

import minimist from 'minimist';
import pino from 'pino';

/**
 * Get config file from console arguments
 * @returns {Object} - the config file and check argument
 */
const getCommandLineArguments = () => {
  const args = minimist(process.argv.slice(2));
  const { config = './', check = false } = args;
  return { dataFolder: path.resolve(config), check };
};

/**
 * Create a folder if it does not exist
 */
const createFolder = async (folder: string): Promise<void> => {
  const folderPath = path.resolve(folder);
  try {
    await fs.stat(folderPath);
  } catch {
    await fs.mkdir(folderPath, { recursive: true });
  }
};

/**
 * Check if a file exists in async way
 */
const filesExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.stat(filePath);
  } catch {
    return false;
  }
  return true;
};

export const deleteFile = async (filePath: string, logger: pino.Logger): Promise<void> => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    logger.warn(`Error deleting file ${filePath}. ${error}`);
  }
};

/**
 * The upgrade tool writes into the database of a running OIBus. It supports the targeted version and its next patches,
 * as long as they do not change the database
 */
export const isSupportedOIBusVersion = (version: string, targetVersion: string): boolean => {
  const [major, minor, patch] = version.split(/[.-]/).map(part => parseInt(part));
  const [targetMajor, targetMinor, targetPatch] = targetVersion.split('.').map(part => parseInt(part));
  return major === targetMajor && minor === targetMinor && patch >= targetPatch;
};

const CHARACTER_SET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const RANDOM_LENGTH = 6;

export const generateRandomId = (size = RANDOM_LENGTH): string => {
  let randomId = '';
  for (let i = 0; i < size; i += 1) {
    randomId += CHARACTER_SET[Math.floor(Math.random() * CHARACTER_SET.length)];
  }
  return randomId;
};

const dirSize = async (dir: string): Promise<number> => {
  const files = await fs.readdir(dir, { withFileTypes: true });

  const paths = files.map(async file => {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {
      return await dirSize(filePath);
    }

    if (file.isFile()) {
      try {
        const { size } = await fs.stat(filePath);
        return size;
      } catch {
        return 0;
      }
    }

    return 0;
  });

  return (await Promise.all(paths)).flat(Infinity).reduce((i, size) => i + size, 0);
};

export { getCommandLineArguments, createFolder, filesExists, dirSize };
