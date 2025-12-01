// src/app.js
'use strict';

const { Telegraf, session } = require('telegraf');
const { registerChunkHandlers } = require('./bot/handlers');
const ChunkService = require('./services/chunkService');
const ChunkRepository = require('./repositories/chunkRepository');
const Database = require('./infrastructure/sqlite');
const { createRedisClient, RedisSessionStore } = require('./infrastructure/redis');
const environment = require('./config/environment');
const logger = require('./logger');

async function createApp() {
  const config = environment.load();
  const bot = new Telegraf(config.botToken);
  const redis = await createRedisClient(config.redisUrl);
  const db = new Database(config.databasePath);
  const repository = new ChunkRepository(db);
  const service = new ChunkService({ repository, bot, channelId: config.channelId });

  // هندلر عمومی خطاهای Telegraf
  bot.catch((err, ctx) => {
    try {
      logger.error('Telegraf middleware error', {
        message: err.message,
        stack: err.stack,
        update: ctx.update,
      });
    } catch (logErr) {
      console.error('Logger failed while logging Telegraf error', logErr);
    }

    // تلاش برای پاسخ دوستانه به کاربر، بدون اینکه خود این پاسخ باعث کرش شود
    try {
      if (ctx && ctx.reply) {
        ctx.reply('یه خطای داخلی رخ داد، لطفاً دوباره امتحان کن 🙏');
      }
    } catch (_) {
      // عمداً نادیده می‌گیریم که اینجا دوباره کرش نکنیم
    }
  });

  bot.use(
    session({
      store: new RedisSessionStore(redis),
      defaultSession: () => ({ chunk: null, waitingForSchedule: false }),
    })
  );

  registerChunkHandlers(bot, service);

  // هر ۳۰ ثانیه: ارسال بسته‌های زمان‌بندی‌شده
  setInterval(() => {
    service.postDueScheduled().catch((error) => {
      logger.error('Error while posting scheduled chunks', {
        message: error.message,
        stack: error.stack,
      });
      // اینجا عمداً process.exit نمی‌کنیم تا بات در حال اجرا بماند
    });
  }, 30 * 1000);

  logger.info('Bot initialized', {
    redisUrl: config.redisUrl,
    databasePath: config.databasePath,
  });

  return { bot, redis };
}

module.exports = { createApp };
