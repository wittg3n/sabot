'use strict';

const { Telegraf } = require('telegraf');
const { registerChunkHandlers } = require('./bot/handlers');
const ChunkService = require('./services/chunkService');
const ChunkRepository = require('./repositories/chunkRepository');
const Database = require('./infrastructure/sqlite');
const environment = require('./config/environment');

function createApp() {
  const config = environment.load();
  const bot = new Telegraf(config.botToken);
  const db = new Database(config.databasePath);
  const repository = new ChunkRepository(db);
  const service = new ChunkService({ repository, bot, channelId: config.channelId });

  registerChunkHandlers(bot, service);

  setInterval(() => {
    service.postDueScheduled().catch((error) => {
      console.error('Error while posting scheduled chunks', error);
    });
  }, 30 * 1000);

  return { bot };
}

module.exports = { createApp };
