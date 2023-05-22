import path from 'node:path';

import pino from 'pino';

import LoggerService from './logger.service';

jest.mock('pino');

jest.mock('../utils');

let service: LoggerService;

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    service = new LoggerService();
  });

  it('should be properly initialized', async () => {
    const expectedTargets = [
      { target: 'pino-pretty', options: { colorize: true, singleLine: true }, level: 'trace' },
      {
        target: 'pino-roll',
        options: {
          file: path.resolve('logs', 'upgrade-journal.log')
        },
        level: 'trace'
      }
    ];

    await service.start();

    expect(pino).toHaveBeenCalledTimes(1);
    expect(pino).toHaveBeenCalledWith({
      base: undefined,
      level: 'trace',
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: { targets: expectedTargets }
    });
  });
});
