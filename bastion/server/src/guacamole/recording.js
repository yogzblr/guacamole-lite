/**
 * Session recording handler
 * Records Guacamole sessions to S3/MinIO
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipe = promisify(pipeline);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

class RecordingManager {
    constructor(s3Manager, logger) {
        this.s3Manager = s3Manager;
        this.logger = logger;
    }

    /**
     * Setup recording for a connection
     * @param {object} settings - Connection settings
     * @param {string} connectionId - Connection ID
     * @returns {object} Updated settings with recording paths
     */
    setupRecording(settings, connectionId) {
        if (!process.env.RECORDING_ENABLED || process.env.RECORDING_ENABLED === 'false') {
            return settings;
        }

        const recordingPath = process.env.RECORDING_PATH || '/tmp/guacamole-recordings';
        const recordingName = `session_${connectionId}`;

        // Ensure recording directory exists
        if (!fs.existsSync(recordingPath)) {
            fs.mkdirSync(recordingPath, { recursive: true });
        }

        // Add recording configuration to connection settings
        if (!settings.connection) {
            settings.connection = {};
        }

        settings.connection['recording-path'] = recordingPath;
        settings.connection['recording-name'] = recordingName;
        settings.connection['create-recording-path'] = true;

        this.logger.info(`Recording enabled for connection ${connectionId}: ${path.join(recordingPath, recordingName)}`);

        return settings;
    }

    /**
     * Upload recording to S3 after session ends
     * @param {object} settings - Connection settings
     * @param {string} connectionId - Connection ID
     */
    async uploadRecording(settings, connectionId) {
        if (!settings.connection || !settings.connection['recording-path'] || !settings.connection['recording-name']) {
            this.logger.debug('No recording configured for this connection');
            return;
        }

        // Wait briefly for guacd to finish writing the file
        await new Promise(resolve => setTimeout(resolve, 1000));

        const recordingPath = settings.connection['recording-path'];
        const recordingName = settings.connection['recording-name'];
        const rawFile = path.join(recordingPath, recordingName);

        // Check if file exists
        if (!fs.existsSync(rawFile)) {
            this.logger.warn(`Recording file not found: ${rawFile}`);
            return;
        }

        try {
            const fileStats = await stat(rawFile);
            this.logger.info(`Processing recording (${fileStats.size} bytes): ${rawFile}`);

            // Compress the recording
            const gzipPath = rawFile + '.gz';
            await this.compressFile(rawFile, gzipPath);

            // Upload to S3
            const s3Key = this.s3Manager.generateRecordingKey(settings, connectionId);
            this.logger.info(`Uploading recording to S3: ${s3Key}`);

            await this.s3Manager.uploadFile(gzipPath, s3Key, {
                contentEncoding: 'gzip',
                contentType: 'application/octet-stream',
                onProgress: (progress) => {
                    if (progress.loaded && progress.total) {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        this.logger.debug(`Upload progress: ${percent}%`);
                    }
                }
            });

            this.logger.info(`Recording uploaded successfully: ${s3Key}`);

            // Cleanup local files
            await unlink(rawFile);
            await unlink(gzipPath);
            this.logger.info('Local recording files cleaned up');

        } catch (error) {
            this.logger.error('Failed to upload recording:', error);
            throw error;
        }
    }

    /**
     * Compress a file using gzip
     * @param {string} inputPath - Input file path
     * @param {string} outputPath - Output file path
     */
    async compressFile(inputPath, outputPath) {
        const sourceStream = fs.createReadStream(inputPath);
        const gzipStream = zlib.createGzip();
        const destinationStream = fs.createWriteStream(outputPath);

        await pipe(sourceStream, gzipStream, destinationStream);
    }
}

module.exports = RecordingManager;
