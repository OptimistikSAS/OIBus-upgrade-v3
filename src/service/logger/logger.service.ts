import path from 'node:path';

import pino from 'pino';

import { createFolder } from '../utils';

const LOG_FOLDER_NAME = 'logs';
const LOG_FILE_NAME = 'upgrade-journal.log';

class LoggerService {
  logger: pino.Logger | null = null;

  constructor() {}

  /**
   * Run the appropriate pino log transports according to the configuration
   */
  async start(): Promise<void> {
    await createFolder(LOG_FOLDER_NAME);

    const targets = [];
    targets.push({ target: 'pino-pretty', options: { colorize: true, singleLine: true }, level: 'trace' });

    const filePath = path.resolve(LOG_FOLDER_NAME, LOG_FILE_NAME);

    targets.push({
      target: 'pino-roll',
      options: {
        file: filePath
      },
      level: 'trace'
    });

    this.logger = pino({
      base: undefined,
      level: 'trace', // default to trace since each transport has its defined level
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: { targets }
    });
  }
}

export default LoggerService;
