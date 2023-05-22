import RepositoryService from '../service/repository.service';
import { ExternalSourceCommandDTO } from '../model/external-sources.model';
import pino from 'pino';
import { ProxyCommandDTO } from '../model/proxy.model';
import { ProxyV2 } from '../model/config.model';
import EncryptionService from '../service/encryption.service';

export default class ProxiesMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger,
    private readonly encryptionService: EncryptionService
  ) {}

  async migrate(proxies: Array<ProxyV2> = []): Promise<void> {
    this.logger.info(`Migrating ${proxies.length} proxies`);
    for (const proxy of proxies) {
      this.logger.trace(`Migrating proxy "${JSON.stringify(proxy)}"`);
      try {
        const command: ProxyCommandDTO = {
          name: proxy.name,
          description: '',
          address: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
          username: proxy.username,
          password: proxy.password ? await this.encryptionService.convertCiphering(proxy.password) : ''
        };
        this.repositoryService.proxyRepository.createProxy(command);
      } catch (error) {
        this.logger.error(`Error when migration proxy ${proxy}: ${error}`);
      }
    }
  }
}
