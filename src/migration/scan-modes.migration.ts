import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { ScanModeV2, SouthV2 } from '../model/config.model';
import { ScanMode } from '../model/scan-mode.model';
import { convertCronTime } from './utils';

export default class ScanModesMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger
  ) {}

  migrate(scanModes: Array<ScanModeV2> = [], southConnectors: Array<SouthV2> = []): Map<string, ScanMode> {
    const usedNames = this.collectUsedScanModeNames(southConnectors);
    const used = scanModes.filter(s => usedNames.has(s.scanMode));
    this.logger.info(
      `Creating ${used.length} used scan mode(s) out of ${scanModes.length} defined (${scanModes.length - used.length} unused ignored)`
    );

    const v3ScanModes = this.repositoryService.scanModeRepository.getAll();
    const mapping = new Map<string, ScanMode>();

    for (const scanMode of used) {
      try {
        const standardCron = convertCronTime(scanMode.cronTime);
        const existing = v3ScanModes.find(s => s.cron === standardCron);
        if (existing) {
          this.logger.debug(`Scan mode "${scanMode.scanMode}" already exists as "${existing.name}" — reusing`);
          mapping.set(scanMode.scanMode, existing);
        } else {
          const created = this.repositoryService.scanModeRepository.create({
            name: scanMode.scanMode,
            description: '',
            cron: standardCron
          });
          v3ScanModes.push(created);
          mapping.set(scanMode.scanMode, created);
          this.logger.debug(`Created scan mode "${scanMode.scanMode}" (${standardCron})`);
        }
      } catch (error) {
        this.logger.error(`Error processing scan mode "${scanMode.scanMode}": ${error}`);
      }
    }
    return mapping;
  }

  private collectUsedScanModeNames(southConnectors: Array<SouthV2>): Set<string> {
    const names = new Set<string>();
    for (const connector of southConnectors) {
      if (connector.scanMode) names.add(connector.scanMode);
      for (const point of connector.points ?? []) {
        if (point.scanMode) names.add(point.scanMode);
      }
    }
    return names;
  }
}
