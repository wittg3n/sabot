
const winston = require('winston');
const path = require('path');


const logDir = path.join(__dirname, '../logs');
const fs = require('fs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            handleExceptions: true
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log')
        })
    ],
    exitOnError: false,
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception thrown:', error);
});

module.exports = logger;
