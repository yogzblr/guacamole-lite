/**
 * S3/MinIO client for session recording storage
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const fs = require('fs');
const path = require('path');

class S3Manager {
    constructor(config) {
        this.config = config;
        this.client = new S3Client({
            endpoint: config.endpoint,
            region: config.region || 'us-east-1',
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey
            },
            forcePathStyle: config.s3ForcePathStyle !== false // Default true for MinIO
        });
    }

    /**
     * Upload a file to S3/MinIO
     * @param {string} localPath - Local file path
     * @param {string} s3Key - S3 object key (path in bucket)
     * @param {object} options - Additional upload options
     * @returns {Promise<object>} Upload result
     */
    async uploadFile(localPath, s3Key, options = {}) {
        try {
            const fileStream = fs.createReadStream(localPath);

            const upload = new Upload({
                client: this.client,
                params: {
                    Bucket: this.config.bucket,
                    Key: s3Key,
                    Body: fileStream,
                    ContentType: options.contentType || 'application/octet-stream',
                    ContentEncoding: options.contentEncoding
                }
            });

            upload.on('httpUploadProgress', (progress) => {
                if (options.onProgress) {
                    options.onProgress(progress);
                }
            });

            const result = await upload.done();
            return result;
        } catch (error) {
            throw new Error(`S3 upload failed: ${error.message}`);
        }
    }

    /**
     * Upload a buffer/stream to S3/MinIO
     * @param {Buffer|Stream} content - Content to upload
     * @param {string} s3Key - S3 object key
     * @param {object} options - Additional upload options
     * @returns {Promise<object>} Upload result
     */
    async uploadContent(content, s3Key, options = {}) {
        try {
            const command = new PutObjectCommand({
                Bucket: this.config.bucket,
                Key: s3Key,
                Body: content,
                ContentType: options.contentType || 'application/octet-stream',
                ContentEncoding: options.contentEncoding
            });

            const result = await this.client.send(command);
            return result;
        } catch (error) {
            throw new Error(`S3 upload failed: ${error.message}`);
        }
    }

    /**
     * Generate S3 key for recording
     * @param {object} settings - Connection settings
     * @param {string} connectionId - Connection ID
     * @returns {string} S3 key
     */
    generateRecordingKey(settings, connectionId) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const username = settings.connection?.username || 'unknown';
        const prefix = this.config.path || 'recordings/';

        return `${prefix}${username}_${connectionId}_${timestamp}.guac`;
    }
}

module.exports = S3Manager;
