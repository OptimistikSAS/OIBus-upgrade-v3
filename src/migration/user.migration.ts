import RepositoryService from '../service/repository.service';
import pino from 'pino';
import { EngineV2 } from '../model/config.model';
import EncryptionService from '../service/encryption.service';
import { EngineSettingsCommandDTO } from '../model/engine.model';
import { convertAuthentication, convertLogLevel } from './utils';
import { UserCommandDTO } from '../model/user.model';
import { Language, Timezone } from '../model/types';

export default class UserMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger,
    private readonly encryptionService: EncryptionService
  ) {}

  async migrate(user: string, password: string): Promise<void> {
    this.logger.info(`Migrating OIBus user "${user}"`);
    try {
      const adminUser = this.repositoryService.userRepository.getUserByLogin(user);
      if (!adminUser) {
        this.logger.error(`Admin user not found in V3 database. V2 admin not migrated`);
        return;
      }
      const command: UserCommandDTO = {
        login: user,
        firstName: '',
        lastName: '',
        email: '',
        language: 'en',
        timezone: 'Europe/Paris'
      };
      this.repositoryService.userRepository.updateUser(adminUser.id, command);
      await this.repositoryService.userRepository.updatePassword(
        adminUser.id,
        password ? await this.encryptionService.legacyDecryptText(password) : 'pass'
      );
    } catch (error) {
      this.logger.error(`Error when migrating user "${user}": ${error}`);
    }
  }
}
