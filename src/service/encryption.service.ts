import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { OibFormControl } from '../model/form.model';
import { CryptoSettings } from '../model/engine.model';
import { SouthSettings } from '../model/south-settings.model';
import { NorthSettings } from '../model/north-settings.model';

export const LEGACY_PRIVATE_KEY = 'private.pem';
export const LEGACY_PUBLIC_KEY = 'public.pem';
export const LEGACY_KEYS_FOLDER = 'keys';

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
  private readonly _certsFolder: string;
  private readonly _legacyKeysFolder: string;
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
    this._legacyKeysFolder = path.resolve('./', LEGACY_KEYS_FOLDER);
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
  ): Promise<SouthSettings | NorthSettings> {
    const encryptedSettings: any = JSON.parse(JSON.stringify(newSettings));
    for (const fieldSettings of formSettings) {
      if (fieldSettings.type === 'OibSecret') {
        if (encryptedSettings[fieldSettings.key]) {
          encryptedSettings[fieldSettings.key] = await this.encryptText(encryptedSettings[fieldSettings.key]);
        } else {
          encryptedSettings[fieldSettings.key] = oldSettings ? oldSettings[fieldSettings.key] || '' : '';
        }
      } else if (fieldSettings.type === 'OibArray') {
        for (let i = 0; i < encryptedSettings[fieldSettings.key].length; i++) {
          encryptedSettings[fieldSettings.key][i] = await this.encryptConnectorSecrets(
            encryptedSettings[fieldSettings.key][i],
            oldSettings ? oldSettings[fieldSettings.key] || null : null,
            fieldSettings.content
          );
        }
      } else if (fieldSettings.type === 'OibFormGroup') {
        encryptedSettings[fieldSettings.key] = await this.encryptConnectorSecrets(
          encryptedSettings[fieldSettings.key],
          oldSettings ? oldSettings[fieldSettings.key] || null : null,
          fieldSettings.content
        );
      }
    }
    return encryptedSettings;
  }

  filterSecrets(connectorSettings: any, formSettings: Array<OibFormControl>): SouthSettings | NorthSettings {
    for (const fieldSettings of formSettings) {
      if (fieldSettings.type === 'OibSecret') {
        connectorSettings[fieldSettings.key] = '';
      } else if (fieldSettings.type === 'OibArray') {
        for (let i = 0; i < connectorSettings[fieldSettings.key].length; i++) {
          connectorSettings[fieldSettings.key][i] = this.filterSecrets(connectorSettings[fieldSettings.key][i], fieldSettings.content);
        }
      } else if (fieldSettings.type === 'OibFormGroup') {
        this.filterSecrets(connectorSettings[fieldSettings.key], fieldSettings.content);
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

  async legacyDecryptText(encryptedText: string): Promise<string> {
    const absolutePath = path.resolve(this._legacyKeysFolder, LEGACY_PRIVATE_KEY);
    const privateKey = await fs.readFile(absolutePath, 'utf8');
    const buffer = Buffer.from(encryptedText, 'base64');
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKey.toString(),
        passphrase: '',
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
      },
      buffer
    );
    return decrypted.toString('utf8');
  }

  async convertCiphering(encryptedText: string): Promise<string> {
    // Decipher with the legacy decrypt method based on RSA
    const decryptedSecret = await this.legacyDecryptText(encryptedText);
    // Return the secret encrypted with the new security suite
    return await this.encryptText(decryptedSecret);
  }
}
