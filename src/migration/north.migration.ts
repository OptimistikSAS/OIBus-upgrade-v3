import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { NorthV2, ProxyV2 } from '../model/config.model';
import EncryptionService from '../service/encryption.service';
import { NorthConnectorEntity } from '../model/north-connector.model';
import { convertNorthType, intervalToCron, migrateNorthSettings } from './utils';
import { NorthSettings } from '../model/north-settings.model';
import { SouthConnectorEntityLight } from '../model/south-connector.model';

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
        const subscriptions: Array<SouthConnectorEntityLight> = [];
        for (const oldSubscription of connector.subscribedTo) {
          const south = this.repositoryService.southConnectorRepository.findSouthById(oldSubscription);
          if (south) {
            subscriptions.push({
              id: south.id,
              name: south.name,
              type: south.type,
              description: south.description,
              enabled: south.enabled
            });
          }
        }
        const command: NorthConnectorEntity<NorthSettings> = {
          id: connector.id,
          name: connector.name,
          description: '',
          type: convertNorthType(connector.type),
          enabled: connector.enabled,
          caching: {
            scanModeId: intervalToCron(connector.caching.sendInterval, this.repositoryService.scanModeRepository, this.logger),
            retryInterval: connector.caching.retryInterval,
            retryCount: connector.caching.retryCount,
            maxSize: connector.caching.maxSize,
            oibusTimeValues: {
              groupCount: connector.caching.groupCount,
              maxSendCount: connector.caching.maxSendCount
            },
            rawFiles: {
              sendFileImmediately: true,
              archive: {
                enabled: connector.caching.archive.enabled,
                retentionDuration: connector.caching.archive.retentionDuration ?? 72
              }
            }
          },
          settings: await migrateNorthSettings(connector, this.encryptionService, this.logger, proxies),
          subscriptions
        };
        this.repositoryService.northConnectorRepository.saveNorthConnector(command);
      } catch (error) {
        this.logger.error(`Error when migrating North "${JSON.stringify(connector)}": ${error}`);
      }
    }
  }
}
