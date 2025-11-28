'use strict';

const { Telegraf, session } = require('telegraf');
const { registerChunkHandlers } = require('./bot/handlers');
const ChunkService = require('./services/chunkService');
const ChunkRepository = require('./repositories/chunkRepository');
const Database = require('./infrastructure/sqlite');
const { createRedisClient, RedisSessionStore } = require('./infrastructure/redis');
const environment = require('./config/environment');

async function createApp() {
  const config = environment.load();
  const bot = new Telegraf(config.botToken);
  const redis = await createRedisClient(config.redisUrl);
  const db = new Database(config.databasePath);
  const repository = new ChunkRepository(db);
  const service = new ChunkService({ repository, bot, channelId: config.channelId });

  bot.use(
    session({
      store: new RedisSessionStore(redis),
      defaultSession: () => ({ chunk: null, waitingForSchedule: false }),
    })
  );

  registerChunkHandlers(bot, service);

  setInterval(() => {
    service.postDueScheduled().catch((error) => {
      console.error('Error while posting scheduled chunks', error);
    });
  }, 30 * 1000);

  return { bot, redis };
}

module.exports = { createApp };
