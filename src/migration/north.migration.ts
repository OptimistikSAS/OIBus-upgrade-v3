import RepositoryService from '../service/repository.service';
import { ExternalSourceCommandDTO } from '../model/external-sources.model';
import pino from 'pino';
import { ProxyCommandDTO } from '../model/proxy.model';
import { NorthV2, ProxyV2 } from '../model/config.model';
import EncryptionService from '../service/encryption.service';
import { NorthConnectorCommandDTO } from '../model/north-connector.model';
import { intervalToCron, migrateNorthSettings } from './utils';

export default class NorthMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger,
    private readonly encryptionService: EncryptionService
  ) {}

  async migrate(connectors: Array<NorthV2> = []): Promise<void> {
    this.logger.info(`Migrating ${connectors.length} North connectors`);
    for (const connector of connectors) {
      this.logger.trace(`Migrating North "${connector.name}"`);
      try {
        const command: NorthConnectorCommandDTO = {
          name: connector.name,
          description: '',
          type: connector.type,
          enabled: connector.enabled,
          caching: {
            scanModeId: intervalToCron(connector.caching.sendInterval, this.repositoryService.scanModeRepository),
            retryInterval: connector.caching.retryInterval,
            retryCount: connector.caching.retryCount,
            groupCount: connector.caching.groupCount,
            maxSendCount: connector.caching.maxSendCount,
            sendFileImmediately: true,
            maxSize: connector.caching.maxSize
          },
          archive: {
            enabled: connector.caching.archive.enabled,
            retentionDuration: connector.caching.archive.retentionDuration
          },
          settings: migrateNorthSettings(connector.settings, this.repositoryService.proxyRepository, this.encryptionService, this.logger)
        };
        this.repositoryService.northConnectorRepository.createNorthConnector(command, connector.id);
      } catch (error) {
        this.logger.error(`Error when migrating North "${JSON.stringify(connector)}": ${error}`);
      }
    }
  }
}
