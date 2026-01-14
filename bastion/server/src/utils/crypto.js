/**
 * Token encryption and decryption utilities
 * Uses AES-256-CBC for token security
 */

const crypto = require('crypto');

const CIPHER = 'aes-256-cbc';

class CryptoManager {
    constructor(secretKey) {
        if (!secretKey || secretKey.length !== 32) {
            throw new Error('Secret key must be exactly 32 characters');
        }
        this.secretKey = Buffer.from(secretKey);
    }

    /**
     * Decrypt a base64-encoded token
     * @param {string} encryptedToken - Base64 encoded token
     * @returns {object} Decrypted connection configuration
     */
    decryptToken(encryptedToken) {
        try {
            // Decode base64 outer layer
            const json = Buffer.from(encryptedToken, 'base64').toString('utf8');
            const data = JSON.parse(json);

            // Extract IV and encrypted value
            const iv = Buffer.from(data.iv, 'base64');
            const encryptedText = Buffer.from(data.value, 'base64');

            // Create decipher
            const decipher = crypto.createDecipheriv(CIPHER, this.secretKey, iv);

            // Decrypt
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            // Parse JSON
            return JSON.parse(decrypted.toString('utf8'));
        } catch (error) {
            throw new Error(`Token decryption failed: ${error.message}`);
        }
    }

    /**
     * Encrypt a connection configuration into a token
     * @param {object} config - Connection configuration object
     * @returns {string} Base64 encoded token
     */
    encryptToken(config) {
        try {
            // Generate random IV
            const iv = crypto.randomBytes(16);

            // Create cipher
            const cipher = crypto.createCipheriv(CIPHER, this.secretKey, iv);

            // Encrypt
            let encrypted = cipher.update(JSON.stringify(config), 'utf8', 'base64');
            encrypted += cipher.final('base64');

            // Create token structure
            const data = {
                iv: iv.toString('base64'),
                value: encrypted
            };

            // Base64 encode
            const json = JSON.stringify(data);
            return Buffer.from(json).toString('base64');
        } catch (error) {
            throw new Error(`Token encryption failed: ${error.message}`);
        }
    }
}

module.exports = CryptoManager;
