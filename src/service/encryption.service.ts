import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { SouthConnectorCommandDTO, SouthConnectorDTO } from '../model/south-connector.model';
import { NorthConnectorCommandDTO, NorthConnectorDTO } from '../model/north-connector.model';
import { OibFormControl } from '../model/form.model';
import { CryptoSettings } from '../model/engine.model';

export const CERT_FOLDER = 'certs';
export const CERT_PRIVATE_KEY_FILE_NAME = 'private.pem';
export const CERT_PUBLIC_KEY_FILE_NAME = 'public.pem';
export const CERT_FILE_NAME = 'cert.pem';

/**
 * Service used to manage encryption and decryption of secrets in the config file
 * Also responsible to create private and public key used for encrypting the secrets
 */
export default class EncryptionService {
  private readonly cryptoSettings: { algorithm: string; initVector: Buffer; securityKey: Buffer };
  private readonly _certsFolder: string = '';
  private _publicKey: string | null = null;
  private _privateKey: string | null = null;
  private _certFile: string | null = null;

  constructor(cryptoSettings: CryptoSettings) {
    this.cryptoSettings = {
      algorithm: cryptoSettings.algorithm,
      initVector: Buffer.from(cryptoSettings.initVector, 'base64'),
      securityKey: Buffer.from(cryptoSettings.securityKey, 'base64')
    };
    this._certsFolder = path.resolve('./', CERT_FOLDER);
  }

  getCertPath(): string {
    return path.resolve(this._certsFolder, CERT_FILE_NAME);
  }

  getPrivateKeyPath(): string {
    return path.resolve(this._certsFolder, CERT_PRIVATE_KEY_FILE_NAME);
  }

  getPublicKeyPath(): string {
    return path.resolve(this._certsFolder, CERT_PUBLIC_KEY_FILE_NAME);
  }

  async getCert(): Promise<string> {
    if (!this._certFile) {
      this._certFile = await fs.readFile(this.getCertPath(), 'utf8');
    }
    return this._certFile;
  }

  async getPrivateKey(): Promise<string> {
    if (!this._privateKey) {
      this._privateKey = await fs.readFile(this.getPrivateKeyPath(), 'utf8');
    }
    return this._privateKey;
  }

  async getPublicKey(): Promise<string> {
    if (!this._publicKey) {
      this._publicKey = await fs.readFile(this.getPublicKeyPath(), 'utf8');
    }
    return this._publicKey;
  }

  async encryptConnectorSecrets(
    newSettings: any,
    oldSettings: any,
    formSettings: Array<OibFormControl>
  ): Promise<SouthConnectorCommandDTO | NorthConnectorCommandDTO> {
    const encryptedSettings: any = JSON.parse(JSON.stringify(newSettings));
    for (const fieldSettings of formSettings) {
      if (fieldSettings.type === 'OibSecret') {
        if (encryptedSettings[fieldSettings.key]) {
          encryptedSettings[fieldSettings.key] = await this.encryptText(encryptedSettings[fieldSettings.key]);
        } else {
          encryptedSettings[fieldSettings.key] = oldSettings ? oldSettings[fieldSettings.key] || '' : '';
        }
      } else if (fieldSettings.type === 'OibAuthentication') {
        switch (encryptedSettings[fieldSettings.key].type) {
          case 'api-key':
            encryptedSettings[fieldSettings.key].secret = encryptedSettings[fieldSettings.key].secret
              ? await this.encryptText(encryptedSettings[fieldSettings.key].secret)
              : oldSettings
              ? oldSettings[fieldSettings.key].secret || ''
              : '';
            break;
          case 'bearer':
            encryptedSettings[fieldSettings.key].token = encryptedSettings[fieldSettings.key].token
              ? await this.encryptText(encryptedSettings[fieldSettings.key].token)
              : oldSettings
              ? oldSettings[fieldSettings.key].token || ''
              : '';
            break;
          case 'basic':
            encryptedSettings[fieldSettings.key].password = encryptedSettings[fieldSettings.key].password
              ? await this.encryptText(encryptedSettings[fieldSettings.key].password)
              : oldSettings
              ? oldSettings[fieldSettings.key].password || ''
              : '';
            break;
          case 'none':
          case 'cert':
          default:
            break;
        }
      }
    }
    return encryptedSettings;
  }

  filterSecrets(connectorSettings: any, formSettings: Array<OibFormControl>): SouthConnectorDTO | NorthConnectorDTO {
    for (const fieldSettings of formSettings) {
      if (fieldSettings.type === 'OibSecret') {
        connectorSettings[fieldSettings.key] = '';
      } else if (fieldSettings.type === 'OibAuthentication') {
        switch (connectorSettings[fieldSettings.key].type) {
          case 'api-key':
            connectorSettings[fieldSettings.key].secret = '';
            break;
          case 'bearer':
            connectorSettings[fieldSettings.key].token = '';
            break;
          case 'basic':
            connectorSettings[fieldSettings.key].password = '';
            break;
          case 'none':
          case 'cert':
          default:
            break;
        }
      }
    }
    return connectorSettings;
  }

  /**
   * Return the encrypted text
   */
  async encryptText(plainText: string): Promise<string> {
    const cipher = crypto.createCipheriv(this.cryptoSettings.algorithm, this.cryptoSettings.securityKey, this.cryptoSettings.initVector);
    let encryptedData = cipher.update(plainText, 'utf8', 'base64');
    encryptedData += cipher.final('base64');
    return encryptedData;
  }

  /**
   * Return the decrypted text
   */
  async decryptText(encryptedText: string): Promise<string> {
    const decipher = crypto.createDecipheriv(
      this.cryptoSettings.algorithm,
      this.cryptoSettings.securityKey,
      this.cryptoSettings.initVector
    );

    let decryptedData = decipher.update(encryptedText, 'base64', 'utf8');
    decryptedData += decipher.final('utf8');
    return decryptedData;
  }
}
