'use strict';

const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');

const logDirectory = process.env.LOG_DIRECTORY || path.join(__dirname, '..', 'logs');
const logLevel = process.env.LOG_LEVEL || 'info';

fs.promises
  .mkdir(logDirectory, { recursive: true })
  .catch((error) => console.error('Failed to ensure log directory', error));

const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.File({
      filename: path.join(logDirectory, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new transports.File({
      filename: path.join(logDirectory, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, stack, ...meta }) => {
          const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}]: ${stack || message}${metaString}`;
        })
      ),
    })
  );
}

module.exports = logger;
