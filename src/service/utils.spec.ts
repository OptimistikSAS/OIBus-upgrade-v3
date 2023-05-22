import path from 'node:path';
import fs from 'node:fs/promises';
import { Dirent, Stats } from 'node:fs';

import minimist from 'minimist';
import * as utils from './utils';

jest.mock('node:fs/promises');
jest.mock('node:fs');
jest.mock('minimist');

const nowDateString = '2020-02-02T02:02:02.222Z';

describe('Service utils', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(new Date(nowDateString));
  });

  it('should parse command line arguments without args', () => {
    (minimist as unknown as jest.Mock).mockReturnValue({});
    const result = utils.getCommandLineArguments();

    expect(result).toEqual({ dataFolder: path.resolve('./') });
  });

  it('should parse command line arguments with args', () => {
    (minimist as unknown as jest.Mock).mockReturnValue({ config: 'myConfig' });
    const result = utils.getCommandLineArguments();

    expect(result).toEqual({ dataFolder: path.resolve('myConfig') });
  });

  it('should delay', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      return callback();
    });

    await utils.delay(1000);
    jest.advanceTimersToNextTimer();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  it('should properly check if a file exists or not', async () => {
    (fs.stat as jest.Mock).mockImplementation(() => {
      throw new Error('File does not exist');
    });

    expect(await utils.filesExists('myConfigFile.json')).toEqual(false);

    (fs.stat as jest.Mock).mockImplementation(() => null);
    expect(await utils.filesExists('myConfigFile.json')).toEqual(true);
  });

  it('should properly check if a file exists or not', async () => {
    const folderToCreate = 'myFolder';
    (fs.mkdir as jest.Mock).mockImplementation(() => null);
    (fs.stat as jest.Mock).mockImplementation(() => null);

    await utils.createFolder(folderToCreate);
    expect(fs.mkdir).not.toHaveBeenCalled();

    (fs.stat as jest.Mock).mockImplementation(() => {
      throw new Error('File does not exist');
    });

    await utils.createFolder(folderToCreate);

    expect(fs.mkdir).toHaveBeenCalledTimes(1);
    expect(fs.mkdir).toHaveBeenCalledWith(path.resolve(folderToCreate), { recursive: true });
  });

  it('should properly generate a random ID with a standard size', () => {
    const randomId = utils.generateRandomId();
    expect(randomId.length).toEqual(16);
  });

  it('should properly generate a random ID with smaller size', () => {
    const randomId = utils.generateRandomId(8);
    expect(randomId.length).toEqual(8);
  });

  it('should properly generate a random ID with bigger size', () => {
    const randomId = utils.generateRandomId(32);
    expect(randomId.length).toEqual(32);
  });

  it('should properly retrieve dir size', async () => {
    const firstFolder: Array<Dirent> = [
      { name: 'file1', isDirectory: () => false, isFile: () => true } as Dirent,
      { name: 'file2', isDirectory: () => false, isFile: () => true } as Dirent,
      { name: 'dir', isDirectory: () => true, isFile: () => false } as Dirent
    ];
    const secondFolder: Array<Dirent> = [
      { name: 'file3', isDirectory: () => false, isFile: () => true } as Dirent,
      { name: 'file4', isDirectory: () => false, isFile: () => false } as Dirent,
      { name: 'file5', isDirectory: () => false, isFile: () => true } as Dirent
    ];
    (fs.readdir as jest.Mock).mockReturnValueOnce(firstFolder).mockReturnValueOnce(secondFolder);
    (fs.stat as jest.Mock)
      .mockReturnValueOnce({ size: 1 } as Stats)
      .mockReturnValueOnce({ size: 2 } as Stats)
      .mockImplementationOnce(() => {
        throw new Error('stat error');
      })
      .mockReturnValueOnce({ size: 8 } as Stats);

    const dirSize = await utils.dirSize('myDir');
    expect(fs.readdir).toHaveBeenCalledWith('myDir', { withFileTypes: true });
    expect(fs.readdir).toHaveBeenCalledWith(path.join('myDir', 'dir'), { withFileTypes: true });
    expect(fs.stat).toHaveBeenCalledWith(path.join('myDir', 'file1'));
    expect(fs.stat).toHaveBeenCalledWith(path.join('myDir', 'file2'));
    expect(fs.stat).toHaveBeenCalledWith(path.join('myDir', 'dir', 'file3'));
    expect(fs.stat).toHaveBeenCalledWith(path.join('myDir', 'dir', 'file5'));
    expect(fs.stat).toHaveBeenCalledTimes(4);
    expect(dirSize).toEqual(11);
  });
});
