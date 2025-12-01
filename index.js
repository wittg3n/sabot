'use strict';

const { createApp } = require('./src/app');
const logger = require('./src/logger');

process.on('unhandledRejection', (reason, promise) => {
  try {
    logger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  } catch (err) {
    console.error('Failed to log unhandledRejection', err);
  }

});

process.on('uncaughtException', (error) => {
  try {
    logger.error('Uncaught Exception', {
      message: error.message,
      stack: error.stack,
    });
  } catch (err) {
    console.error('Failed to log uncaughtException', err);
  }

});

async function main() {
  const { bot } = await createApp();
  await bot.launch();
  logger.info('Bot started and polling is active');
}

main().catch((error) => {
  logger.error('Failed to start bot', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
