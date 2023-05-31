import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { SouthV2 } from '../model/config.model';
import EncryptionService from '../service/encryption.service';
import { migrateItemSettings } from './utils';
import { OibusItemCommandDTO } from '../model/south-connector.model';

export default class SouthItemsMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger,
    private readonly encryptionService: EncryptionService
  ) {}

  async migrate(southConnector: SouthV2): Promise<void> {
    const items = southConnector.points; // TODO : manage non points
    this.logger.info(`Migrating ${items.length} items for South "${southConnector.name}" ($${southConnector.id})`);
    for (const item of items) {
      this.logger.trace(`Migrating South "${item.name}"`);
      try {
        const scanMode = this.repositoryService.scanModeRepository.getByName(item.scanMode);
        if (!scanMode) {
          this.logger.error(`Could not find scanMode ${item.scanMode}`);
          continue;
        }
        const command: OibusItemCommandDTO = {
          name: item.pointId,
          scanModeId: scanMode.id,
          settings: migrateItemSettings(item, this.encryptionService, this.logger)
        };
        this.repositoryService.southItemRepository.createSouthItem(southConnector.id, command, item.id);
      } catch (error) {
        this.logger.error(`Error when migrating South "${JSON.stringify(item)}": ${error}`);
      }
    }
  }
}
