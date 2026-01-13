/**
 * HTTP File Transfer Handler
 * Implements file upload/download via HTTP endpoints synchronized with guacd streams
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads (store in memory or temp directory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 * 1024 // 100GB max file size
    }
});

class FileTransferManager {
    constructor(logger) {
        this.logger = logger;
        this.downloadStreams = new Map(); // Map of streamIndex -> {response, chunks}
        this.CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks
    }

    /**
     * Get multer upload middleware
     */
    getUploadMiddleware() {
        return upload.single('file');
    }

    /**
     * Handle file upload from browser to guacd
     * @param {object} req - Express request
     * @param {object} res - Express response
     * @param {object} guacServer - GuacamoleLite server instance
     */
    async handleFileUpload(req, res, guacServer) {
        const { tunnelId, streamIndex, filename } = req.params;

        try {
            // Find the client connection
            const clientConnection = this.findConnection(guacServer, tunnelId);
            if (!clientConnection) {
                return res.status(404).json({ error: 'Connection not found' });
            }

            // Get file from multer
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            this.logger.info(`File upload started: ${filename} (${req.file.size} bytes) for tunnel ${tunnelId}, stream ${streamIndex}`);

            // Get file buffer
            const fileBuffer = req.file.buffer;
            const totalSize = fileBuffer.length;

            // Send file in chunks as blob instructions
            let offset = 0;
            let chunkIndex = 0;

            while (offset < totalSize) {
                const chunkSize = Math.min(this.CHUNK_SIZE, totalSize - offset);
                const chunk = fileBuffer.slice(offset, offset + chunkSize);
                const base64Chunk = chunk.toString('base64');

                // Send blob instruction to guacd
                // Format: blob,<stream-index>,<base64-data>
                const blobInstruction = `4.blob,${streamIndex.length}.${streamIndex},${base64Chunk.length}.${base64Chunk};`;

                // Send instruction through the tunnel
                this.sendToGuacd(clientConnection, blobInstruction);

                this.logger.debug(`Sent chunk ${chunkIndex} (${chunkSize} bytes) for stream ${streamIndex}`);

                offset += chunkSize;
                chunkIndex++;
            }

            // Send end instruction
            const endInstruction = `3.end,${streamIndex.length}.${streamIndex};`;
            this.sendToGuacd(clientConnection, endInstruction);

            this.logger.info(`File upload completed: ${filename} (${chunkIndex} chunks)`);

            res.status(200).json({
                success: true,
                filename: filename,
                size: totalSize,
                chunks: chunkIndex
            });

        } catch (error) {
            this.logger.error('File upload error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * Handle file download from guacd to browser
     * @param {object} req - Express request
     * @param {object} res - Express response
     * @param {object} guacServer - GuacamoleLite server instance
     */
    async handleFileDownload(req, res, guacServer) {
        const { tunnelId, streamIndex, filename } = req.params;

        try {
            // Find the client connection
            const clientConnection = this.findConnection(guacServer, tunnelId);
            if (!clientConnection) {
                return res.status(404).json({ error: 'Connection not found' });
            }

            this.logger.info(`File download started: ${filename} for tunnel ${tunnelId}, stream ${streamIndex}`);

            // Set response headers
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
            res.setHeader('Transfer-Encoding', 'chunked');

            // Register download stream
            this.downloadStreams.set(streamIndex, {
                response: res,
                chunks: [],
                filename: filename
            });

            // Send ACK to guacd to start receiving blob instructions
            const ackInstruction = `3.ack,${streamIndex.length}.${streamIndex},2.OK,0.0;`;
            this.sendToGuacd(clientConnection, ackInstruction);

            this.logger.debug(`Sent ACK for stream ${streamIndex}`);

            // The blob instructions will be captured by interceptBlobInstruction
            // and streamed to the HTTP response

        } catch (error) {
            this.logger.error('File download error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            }
        }
    }

    /**
     * Intercept blob instructions from guacd for downloads
     * This should be called from the guacamole message handler
     * @param {string} streamIndex - Stream index
     * @param {string} base64Data - Base64 encoded data
     */
    interceptBlobInstruction(streamIndex, base64Data) {
        const downloadStream = this.downloadStreams.get(streamIndex);

        if (downloadStream) {
            try {
                // Decode base64 data
                const chunk = Buffer.from(base64Data, 'base64');

                // Write chunk to HTTP response
                downloadStream.response.write(chunk);

                this.logger.debug(`Streamed chunk (${chunk.length} bytes) for stream ${streamIndex}`);

            } catch (error) {
                this.logger.error('Error streaming chunk:', error);
                this.endDownloadStream(streamIndex, error);
            }
        }
    }

    /**
     * End a download stream
     * @param {string} streamIndex - Stream index
     * @param {Error} error - Optional error
     */
    endDownloadStream(streamIndex, error = null) {
        const downloadStream = this.downloadStreams.get(streamIndex);

        if (downloadStream) {
            if (error) {
                this.logger.error(`Download stream ${streamIndex} ended with error:`, error);
                if (!downloadStream.response.headersSent) {
                    downloadStream.response.status(500).json({ error: error.message });
                } else {
                    downloadStream.response.end();
                }
            } else {
                this.logger.info(`Download stream ${streamIndex} completed: ${downloadStream.filename}`);
                downloadStream.response.end();
            }

            this.downloadStreams.delete(streamIndex);
        }
    }

    /**
     * Find a client connection by tunnel ID
     * @param {object} guacServer - GuacamoleLite server instance
     * @param {string} tunnelId - Tunnel/connection ID
     * @returns {object|null} Client connection
     */
    findConnection(guacServer, tunnelId) {
        // The guacamole-lite server maintains activeConnections as a Map
        if (guacServer.activeConnections) {
            return guacServer.activeConnections.get(tunnelId);
        }

        // Alternative: iterate through connections
        for (const [id, connection] of guacServer.activeConnections || []) {
            if (id === tunnelId || connection.connectionId === tunnelId) {
                return connection;
            }
        }

        return null;
    }

    /**
     * Send instruction to guacd through client connection
     * @param {object} clientConnection - Client connection
     * @param {string} instruction - Guacamole protocol instruction
     */
    sendToGuacd(clientConnection, instruction) {
        if (clientConnection && clientConnection.guacdConnection) {
            clientConnection.guacdConnection.send(instruction);
        } else {
            throw new Error('Client connection or guacd connection not available');
        }
    }
}

module.exports = FileTransferManager;
