import fs from 'node:fs/promises';
import crypto from 'node:crypto';

import path from 'node:path';

import EncryptionService, {
  CERT_FILE_NAME,
  CERT_FOLDER,
  CERT_PRIVATE_KEY_FILE_NAME,
  CERT_PUBLIC_KEY_FILE_NAME
} from './encryption.service';
import { OibFormControl } from '../model/form.model';

import { SouthConnectorCommandDTO, SouthConnectorDTO } from '../model/south-connector.model';

jest.mock('./utils');
jest.mock('node:fs/promises');
jest.mock('node:crypto');

let encryptionService: EncryptionService;

const cryptoSettings = {
  algorithm: 'aes-256-cbc',
  initVector: Buffer.from('0123456789abcdef').toString('base64'),
  securityKey: Buffer.from('0123456789abcdef').toString('base64')
};

const settings: Array<OibFormControl> = [
  {
    key: 'field1',
    type: 'OibText',
    label: 'Field 1'
  },
  {
    key: 'field2',
    type: 'OibSecret',
    label: 'Field 2'
  },
  {
    key: 'field3',
    type: 'OibAuthentication',
    label: 'Field 3',
    authTypes: ['none', 'basic']
  },
  {
    key: 'field4',
    type: 'OibText',
    label: 'Field 4'
  }
];

