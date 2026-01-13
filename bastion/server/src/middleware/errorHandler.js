/**
 * Express error handling middleware
 */

const logger = require('../utils/logger');

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
    const errorLogger = new logger('ERROR');

    errorLogger.error('Express error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    });

    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV !== 'production';

    res.status(err.statusCode || 500).json({
        error: {
            message: isDevelopment ? err.message : 'Internal server error',
            ...(isDevelopment && { stack: err.stack })
        }
    });
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        error: {
            message: 'Not found',
            path: req.url
        }
    });
}

module.exports = {
    errorHandler,
    notFoundHandler
};
