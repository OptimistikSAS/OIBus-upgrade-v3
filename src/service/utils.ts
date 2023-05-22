import fs from 'node:fs/promises';
import path from 'node:path';

import minimist from 'minimist';

/**
 * Get config file from console arguments
 * @returns {Object} - the config file and check argument
 */
const getCommandLineArguments = () => {
  const args = minimist(process.argv.slice(2));
  const { config = './' } = args;
  return { dataFolder: path.resolve(config) };
};

/**
 * Method to return a delayed promise.
 */
const delay = async (timeout: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, timeout);
  });

/**
 * Create a folder if it does not exist
 */
const createFolder = async (folder: string): Promise<void> => {
  const folderPath = path.resolve(folder);
  try {
    await fs.stat(folderPath);
  } catch (error) {
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

const CHARACTER_SET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const RANDOM_LENGTH = 16;

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

export { getCommandLineArguments, delay, createFolder, filesExists, dirSize };
