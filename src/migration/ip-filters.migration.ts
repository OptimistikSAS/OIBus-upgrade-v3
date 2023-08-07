import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { IpFilterCommandDTO } from '../model/ip-filter.model';

const IP_TO_IGNORE = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

export default class IPFiltersMigration {
  constructor(private readonly repositoryService: RepositoryService, private readonly logger: pino.Logger) {}

  async migrate(ipFilters: Array<string> = []): Promise<void> {
    this.logger.info(`Migrating ${ipFilters.length} IP filters`);
    for (const ipFilter of ipFilters) {
      if (IP_TO_IGNORE.includes(ipFilter)) {
        continue;
      }
      this.logger.trace(`Migrating IP filter "${ipFilter}"`);
      try {
        const command: IpFilterCommandDTO = {
          address: ipFilter,
          description: ''
        };
        this.repositoryService.ipFilterRepository.createIpFilter(command);
      } catch (error) {
        this.logger.error(`Error when migrating IP filter "${ipFilter}": ${error}`);
      }
    }
  }
}
