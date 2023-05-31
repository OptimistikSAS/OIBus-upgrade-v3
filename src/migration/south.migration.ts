import RepositoryService from '../service/repository.service';
import { ExternalSourceCommandDTO } from '../model/external-sources.model';
import pino from 'pino';
import { ProxyCommandDTO } from '../model/proxy.model';
import { NorthV2, ProxyV2, SouthV2 } from '../model/config.model';
import EncryptionService from '../service/encryption.service';
import { NorthConnectorCommandDTO } from '../model/north-connector.model';
import { intervalToCron, migrateNorthSettings, migrateSouthSettings } from './utils';
import { SouthConnectorCommandDTO } from '../model/south-connector.model';

export default class SouthMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger,
    private readonly encryptionService: EncryptionService
  ) {}

  async migrate(connectors: Array<SouthV2> = []): Promise<void> {
    this.logger.info(`Migrating ${connectors.length} South connectors`);
    for (const connector of connectors) {
      this.logger.trace(`Migrating South "${connector.name}"`);
      try {
        const command: SouthConnectorCommandDTO = {
          name: connector.name,
          description: '',
          type: connector.type,
          enabled: connector.enabled,
          history: {
            maxInstantPerItem: false,
            maxReadInterval: connector.settings.maxReadInterval || 60,
            readDelay: connector.settings.readDelay || 200
          },
          settings: migrateSouthSettings(connector, this.repositoryService.proxyRepository, this.encryptionService, this.logger)
        };
        this.repositoryService.southConnectorRepository.createSouthConnector(command, connector.id);
      } catch (error) {
        this.logger.error(`Error when migrating South "${JSON.stringify(connector)}": ${error}`);
      }
    }
  }
}
