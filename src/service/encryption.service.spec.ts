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
    type: 'OibText',
    label: 'Field 3'
  },
  {
    key: 'field4',
    type: 'OibArray',
    label: 'Field 4',
    content: [
      {
        key: 'fieldArray1',
        type: 'OibText',
        label: 'Field array 1'
      },
      {
        key: 'fieldArray2',
        type: 'OibSecret',
        label: 'Field array 2'
      },
      {
        key: 'fieldArray3',
        type: 'OibSecret',
        label: 'Field array 3'
      }
    ]
  },
  {
    key: 'field5',
    type: 'OibFormGroup',
    label: 'Field 5',
    content: [
      {
        key: 'fieldGroup1',
        type: 'OibText',
        label: 'Field group 1'
      },
      {
        key: 'fieldGroup2',
        type: 'OibSecret',
        label: 'Field group 2'
      }
    ]
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
        readDelay: 0,
        overlap: 0
      },
      settings: {
        field1: 'not a secret',
        field2: 'secret',
        field3: 'not a secret',
        field4: [
          { fieldArray1: 'not an array secret', fieldArray2: 'an array secret' },
          { fieldArray1: 'not an array secret', fieldArray2: 'another array secret' }
        ],
        field5: {
          fieldGroup1: 'not a group secret',
          fieldGroup2: 'a group secret'
        }
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
        readDelay: 0,
        overlap: 0
      },
      settings: {
        field1: 'not a secret',
        field2: 'secret',
        field3: 'not a secret'
      }
    };

    const update = jest.fn(() => 'encrypted secret');
    const final = jest.fn(() => '');
    (crypto.createCipheriv as jest.Mock).mockImplementation(() => ({
      update,
      final
    }));

    const expectedCommand = {
      field1: 'not a secret',
      field2: 'encrypted secret',
      field3: 'not a secret',
      field4: [
        { fieldArray1: 'not an array secret', fieldArray2: 'encrypted secret', fieldArray3: '' },
        { fieldArray1: 'not an array secret', fieldArray2: 'encrypted secret', fieldArray3: '' }
      ],
      field5: {
        fieldGroup1: 'not a group secret',
        fieldGroup2: 'encrypted secret'
      }
    };

    expect(await encryptionService.encryptConnectorSecrets(command.settings, connector.settings, settings)).toEqual(expectedCommand);
  });

  it('should properly encrypt connector secrets when not secret provided', async () => {
    const command: SouthConnectorCommandDTO = {
      name: 'connector',
      type: 'any',
      description: 'my connector',
      enabled: true,
      history: {
        maxInstantPerItem: true,
        maxReadInterval: 3600,
        readDelay: 0,
        overlap: 0
      },
      settings: {
        field1: 'not a secret',
        field2: 'secret',
        field3: 'not a secret',
        field4: [
          { fieldArray1: 'not an array secret', fieldArray2: 'an array secret' },
          { fieldArray1: 'not an array secret', fieldArray2: 'another array secret' }
        ],
        field5: {
          fieldGroup1: 'not a group secret',
          fieldGroup2: 'a group secret'
        }
      }
    };

    const update = jest.fn(() => 'encrypted secret');
    const final = jest.fn(() => '');
    (crypto.createCipheriv as jest.Mock).mockImplementation(() => ({
      update,
      final
    }));

    const expectedCommand = {
      field1: 'not a secret',
      field2: 'encrypted secret',
      field3: 'not a secret',
      field4: [
        { fieldArray1: 'not an array secret', fieldArray2: 'encrypted secret', fieldArray3: '' },
        { fieldArray1: 'not an array secret', fieldArray2: 'encrypted secret', fieldArray3: '' }
      ],
      field5: {
        fieldGroup1: 'not a group secret',
        fieldGroup2: 'encrypted secret'
      }
    };

    expect(await encryptionService.encryptConnectorSecrets(command.settings, null, settings)).toEqual(expectedCommand);
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
        readDelay: 0,
        overlap: 0
      },
      settings: {
        field1: 'not a secret',
        field2: '',
        field3: 'not a secret',
        field4: [
          { fieldArray1: 'not an array secret', fieldArray2: 'an array secret', fieldArray3: null },
          { fieldArray1: 'not an array secret', fieldArray2: 'another array secret' }
        ],
        field5: {
          fieldGroup1: 'not a group secret',
          fieldGroup2: ''
        }
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
        readDelay: 0,
        overlap: 0
      },
      settings: {
        field1: 'not a secret',
        field2: 'encrypted secret',
        field3: 'not a secret',
        field4: [
          { fieldArray1: 'not an array secret', fieldArray2: 'encrypted secret' },
          { fieldArray1: 'not an array secret', fieldArray2: 'encrypted secret' }
        ],
        field5: {
          fieldGroup1: 'not a group secret',
          fieldGroup2: 'a group secret'
        }
      }
    };
    const expectedCommand = {
      field1: 'not a secret',
      field2: 'encrypted secret',
      field3: 'not a secret',
      field4: [
        { fieldArray1: 'not an array secret', fieldArray2: 'encrypted secret', fieldArray3: '' },
        { fieldArray1: 'not an array secret', fieldArray2: 'encrypted secret', fieldArray3: '' }
      ],
      field5: {
        fieldGroup1: 'not a group secret',
        fieldGroup2: 'a group secret'
      }
    };

    const update = jest.fn(() => 'encrypted secret');
    const final = jest.fn(() => '');
    (crypto.createCipheriv as jest.Mock).mockImplementation(() => ({
      update,
      final
    }));

    expect(await encryptionService.encryptConnectorSecrets(command.settings, connector.settings, settings)).toEqual(expectedCommand);
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
        readDelay: 0,
        overlap: 0
      },
      settings: {
        field1: 'not a secret',
        field2: 'encrypted secret',
        field3: 'not a secret',
        field4: [
          { fieldArray1: 'not an array secret', fieldArray2: 'an array secret' },
          { fieldArray1: 'not an array secret', fieldArray2: 'another array secret' }
        ],
        field5: {
          fieldGroup1: 'not a group secret',
          fieldGroup2: 'a group secret'
        }
      }
    };

    expect(encryptionService.filterSecrets(connector.settings, settings)).toEqual({
      field1: 'not a secret',
      field2: '',
      field3: 'not a secret',
      field4: [
        { fieldArray1: 'not an array secret', fieldArray2: '', fieldArray3: '' },
        { fieldArray1: 'not an array secret', fieldArray2: '', fieldArray3: '' }
      ],
      field5: {
        fieldGroup1: 'not a group secret',
        fieldGroup2: ''
      }
    });
  });
});
