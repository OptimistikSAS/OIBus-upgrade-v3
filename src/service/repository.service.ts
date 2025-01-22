import Database from 'better-sqlite3';

import EngineRepository from '../repository/engine.repository';
import IpFilterRepository from '../repository/ip-filter.repository';
import ScanModeRepository from '../repository/scan-mode.repository';
import SouthConnectorRepository from '../repository/south-connector.repository';
import NorthConnectorRepository from '../repository/north-connector.repository';
import UserRepository from '../repository/user.repository';
import CryptoRepository from '../repository/crypto.repository';
import SouthCacheRepository from '../repository/south-cache.repository';

export default class RepositoryService {
  private readonly _engineRepository: EngineRepository;
  private readonly _cryptoRepository: CryptoRepository;
  private readonly _ipFilterRepository: IpFilterRepository;
  private readonly _scanModeRepository: ScanModeRepository;
  private readonly _northConnectorRepository: NorthConnectorRepository;
  private readonly _southConnectorRepository: SouthConnectorRepository;
  private readonly _southCacheRepository: SouthCacheRepository;
  private readonly _userRepository: UserRepository;

  constructor(oibusDatabasePath: string, logsDatabasePath: string, cryptoDatabasePath: string, cacheDatabasePath: string) {
    const oibusDatabase = Database(oibusDatabasePath);
    const cryptoDatabase = Database(cryptoDatabasePath);
    const cacheDatabase = Database(cacheDatabasePath);

    this._ipFilterRepository = new IpFilterRepository(oibusDatabase);
    this._scanModeRepository = new ScanModeRepository(oibusDatabase);
    this._engineRepository = new EngineRepository(oibusDatabase, '3.4.0');
    this._northConnectorRepository = new NorthConnectorRepository(oibusDatabase);
    this._southConnectorRepository = new SouthConnectorRepository(oibusDatabase);
    this._userRepository = new UserRepository(oibusDatabase);

    this._cryptoRepository = new CryptoRepository(cryptoDatabase);

    this._southCacheRepository = new SouthCacheRepository(cacheDatabase);
  }

  get cryptoRepository(): CryptoRepository {
    return this._cryptoRepository;
  }

  get userRepository(): UserRepository {
    return this._userRepository;
  }

  get southCacheRepository(): SouthCacheRepository {
    return this._southCacheRepository;
  }

  get engineRepository(): EngineRepository {
    return this._engineRepository;
  }

  get ipFilterRepository(): IpFilterRepository {
    return this._ipFilterRepository;
  }

  get scanModeRepository(): ScanModeRepository {
    return this._scanModeRepository;
  }

  get northConnectorRepository(): NorthConnectorRepository {
    return this._northConnectorRepository;
  }

  get southConnectorRepository(): SouthConnectorRepository {
    return this._southConnectorRepository;
  }
}
