import Database from 'better-sqlite3';

import EngineRepository from '../repository/engine.repository';
import ExternalSourceRepository from '../repository/external-source.repository';
import IpFilterRepository from '../repository/ip-filter.repository';
import ScanModeRepository from '../repository/scan-mode.repository';
import SouthConnectorRepository from '../repository/south-connector.repository';
import SouthItemRepository from '../repository/south-item.repository';
import NorthConnectorRepository from '../repository/north-connector.repository';
import LogRepository from '../repository/log.repository';
import HistoryQueryRepository from '../repository/history-query.repository';
import UserRepository from '../repository/user.repository';
import HistoryQueryItemRepository from '../repository/history-query-item.repository';
import SubscriptionRepository from '../repository/subscription.repository';
import CryptoRepository from '../repository/crypto.repository';
import SouthCacheRepository from '../repository/south-cache.repository';

export default class RepositoryService {
  private readonly _engineRepository: EngineRepository;
  private readonly _cryptoRepository: CryptoRepository;
  private readonly _externalSourceRepository: ExternalSourceRepository;
  private readonly _ipFilterRepository: IpFilterRepository;
  private readonly _scanModeRepository: ScanModeRepository;
  private readonly _northConnectorRepository: NorthConnectorRepository;
  private readonly _southConnectorRepository: SouthConnectorRepository;
  private readonly _southItemRepository: SouthItemRepository;
  private readonly _logRepository: LogRepository;
  private readonly _southCacheRepository: SouthCacheRepository;
  private readonly _historyQueryRepository: HistoryQueryRepository;
  private readonly _historyQueryItemRepository: HistoryQueryItemRepository;
  private readonly _userRepository: UserRepository;
  private readonly _subscriptionRepository: SubscriptionRepository;

  constructor(oibusDatabasePath: string, logsDatabasePath: string, cryptoDatabasePath: string, cacheDatabasePath: string) {
    const oibusDatabase = Database(oibusDatabasePath);
    const logsDatabase = Database(logsDatabasePath);
    const cryptoDatabase = Database(cryptoDatabasePath);
    const cacheDatabase = Database(cacheDatabasePath);

    this._externalSourceRepository = new ExternalSourceRepository(oibusDatabase);
    this._ipFilterRepository = new IpFilterRepository(oibusDatabase);
    this._scanModeRepository = new ScanModeRepository(oibusDatabase);
    this._engineRepository = new EngineRepository(oibusDatabase);
    this._northConnectorRepository = new NorthConnectorRepository(oibusDatabase);
    this._southConnectorRepository = new SouthConnectorRepository(oibusDatabase);
    this._southItemRepository = new SouthItemRepository(oibusDatabase);
    this._southItemRepository = new SouthItemRepository(oibusDatabase);
    this._historyQueryRepository = new HistoryQueryRepository(oibusDatabase);
    this._historyQueryItemRepository = new HistoryQueryItemRepository(oibusDatabase);
    this._userRepository = new UserRepository(oibusDatabase);
    this._subscriptionRepository = new SubscriptionRepository(oibusDatabase);

    this._cryptoRepository = new CryptoRepository(cryptoDatabase);

    this._southCacheRepository = new SouthCacheRepository(cacheDatabase);

    this._logRepository = new LogRepository(logsDatabase);
    this._logRepository = new LogRepository(logsDatabase);
  }

  get cryptoRepository(): CryptoRepository {
    return this._cryptoRepository;
  }

  get userRepository(): UserRepository {
    return this._userRepository;
  }

  get logRepository(): LogRepository {
    return this._logRepository;
  }

  get southCacheRepository(): SouthCacheRepository {
    return this._southCacheRepository;
  }

  get engineRepository(): EngineRepository {
    return this._engineRepository;
  }

  get externalSourceRepository(): ExternalSourceRepository {
    return this._externalSourceRepository;
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

  get southItemRepository(): SouthItemRepository {
    return this._southItemRepository;
  }

  get historyQueryRepository(): HistoryQueryRepository {
    return this._historyQueryRepository;
  }

  get historyQueryItemRepository(): HistoryQueryItemRepository {
    return this._historyQueryItemRepository;
  }

  get subscriptionRepository(): SubscriptionRepository {
    return this._subscriptionRepository;
  }
}
