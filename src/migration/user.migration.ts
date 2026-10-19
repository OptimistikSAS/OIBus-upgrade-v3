import RepositoryService from '../service/repository.service';
import pino from 'pino';
import EncryptionService from '../service/encryption.service';
import { User } from '../model/user.model';

const DEFAULT_V3_LOGIN = 'admin';

export default class UserMigration {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly logger: pino.Logger,
    private readonly encryptionService: EncryptionService
  ) {}

  async migrate(user: string, password: string): Promise<void> {
    this.logger.info(`Migrating OIBus user "${user}"`);
    try {
      const command: Omit<User, 'id'> = {
        login: user,
        firstName: '',
        lastName: '',
        email: '',
        language: 'en',
        timezone: 'Europe/Paris'
      };
      const decryptedPassword = password ? await this.encryptionService.legacyDecryptText(password) : 'pass';
      // The v2 user replaces the default admin user created by OIBus v3 on its first start
      const existingUser =
        this.repositoryService.userRepository.findByLogin(user) ?? this.repositoryService.userRepository.findByLogin(DEFAULT_V3_LOGIN);
      if (existingUser) {
        this.repositoryService.userRepository.update(existingUser.id, command);
        await this.repositoryService.userRepository.updatePassword(existingUser.id, decryptedPassword);
      } else {
        await this.repositoryService.userRepository.create(command, decryptedPassword);
      }
    } catch (error) {
      this.logger.error(`Error when migrating user "${user}": ${error}`);
    }
  }
}
