import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { NorthV2, ProxyV2 } from '../model/config.model';
import EncryptionService from '../service/encryption.service';
import { NorthConnectorCommandDTO } from '../model/north-connector.model';
import { convertNorthType, intervalToCron, migrateNorthSettings } from './utils';

export default class NorthMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger,
    private readonly encryptionService: EncryptionService
  ) {}

  async migrate(connectors: Array<NorthV2> = [], proxies: Array<ProxyV2> = []): Promise<void> {
    this.logger.info(`Migrating ${connectors.length} North connectors`);
    for (const connector of connectors) {
      this.logger.trace(`Migrating North "${connector.name}"`);
      try {
        const command: NorthConnectorCommandDTO = {
          name: connector.name,
          description: '',
          type: convertNorthType(connector.type),
          enabled: connector.enabled,
          caching: {
            scanModeId: intervalToCron(connector.caching.sendInterval, this.repositoryService.scanModeRepository, this.logger),
            retryInterval: connector.caching.retryInterval,
            retryCount: connector.caching.retryCount,
            groupCount: connector.caching.groupCount,
            maxSendCount: connector.caching.maxSendCount,
            sendFileImmediately: true,
            maxSize: connector.caching.maxSize
          },
          archive: {
            enabled: connector.caching.archive.enabled,
            retentionDuration: connector.caching.archive.retentionDuration ?? 72
          },
          settings: await migrateNorthSettings(connector, this.encryptionService, this.logger, proxies)
        };
        this.repositoryService.northConnectorRepository.createNorthConnector(command, connector.id);

        for (const subscription of connector.subscribedTo) {
          if (this.repositoryService.southConnectorRepository.getSouthConnector(subscription)) {
            this.repositoryService.subscriptionRepository.createNorthSubscription(connector.id, subscription);
          } else {
            const externalSource = this.repositoryService.externalSourceRepository.getExternalSourceByReference(subscription);
            if (externalSource) {
              this.repositoryService.subscriptionRepository.createExternalNorthSubscription(connector.id, externalSource.id);
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error when migrating North "${JSON.stringify(connector)}": ${error}`);
      }
    }
  }
}
