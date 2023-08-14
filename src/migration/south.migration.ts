import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { ProxyV2, SouthV2 } from '../model/config.model';
import EncryptionService from '../service/encryption.service';
import { convertSouthType, migrateSouthSettings } from './utils';
import { SouthConnectorCommandDTO } from '../model/south-connector.model';

export default class SouthMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger,
    private readonly encryptionService: EncryptionService
  ) {}

  async migrate(connectors: Array<SouthV2> = [], _proxies: Array<ProxyV2> = []): Promise<void> {
    this.logger.info(`Migrating ${connectors.length} South connectors`);
    for (const connector of connectors) {
      this.logger.debug(`Migrating South "${connector.name}" of type ${connector.type}`);
      try {
        const command: SouthConnectorCommandDTO = {
          name: connector.name,
          description: '',
          type: convertSouthType(connector.type, connector.settings),
          enabled: connector.enabled,
          history: {
            maxInstantPerItem: connector.type !== 'OPCUA_HA' && connector.type !== 'OPCHDA',
            maxReadInterval: connector.settings.maxReadInterval || 60,
            readDelay: connector.settings.readIntervalDelay || 200
          },
          settings: await migrateSouthSettings(connector, this.encryptionService, this.logger)
        };
        this.repositoryService.southConnectorRepository.createSouthConnector(command, connector.id);
      } catch (error) {
        this.logger.error(`Error when migrating South "${JSON.stringify(connector)}": ${error}`);
      }
    }
  }
}
