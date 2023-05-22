// eslint-disable-next-line import/no-extraneous-dependencies
require('dotenv').config({ path: './tests/.env.test' })

const defaultConfig = {
  engine: {
    name: 'OIBus',
    port: 2223,
    user: 'admin',
    password: '',
    filter: ['127.0.0.1', '::1', '::ffff:127.0.0.1'],
    safeMode: true,
    logParameters: {
      consoleLog: { level: 'debug' },
      fileLog: {
        level: 'debug',
        maxSize: 1000000,
        numberOfFiles: 5,
        tailable: true,
      },
      sqliteLog: {
        level: 'debug',
        maxNumberOfLogs: 1000000,
      },
      lokiLog: {
        level: 'none',
        lokiAddress: '',
        interval: 60,
        password: '',
        username: '',
        tokenAddress: '',
      },
    },
    scanModes: [
      {
        scanMode: 'everySecond',
        cronTime: '* * * * * *',
      },
      {
        scanMode: 'every10Seconds',
        cronTime: '* * * * * /10',
      },
      {
        scanMode: 'every1Min',
        cronTime: '* * * * *',
      },
      {
        scanMode: 'every10Minutes',
        cronTime: '* * * * /10',
      },
    ],
    proxies: [],
    healthSignal: {
      logging: {
        enabled: true,
        frequency: 3600,
      },
      http: {
        enabled: false,
        host: '',
        endpoint: '/api/optimistik/oibus/info',
        authentication: {
          type: 'Basic',
          key: '',
          secret: '',
        },
        frequency: 300,
      },
    },
  },
  south: [],
  north: [],
}

export { defaultConfig }
