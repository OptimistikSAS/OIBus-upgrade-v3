import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { ScanModeV2 } from '../model/config.model';
import { ScanModeCommandDTO } from '../model/scan-mode.model';
import { convertCronTime } from './utils';
import { CronTime } from 'cron';
import { DateTime } from 'luxon';

export default class ScanModesMigration {
  constructor(private readonly repositoryService: RepositoryService, private readonly logger: pino.Logger) {}

  async migrate(scanModes: Array<ScanModeV2> = []): Promise<void> {
    this.logger.info(`Migrating ${scanModes.length} scan modes`);
    const nowMs = DateTime.now().toMillis();
    for (const scanMode of scanModes) {
      this.logger.trace(`Migrating scan mode "${JSON.stringify(scanMode)}"`);
      try {
        const standardCron = convertCronTime(scanMode.cronTime);
        const cronTime = new CronTime(standardCron);
        const command: ScanModeCommandDTO = {
          name: scanMode.scanMode,
          description: '',
          cron: standardCron
        };
        this.logger.debug(`Next cron "${command.name}" (${command.cron}) at ${DateTime.fromMillis(nowMs + cronTime.getTimeout())}`);
        this.repositoryService.scanModeRepository.createScanMode(command);
      } catch (error) {
        this.logger.error(`Error when migrating scan mode "${JSON.stringify(scanMode)}": ${error}`);
      }
    }
  }
}
