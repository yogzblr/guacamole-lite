#!/usr/bin/env node

/**
 * Guacamole Bastion Server
 *
 * Production-ready bastion server with:
 * - Session recording to S3/MinIO
 * - HTTP file upload/download
 * - Token-based authentication
 * - WebSocket tunneling to guacd
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const GuacamoleLite = require('guacamole-lite');

// Import custom modules
const CryptoManager = require('./utils/crypto');
const Logger = require('./utils/logger');
const S3Manager = require('./utils/s3');
const RecordingManager = require('./guacamole/recording');
const FileTransferManager = require('./guacamole/fileTransfer');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// --- Configuration -----------------------------------------------------------

const PORT = process.env.PORT || 8080;
const SECRET_KEY = process.env.SECRET_KEY || 'MySuperSecretKeyForParamsToken12';
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';

const logger = new Logger(LOG_LEVEL);

// Initialize utilities
const cryptoManager = new CryptoManager(SECRET_KEY);

const s3Manager = new S3Manager({
    endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
    bucket: process.env.S3_BUCKET || 'guacamole-recordings',
    path: process.env.RECORDING_PATH || 'recordings/',
    s3ForcePathStyle: true
});

const recordingManager = new RecordingManager(s3Manager, logger);
const fileTransferManager = new FileTransferManager(logger);

// --- Express Setup -----------------------------------------------------------

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- File Transfer Endpoints -------------------------------------------------

/**
 * File Upload: POST /api/tunnels/:tunnelId/streams/:streamIndex/:filename
 * Upload file from browser to remote desktop via guacd
 */
app.post('/api/tunnels/:tunnelId/streams/:streamIndex/:filename',
    fileTransferManager.getUploadMiddleware(),
    async (req, res) => {
        await fileTransferManager.handleFileUpload(req, res, guacServer);
    }
);

/**
 * File Download: GET /api/tunnels/:tunnelId/streams/:streamIndex/:filename
 * Download file from remote desktop via guacd to browser
 */
app.get('/api/tunnels/:tunnelId/streams/:streamIndex/:filename',
    async (req, res) => {
        await fileTransferManager.handleFileDownload(req, res, guacServer);
    }
);

// --- Error Handlers ----------------------------------------------------------

app.use(notFoundHandler);
app.use(errorHandler);

// --- Guacamole Setup ---------------------------------------------------------

const guacdOptions = {
    host: process.env.GUACD_HOST || '127.0.0.1',
    port: parseInt(process.env.GUACD_PORT || '4822')
};

const clientOptions = {
    log: {
        level: LOG_LEVEL
    },

    crypt: {
        cypher: 'AES-256-CBC',
        key: SECRET_KEY
    },

    // Default settings for all connections
    connectionDefaultSettings: {
        rdp: {
            'create-drive-path': true,
            'security': 'any',
            'ignore-cert': true,
            'enable-wallpaper': false,
            'create-recording-path': true
        },
        ssh: {
            'enable-sftp': true,
            'sftp-root-directory': '/home'
        },
        vnc: {
            'swap-red-blue': false,
            'color-depth': 24
        }
    }
};

const callbacks = {
    /**
     * Process connection settings before connecting to guacd
     * - Validate token
     * - Setup recording
     * - Apply dynamic configuration
     */
    processConnectionSettings: function (settings, callback) {
        try {
            logger.info('Processing connection settings');

            // Token expiration check (if provided)
            if (settings.expiration && settings.expiration < Date.now()) {
                logger.error('Connection rejected: Token expired');
                return callback(new Error('Token expired'));
            }

            // Generate connection ID
            const connectionId = generateConnectionId();
            settings.connectionId = connectionId;

            // Setup recording
            if (process.env.RECORDING_ENABLED === 'true') {
                recordingManager.setupRecording(settings, connectionId);
            }

            logger.info(`Connection settings processed for connection: ${connectionId}`);
            callback(null, settings);

        } catch (error) {
            logger.error('Error processing connection settings:', error);
            callback(error);
        }
    }
};

// Initialize GuacamoleLite server
const guacServer = new GuacamoleLite(
    { server },
    guacdOptions,
    clientOptions,
    callbacks
);

// --- Guacamole Event Handlers ------------------------------------------------

guacServer.on('open', (clientConnection) => {
    logger.info(`Connection opened: ${clientConnection.connectionId}`);
});

guacServer.on('close', async (clientConnection, error) => {
    if (error) {
        logger.error(`Connection closed with error: ${clientConnection.connectionId}`, error);
    } else {
        logger.info(`Connection closed: ${clientConnection.connectionId}`);
    }

    // Upload recording if enabled
    if (process.env.RECORDING_ENABLED === 'true' && clientConnection.connectionSettings) {
        try {
            await recordingManager.uploadRecording(
                clientConnection.connectionSettings,
                clientConnection.connectionId
            );
        } catch (error) {
            logger.error('Failed to upload recording:', error);
        }
    }
});

guacServer.on('error', (clientConnection, error) => {
    logger.error('Guacamole server error:', error);
    if (clientConnection) {
        logger.error(`Connection ID: ${clientConnection.connectionId}`);
    }
});

// --- Helper Functions --------------------------------------------------------

/**
 * Generate unique connection ID
 */
function generateConnectionId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// --- Graceful Shutdown -------------------------------------------------------

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
    logger.info('Received shutdown signal, shutting down gracefully...');

    // Stop accepting new connections
    server.close(() => {
        logger.info('HTTP server closed');
    });

    guacServer.webSocketServer.close(() => {
        logger.info('WebSocket server closed');
    });

    // Wait for active connections to drain
    const checkInterval = setInterval(() => {
        const count = guacServer.activeConnections ? guacServer.activeConnections.size : 0;
        if (count === 0) {
            logger.info('All connections closed. Exiting.');
            clearInterval(checkInterval);
            process.exit(0);
        } else {
            logger.info(`Waiting for ${count} active connections to close...`);
        }
    }, 1000);

    // Force exit after 30 seconds
    setTimeout(() => {
        logger.warn('Forcing exit after timeout');
        process.exit(1);
    }, 30000);
}

// --- Start Server ------------------------------------------------------------

server.listen(PORT, () => {
    logger.info(`Guacamole Bastion Server started on port ${PORT}`);
    logger.info(`guacd: ${guacdOptions.host}:${guacdOptions.port}`);
    logger.info(`S3 Endpoint: ${process.env.S3_ENDPOINT || 'http://minio:9000'}`);
    logger.info(`Recording: ${process.env.RECORDING_ENABLED === 'true' ? 'enabled' : 'disabled'}`);
});

module.exports = { app, server, guacServer };
