'use strict';

const { createApp } = require('./src/app');

const { bot, stop } = createApp();

bot.launch().then(() => {
  console.log('Bot started');
});

process.once('SIGINT', () => {
  stop();
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  stop();
  bot.stop('SIGTERM');
});
