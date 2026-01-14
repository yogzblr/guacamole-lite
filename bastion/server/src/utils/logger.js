/**
 * Simple logging utility
 */

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    VERBOSE: 4
};

class Logger {
    constructor(level = 'INFO') {
        this.level = LOG_LEVELS[level] || LOG_LEVELS.INFO;
    }

    error(message, ...args) {
        if (this.level >= LOG_LEVELS.ERROR) {
            console.error(`[ERROR] ${new Date().toISOString()}:`, message, ...args);
        }
    }

    warn(message, ...args) {
        if (this.level >= LOG_LEVELS.WARN) {
            console.warn(`[WARN] ${new Date().toISOString()}:`, message, ...args);
        }
    }

    info(message, ...args) {
        if (this.level >= LOG_LEVELS.INFO) {
            console.info(`[INFO] ${new Date().toISOString()}:`, message, ...args);
        }
    }

    debug(message, ...args) {
        if (this.level >= LOG_LEVELS.DEBUG) {
            console.debug(`[DEBUG] ${new Date().toISOString()}:`, message, ...args);
        }
    }

    verbose(message, ...args) {
        if (this.level >= LOG_LEVELS.VERBOSE) {
            console.log(`[VERBOSE] ${new Date().toISOString()}:`, message, ...args);
        }
    }
}

module.exports = Logger;