describe('Encryption service with crypto settings', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptionService = new EncryptionService(cryptoSettings);
  });

  it('should properly initialized encryption service', () => {
    expect(encryptionService.getCertPath()).toEqual(path.resolve('./', CERT_FOLDER, CERT_FILE_NAME));
    expect(encryptionService.getPrivateKeyPath()).toEqual(path.resolve('./', CERT_FOLDER, CERT_PRIVATE_KEY_FILE_NAME));
    expect(encryptionService.getPublicKeyPath()).toEqual(path.resolve('./', CERT_FOLDER, CERT_PUBLIC_KEY_FILE_NAME));
  });

  it('should properly retrieve files', async () => {
    (fs.readFile as jest.Mock)
      .mockReturnValueOnce('cert file content')
      .mockReturnValueOnce('private key file content')
      .mockReturnValueOnce('public key file content');

    expect(await encryptionService.getCert()).toEqual('cert file content');
    expect(await encryptionService.getCert()).toEqual('cert file content');
    expect(fs.readFile).toHaveBeenCalledTimes(1);
    expect(await encryptionService.getPrivateKey()).toEqual('private key file content');
    expect(await encryptionService.getPrivateKey()).toEqual('private key file content');
    expect(fs.readFile).toHaveBeenCalledTimes(2);
    expect(await encryptionService.getPublicKey()).toEqual('public key file content');
    expect(await encryptionService.getPublicKey()).toEqual('public key file content');
    expect(fs.readFile).toHaveBeenCalledTimes(3);
  });

  it('should properly encrypt text', async () => {
    const update = jest.fn(() => 'encrypted text');
    const final = jest.fn(() => '');
    (crypto.createCipheriv as jest.Mock).mockImplementationOnce(() => ({
      update,
      final
    }));

    const encryptedText = await encryptionService.encryptText('text to encrypt');
    expect(encryptedText).toEqual('encrypted text');
    expect(crypto.createCipheriv).toHaveBeenCalledWith(
      cryptoSettings.algorithm,
      Buffer.from(cryptoSettings.securityKey, 'base64'),
      Buffer.from(cryptoSettings.initVector, 'base64')
    );
    expect(update).toHaveBeenCalledWith('text to encrypt', 'utf8', 'base64');
    expect(final).toHaveBeenCalledWith('base64');
  });

  it('should properly decrypt text', async () => {
    const update = jest.fn(() => 'decrypted text');
    const final = jest.fn(() => '');
    (crypto.createDecipheriv as jest.Mock).mockImplementationOnce(() => ({
      update,
      final
    }));

    const encryptedText = await encryptionService.decryptText('text to decrypt');
    expect(encryptedText).toEqual('decrypted text');
    expect(crypto.createDecipheriv).toHaveBeenCalledWith(
      cryptoSettings.algorithm,
      Buffer.from(cryptoSettings.securityKey, 'base64'),
      Buffer.from(cryptoSettings.initVector, 'base64')
    );
    expect(update).toHaveBeenCalledWith('text to decrypt', 'base64', 'utf8');
    expect(final).toHaveBeenCalledWith('utf8');
  });

  it('should properly encrypt connector secrets', async () => {
    const command: SouthConnectorCommandDTO = {
      name: 'connector',
      type: 'any',
      description: 'my connector',
      enabled: true,
      history: {
        maxInstantPerItem: true,
        maxReadInterval: 3600,
        readDelay: 0
      },
      settings: {
        field1: 'not a secret',
        field2: 'secret',
        field3: {
          type: 'basic',
          username: 'user',
          password: 'secret'
        } as unknown,
        field4: 'not a secret'
      }
    };
    const connector: SouthConnectorDTO = {
      id: 'id1',
      name: 'connector',
      type: 'any',
      description: 'my connector',
      enabled: true,
      history: {
        maxInstantPerItem: true,
        maxReadInterval: 3600,
        readDelay: 0
      },
      settings: {
        field1: 'not a secret',
        field2: 'secret',
        field3: {
          type: 'basic',
          username: 'user',
          password: 'pass'
        } as unknown,
        field4: 'not a secret'
      }
    };
    const expectedCommand = {
      field1: 'not a secret',
      field2: 'encrypted secret',
      field3: {
        type: 'basic',
        username: 'user',
        password: 'encrypted secret'
      } as unknown,
      field4: 'not a secret'
    };

    const update = jest.fn(() => 'encrypted secret');
    const final = jest.fn(() => '');
    (crypto.createCipheriv as jest.Mock).mockImplementation(() => ({
      update,
      final
    }));

    expect(await encryptionService.encryptConnectorSecrets(command.settings, connector.settings, settings)).toEqual(expectedCommand);
    expectedCommand.field3 = { type: 'api-key', key: 'my key', secret: 'encrypted secret' };
    command.settings.field3 = { type: 'api-key', key: 'my key', secret: 'secret' };
    expect(await encryptionService.encryptConnectorSecrets(command.settings, connector.settings, settings)).toEqual(expectedCommand);

    expectedCommand.field3 = { type: 'bearer', token: 'encrypted secret' };
    command.settings.field3 = { type: 'bearer', token: 'my token' };
    expect(await encryptionService.encryptConnectorSecrets(command.settings, connector.settings, settings)).toEqual(expectedCommand);

    expectedCommand.field3 = { type: 'cert', certPath: 'my cert', keyPath: 'my key' };
    command.settings.field3 = { type: 'cert', certPath: 'my cert', keyPath: 'my key' };
    expect(await encryptionService.encryptConnectorSecrets(command.settings, connector.settings, settings)).toEqual(expectedCommand);
  });

  it('should properly keep existing and encrypted connector secrets', async () => {
    const command: SouthConnectorCommandDTO = {
      name: 'connector',
      type: 'any',
      description: 'my connector',
      enabled: true,
      history: {
        maxInstantPerItem: true,
        maxReadInterval: 3600,
        readDelay: 0
      },
      settings: {
        field1: 'not a secret',
        field2: '',
        field3: {
          type: 'basic',
          username: 'user',
          password: ''
        },
        field4: 'not a secret'
      }
    };
    const connector: SouthConnectorDTO = {
      id: 'id1',
      name: 'connector',
      type: 'any',
      description: 'my connector',
      enabled: true,
      history: {
        maxInstantPerItem: true,
        maxReadInterval: 3600,
        readDelay: 0
      },
      settings: {
        field1: 'not a secret',
        field2: 'encrypted secret',
        field3: {
          type: 'basic',
          username: 'user',
          password: 'encrypted pass'
        },
        field4: 'not a secret'
      }
    };
    const expectedCommand = {
      field1: 'not a secret',
      field2: 'encrypted secret',
      field3: {
        type: 'basic',
        username: 'user',
        password: 'encrypted pass'
      },
      field4: 'not a secret'
    };

    const update = jest.fn(() => 'encrypted secret');
    const final = jest.fn(() => '');
    (crypto.createCipheriv as jest.Mock).mockImplementation(() => ({
      update,
      final
    }));

    expect(await encryptionService.encryptConnectorSecrets(command.settings, connector.settings, settings)).toEqual(expectedCommand);
  });

  it('should properly keep empty string when secrets not set in auth', async () => {
    const command: SouthConnectorCommandDTO = {
      name: 'connector',
      type: 'any',
      description: 'my connector',
      enabled: true,
      history: {
        maxInstantPerItem: true,
        maxReadInterval: 3600,
        readDelay: 0
      },
      settings: {
        field1: 'not a secret',
        field2: '',
        field3: {
          type: 'basic',
          username: 'user',
          password: ''
        },
        field4: 'not a secret'
      }
    };
    const connector: SouthConnectorDTO = {
      id: 'id1',
      name: 'connector',
      type: 'any',
      description: 'my connector',
      enabled: true,
      history: {
        maxInstantPerItem: true,
        maxReadInterval: 3600,
        readDelay: 0
      },
      settings: {
        field1: 'not a secret',
        field2: 'encrypted secret',
        field3: {
          type: 'basic',
          username: 'user',
          password: ''
        } as unknown,
        field4: 'not a secret'
      }
    };
    const expectedCommand = {
      field1: 'not a secret',
      field2: 'encrypted secret',
      field3: {
        type: 'basic',
        username: 'user',
        password: ''
      } as unknown,
      field4: 'not a secret'
    };

    const update = jest.fn(() => 'encrypted secret');
    const final = jest.fn(() => '');
    (crypto.createCipheriv as jest.Mock).mockImplementation(() => ({
      update,
      final
    }));

    expect(await encryptionService.encryptConnectorSecrets(command.settings, connector.settings, settings)).toEqual(expectedCommand);
    expectedCommand.field2 = '';
    expect(await encryptionService.encryptConnectorSecrets(command.settings, null, settings)).toEqual(expectedCommand);

    connector.settings.field3 = { type: 'none' };
    expectedCommand.field2 = '';
    connector.settings.field2 = null;
    expectedCommand.field3 = { type: 'none' };
    command.settings.field3 = { type: 'none' };
    expect(await encryptionService.encryptConnectorSecrets(command.settings, connector.settings, settings)).toEqual(expectedCommand);

    connector.settings.field3 = { type: 'api-key', key: 'my key', secret: '' };
    expectedCommand.field2 = 'encrypted secret';
    connector.settings.field2 = 'encrypted secret';

    expectedCommand.field3 = { type: 'api-key', key: 'my key', secret: '' };
    command.settings.field3 = { type: 'api-key', key: 'my key', secret: '' };
    expect(await encryptionService.encryptConnectorSecrets(command.settings, connector.settings, settings)).toEqual(expectedCommand);
    expectedCommand.field2 = '';
    expect(await encryptionService.encryptConnectorSecrets(command.settings, null, settings)).toEqual(expectedCommand);

    connector.settings.field3 = { type: 'bearer' };
    expectedCommand.field2 = 'encrypted secret';
    expectedCommand.field3 = { type: 'bearer', token: '' };
    command.settings.field3 = { type: 'bearer' };
    expect(await encryptionService.encryptConnectorSecrets(command.settings, connector.settings, settings)).toEqual(expectedCommand);
    expectedCommand.field2 = '';
    expect(await encryptionService.encryptConnectorSecrets(command.settings, null, settings)).toEqual(expectedCommand);
  });

  it('should properly filter out secret', () => {
    const connector: SouthConnectorDTO = {
      id: 'id1',
      name: 'connector',
      type: 'any',
      description: 'my connector',
      enabled: true,
      history: {
        maxInstantPerItem: true,
        maxReadInterval: 3600,
        readDelay: 0
      },
      settings: {
        field1: 'not a secret',
        field2: 'encrypted secret',
        field3: {
          type: 'basic',
          username: 'user',
          password: 'secret'
        } as unknown,
        field4: 'not a secret'
      }
    };

    expect(encryptionService.filterSecrets(connector.settings, settings)).toEqual({
      field1: 'not a secret',
      field2: '',
      field3: {
        type: 'basic',
        username: 'user',
        password: ''
      } as unknown,
      field4: 'not a secret'
    });

    connector.settings.field3 = { type: 'api-key', key: 'my key', secret: 'secret' };
    expect(encryptionService.filterSecrets(connector.settings, settings)).toEqual({
      field1: 'not a secret',
      field2: '',
      field3: {
        type: 'api-key',
        key: 'my key',
        secret: ''
      } as unknown,
      field4: 'not a secret'
    });

    connector.settings.field3 = { type: 'bearer', token: 'secret' };
    expect(encryptionService.filterSecrets(connector.settings, settings)).toEqual({
      field1: 'not a secret',
      field2: '',
      field3: {
        type: 'bearer',
        token: ''
      } as unknown,
      field4: 'not a secret'
    });

    connector.settings.field3 = { type: 'none' };
    expect(encryptionService.filterSecrets(connector.settings, settings)).toEqual({
      field1: 'not a secret',
      field2: '',
      field3: {
        type: 'none'
      } as unknown,
      field4: 'not a secret'
    });
  });
});
//
// describe('Encryption service with bad crypto settings', () => {
//   beforeEach(() => {
//     jest.resetAllMocks();
//   });
//
//   it('should properly initialized encryption service', async () => {
//     const consoleSpy = jest.spyOn(console, 'error').mockImplementationOnce(() => {});
//     encryptionService = new EncryptionService('');
//     expect(consoleSpy).toHaveBeenCalledTimes(1);
//     expect(consoleSpy).toHaveBeenCalledWith(`Could not parse crypto settings: SyntaxError: Unexpected end of JSON input`);
//
//     let decryptError;
//     try {
//       await encryptionService.decryptText('encrypted');
//     } catch (err) {
//       decryptError = err;
//     }
//     expect(decryptError).toEqual(new Error('Encryption service not initialized properly'));
//
//     let encryptError;
//     try {
//       await encryptionService.encryptText('plain text');
//     } catch (err) {
//       encryptError = err;
//     }
//     expect(encryptError).toEqual(new Error('Encryption service not initialized properly'));
//   });
// });
