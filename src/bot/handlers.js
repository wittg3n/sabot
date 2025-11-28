'use strict';

function sendOrderError(ctx, service) {
  service.resetChunk(ctx.chat.id);
  return ctx.reply('Unexpected message type or order. Chunk has been reset. Please start again with a photo (with caption).');
}

function registerChunkHandlers(bot, chunkService) {
  bot.start((ctx) => {
    const timeInfo = chunkService.getCurrentTimeInfo();
    ctx.reply(
      `Send a photo with caption, then an audio with caption, then a voice message. Use /post to publish immediately, /schedule <DD/MM/YYYY HH:MM[:SS]> to schedule, or /cancel to discard the current chunk. Current bot time: ${timeInfo.formatted}. Times are interpreted in ${timeInfo.offsetLabel}.`,
    );
  });

  bot.command('cancel', (ctx) => {
    chunkService.resetChunk(ctx.chat.id);
    ctx.reply('Current chunk canceled.');
  });

  bot.command('post', async (ctx) => {
    const result = await chunkService.postChunk(ctx.chat.id);
    ctx.reply(result.message);
  });

  bot.command('schedule', (ctx) => {
    const chatId = ctx.chat.id;
    const scheduleInput = ctx.message.text.replace('/schedule', '').trim();
    const scheduledAt = chunkService.parseScheduleInput(scheduleInput);
    const timeInfo = chunkService.getCurrentTimeInfo();

    if (!scheduledAt) {
      return ctx.reply(
        `Please provide a valid date/time in the format DD/MM/YYYY HH:MM[:SS]. Example: 17/02/2025 09:30:00. Current bot time: ${timeInfo.formatted}.`,
      );
    }

    if (scheduledAt <= new Date()) {
      return ctx.reply(`Scheduled time must be in the future. Current bot time: ${timeInfo.formatted}.`);
    }

    const result = chunkService.scheduleChunk(chatId, scheduledAt);
    return ctx.reply(`${result.message} Current bot time: ${timeInfo.formatted}.`);
  });

  bot.on('photo', (ctx) => {
    const chatId = ctx.chat.id;
    const current = chunkService.getChunk(chatId);

    if (current) {
      return sendOrderError(ctx, chunkService);
    }

    const photoSizes = ctx.message.photo;
    const largestPhoto = photoSizes[photoSizes.length - 1];
    chunkService.startChunk(chatId, largestPhoto, ctx.message.caption);
    ctx.reply('Photo received. Please send the audio file with its caption.');
  });

  bot.on('audio', (ctx) => {
    const chatId = ctx.chat.id;
    const current = chunkService.getChunk(chatId);

    if (!current || current.step !== 1) {
      return sendOrderError(ctx, chunkService);
    }

    chunkService.addAudio(chatId, ctx.message.audio, ctx.message.caption);
    ctx.reply('Audio received. Please send the voice message.');
  });

  bot.on('voice', (ctx) => {
    const chatId = ctx.chat.id;
    const current = chunkService.getChunk(chatId);

    if (!current || current.step !== 2) {
      return sendOrderError(ctx, chunkService);
    }

    chunkService.addVoice(chatId, ctx.message.voice, ctx.message.caption);
    const timeInfo = chunkService.getCurrentTimeInfo();
    ctx.reply(
      `Chunk ready. Send /post to publish to the channel, /schedule <DD/MM/YYYY HH:MM[:SS]> to delay posting, or /cancel to discard. Current bot time: ${timeInfo.formatted}. Times are interpreted in ${timeInfo.offsetLabel}.`,
    );
  });

  bot.on('message', (ctx, next) => {
    if (ctx.message.photo || ctx.message.audio || ctx.message.voice) {
      return next();
    }

    return ctx.reply('Unsupported message type. Please send a photo with caption, followed by audio with caption, then a voice message.');
  });
}

module.exports = { registerChunkHandlers };
