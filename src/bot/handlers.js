"use strict";

const { Markup } = require("telegraf");

const ACTIONS = {
  POST_NOW: "chunk:post_now",
  SCHEDULE: "chunk:schedule",
  CANCEL: "chunk:cancel",
};

const readyKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("Post now", ACTIONS.POST_NOW)],
  [Markup.button.callback("Schedule", ACTIONS.SCHEDULE)],
  [Markup.button.callback("Cancel", ACTIONS.CANCEL)],
]);

function sendOrderError(ctx, service) {
  service.resetChunk(ctx.session);
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
    chunkService.resetChunk(ctx.session);
    ctx.reply("Current chunk canceled.");
  });

  // /post
  bot.command("post", async (ctx) => {
    const result = await chunkService.postChunk(ctx.chat.id, ctx.session);
    ctx.reply(result.message);
  });

  // /schedule
  bot.command("schedule", (ctx) => {
    const chatId = ctx.chat.id;
    const scheduleInput = ctx.message.text.replace("/schedule", "").trim();

    // Mode 1: /schedule with no arguments → ask for date
    if (!scheduleInput) {
      const chunk = chunkService.getChunk(ctx.session);

      if (!chunk || chunk.step !== 3) {
        return ctx.reply(
          "No complete chunk to schedule. Please send photo, audio, and voice in order."
        );
      }

      chunkService.requestScheduleInput(ctx.session);

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

    const result = chunkService.scheduleChunk(chatId, ctx.session, scheduledAt);
    return ctx.reply(result.message);
  });

  // Photo
  bot.on("photo", (ctx) => {
    const chatId = ctx.chat.id;
    const current = chunkService.getChunk(ctx.session);

    if (current) {
      return sendOrderError(ctx, chunkService);
    }

    const photoSizes = ctx.message.photo;
    const largestPhoto = photoSizes[photoSizes.length - 1];

    chunkService.startChunk(ctx.session, largestPhoto, ctx.message.caption);
    ctx.reply("Photo received. Please send the audio file with its caption.");
  });

  // Audio
  bot.on("audio", (ctx) => {
    const chatId = ctx.chat.id;
    const current = chunkService.getChunk(ctx.session);

    if (!current || current.step !== 1) {
      return sendOrderError(ctx, chunkService);
    }

    chunkService.addAudio(ctx.session, ctx.message.audio, ctx.message.caption);
    ctx.reply("Audio received. Please send the voice message.");
  });

  // Voice
  bot.on("voice", (ctx) => {
    const chatId = ctx.chat.id;
    const current = chunkService.getChunk(ctx.session);

    if (!current || current.step !== 2) {
      return sendOrderError(ctx, chunkService);
    }

    chunkService.addVoice(ctx.session, ctx.message.voice, ctx.message.caption);
    ctx.reply(
      "Chunk ready. Send /post to publish to the channel, /schedule DD/MM/YYYY HH:MM to delay posting, or /schedule to enter the date in the next message. Use /cancel to discard.",
      readyKeyboard
    );
  });

  // Text handler used for the second step of scheduling
  bot.on("text", (ctx, next) => {
    const chatId = ctx.chat.id;

    if (!chunkService.isWaitingForSchedule(ctx.session)) {
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
    chunkService.clearScheduleRequest(ctx.session);
    const result = chunkService.scheduleChunk(chatId, ctx.session, scheduledAt);
    return ctx.reply(result.message);
  });

  bot.action(ACTIONS.POST_NOW, async (ctx) => {
    const result = await chunkService.postChunk(ctx.chat.id, ctx.session);
    await ctx.answerCbQuery(result.message, { show_alert: !result.success });
    if (result.success) {
      await ctx.reply("Chunk posted.");
    }
  });

  bot.action(ACTIONS.SCHEDULE, async (ctx) => {
    const chunk = chunkService.getChunk(ctx.session);

    if (!chunk || chunk.step !== 3) {
      await ctx.answerCbQuery("No complete chunk to schedule", { show_alert: true });
      return;
    }

    chunkService.requestScheduleInput(ctx.session);
    await ctx.answerCbQuery();
    await ctx.reply(
      "Please provide the date/time for this chunk in the format DD/MM/YYYY HH:MM (time is optional). Example: 17/02/2025 09:30"
    );
  });

  bot.action(ACTIONS.CANCEL, async (ctx) => {
    chunkService.resetChunk(ctx.session);
    await ctx.answerCbQuery("Chunk canceled");
    await ctx.reply("Current chunk canceled.");
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
