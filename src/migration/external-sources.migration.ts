import RepositoryService from '../service/repository.service';
import { ExternalSourceCommandDTO } from '../model/external-sources.model';
import pino from 'pino';

export default class ExternalSourcesMigration {
  constructor(private readonly repositoryService: RepositoryService, private readonly logger: pino.Logger) {}

  async migrate(externalSources: Array<string> = []): Promise<void> {
    this.logger.info(`Migrating ${externalSources.length} external sources`);
    for (const externalSource of externalSources) {
      this.logger.trace(`Migrating external source "${externalSource}"`);
      try {
        const command: ExternalSourceCommandDTO = {
          reference: externalSource,
          description: ''
        };
        this.repositoryService.externalSourceRepository.createExternalSource(command);
      } catch (error) {
        this.logger.error(`Error when migrating external source "${externalSource}": ${error}`);
      }
    }
  }
}
