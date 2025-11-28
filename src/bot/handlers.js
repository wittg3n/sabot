"use strict";

function sendOrderError(ctx, service) {
  service.resetChunk(ctx.chat.id);
  return ctx.reply(
    "Unexpected message type or order. Chunk has been reset. Please start again with a photo (with caption)."
  );
}

function registerChunkHandlers(bot, chunkService) {
  // /start
  bot.start((ctx) => {
    ctx.reply(
      [
        "Send a photo with caption, then an audio with caption, then a voice message.",
        "",
        "Commands:",
        "• /post – publish immediately to the channel",
        "• /schedule DD/MM/YYYY HH:MM – schedule in one step",
        "• /schedule – then send the date/time in the next message",
        "• /cancel – discard the current chunk",
      ].join("\n")
    );
  });

  // /cancel
  bot.command("cancel", (ctx) => {
    const chatId = ctx.chat.id;
    chunkService.resetChunk(chatId);
    ctx.reply("Current chunk canceled.");
  });

  // /post
  bot.command("post", async (ctx) => {
    const result = await chunkService.postChunk(ctx.chat.id);
    ctx.reply(result.message);
  });

  // /schedule
  bot.command("schedule", (ctx) => {
    const chatId = ctx.chat.id;
    const scheduleInput = ctx.message.text.replace("/schedule", "").trim();

    // Mode 1: /schedule with no arguments → ask for date
    if (!scheduleInput) {
      const chunk = chunkService.getChunk(chatId);

      if (!chunk || chunk.step !== 3) {
        return ctx.reply(
          "No complete chunk to schedule. Please send photo, audio, and voice in order."
        );
      }

      chunkService.requestScheduleInput(chatId);

      return ctx.reply(
        "Please provide the date/time for this chunk in the format DD/MM/YYYY HH:MM (time is optional). Example: 17/02/2025 09:30"
      );
    }

    // Mode 2: /schedule 28/11/2025 19:09
    const scheduledAt = chunkService.parseScheduleInput(scheduleInput);

    if (!scheduledAt) {
      return ctx.reply(
        "Please provide a valid date/time in the format DD/MM/YYYY HH:MM (time is optional). Example: 17/02/2025 09:30"
      );
    }

    if (scheduledAt <= new Date()) {
      return ctx.reply("Scheduled time must be in the future.");
    }

    const result = chunkService.scheduleChunk(chatId, scheduledAt);
    return ctx.reply(result.message);
  });

  // Photo
  bot.on("photo", (ctx) => {
    const chatId = ctx.chat.id;
    const current = chunkService.getChunk(chatId);

    if (current) {
      return sendOrderError(ctx, chunkService);
    }

    const photoSizes = ctx.message.photo;
    const largestPhoto = photoSizes[photoSizes.length - 1];

    chunkService.startChunk(chatId, largestPhoto, ctx.message.caption);
    ctx.reply("Photo received. Please send the audio file with its caption.");
  });

  // Audio
  bot.on("audio", (ctx) => {
    const chatId = ctx.chat.id;
    const current = chunkService.getChunk(chatId);

    if (!current || current.step !== 1) {
      return sendOrderError(ctx, chunkService);
    }

    chunkService.addAudio(chatId, ctx.message.audio, ctx.message.caption);
    ctx.reply("Audio received. Please send the voice message.");
  });

  // Voice
  bot.on("voice", (ctx) => {
    const chatId = ctx.chat.id;
    const current = chunkService.getChunk(chatId);

    if (!current || current.step !== 2) {
      return sendOrderError(ctx, chunkService);
    }

    chunkService.addVoice(chatId, ctx.message.voice, ctx.message.caption);
    ctx.reply(
      "Chunk ready. Send /post to publish to the channel, /schedule DD/MM/YYYY HH:MM to delay posting, or /schedule to enter the date in the next message. Use /cancel to discard."
    );
  });

  // Text handler used for the second step of scheduling
  bot.on("text", (ctx, next) => {
    const chatId = ctx.chat.id;

    if (!chunkService.isWaitingForSchedule(chatId)) {
      // Not in "waiting for date" mode → continue to other handlers
      return next();
    }

    const scheduledAt = chunkService.parseScheduleInput(ctx.message.text);

    if (!scheduledAt) {
      return ctx.reply(
        "Please provide a valid date/time in the format DD/MM/YYYY HH:MM (time is optional). Example: 17/02/2025 09:30"
      );
    }

    if (scheduledAt <= new Date()) {
      return ctx.reply("Scheduled time must be in the future.");
    }

    // We got a valid date → schedule and clear the pending state
    chunkService.clearScheduleRequest(chatId);
    const result = chunkService.scheduleChunk(chatId, scheduledAt);
    return ctx.reply(result.message);
  });

  // Fallback for any other message types
  bot.on("message", (ctx, next) => {
    // photo/audio/voice are handled above
    if (ctx.message.photo || ctx.message.audio || ctx.message.voice) {
      return next();
    }

    return ctx.reply(
      "Unsupported message type. Please send a photo with caption, followed by audio with caption, then a voice message."
    );
  });
}

module.exports = { registerChunkHandlers };
