"use strict";

require("dotenv").config();
const { Telegraf } = require("telegraf");

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
console.log(CHANNEL_ID);
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is required in environment variables");
}

if (!CHANNEL_ID) {
  throw new Error("CHANNEL_ID is required in environment variables");
}

const bot = new Telegraf(BOT_TOKEN);
const chunks = {};

function resetChunk(chatId) {
  delete chunks[chatId];
}

function startNewChunk(chatId, photo, caption) {
  chunks[chatId] = {
    step: 1, // expecting audio next
    photo: { fileId: photo.file_id, caption: caption || "" },
    audio: null,
    voice: null,
  };
  console.log(`Chunk started for chat ${chatId}`);
}

function addAudioToChunk(chatId, audio, caption) {
  const chunk = chunks[chatId];
  chunk.audio = { fileId: audio.file_id, caption: caption || "" };
  chunk.step = 2; // expecting voice next
}

function addVoiceToChunk(chatId, voice, caption) {
  const chunk = chunks[chatId];
  chunk.voice = { fileId: voice.file_id, caption: caption || "" };
  chunk.step = 3; // ready to post
  console.log(`Chunk completed for chat ${chatId}`);
}

async function postChunkToChannel(chatId, ctx) {
  const chunk = chunks[chatId];
  if (!chunk || chunk.step !== 3) {
    await ctx.reply(
      "No complete chunk to post. Please send photo, audio, and voice in order."
    );
    return;
  }

  try {
    await bot.telegram.sendPhoto(CHANNEL_ID, chunk.photo.fileId, {
      caption: chunk.photo.caption,
    });

    await bot.telegram.sendAudio(CHANNEL_ID, chunk.audio.fileId, {
      caption: chunk.audio.caption,
    });

    await bot.telegram.sendVoice(CHANNEL_ID, chunk.voice.fileId, {
      caption: chunk.voice.caption || undefined,
    });

    console.log(`Chunk posted for chat ${chatId}`);
    resetChunk(chatId);
    await ctx.reply("Posted to channel ✅");
  } catch (error) {
    console.error("Failed to post chunk", error);
    await ctx.reply("Failed to post to channel. Please try again.");
  }
}

function sendOrderError(ctx) {
  resetChunk(ctx.chat.id);
  return ctx.reply(
    "Unexpected message type or order. Chunk has been reset. Please start again with a photo (with caption)."
  );
}

bot.start((ctx) => {
  ctx.reply(
    "Send a photo with caption, then an audio with caption, then a voice message. Use /post to publish the completed chunk or /cancel to discard it."
  );
});

bot.command("cancel", (ctx) => {
  resetChunk(ctx.chat.id);
  ctx.reply("Current chunk canceled.");
});

bot.command("post", (ctx) => postChunkToChannel(ctx.chat.id, ctx));

bot.on("photo", (ctx) => {
  const chatId = ctx.chat.id;
  const current = chunks[chatId];

  if (current) {
    return sendOrderError(ctx);
  }

  const photoSizes = ctx.message.photo;
  const largestPhoto = photoSizes[photoSizes.length - 1];
  startNewChunk(chatId, largestPhoto, ctx.message.caption);
  ctx.reply("Photo received. Please send the audio file with its caption.");
});

bot.on("audio", (ctx) => {
  const chatId = ctx.chat.id;
  const current = chunks[chatId];

  if (!current || current.step !== 1) {
    return sendOrderError(ctx);
  }

  addAudioToChunk(chatId, ctx.message.audio, ctx.message.caption);
  ctx.reply("Audio received. Please send the voice message.");
});

bot.on("voice", (ctx) => {
  const chatId = ctx.chat.id;
  const current = chunks[chatId];

  if (!current || current.step !== 2) {
    return sendOrderError(ctx);
  }

  addVoiceToChunk(chatId, ctx.message.voice, ctx.message.caption);
  ctx.reply(
    "Chunk ready. Send /post to publish to the channel or /cancel to discard."
  );
});

bot.on("message", (ctx, next) => {
  if (ctx.message.photo || ctx.message.audio || ctx.message.voice) {
    return next();
  }

  return ctx.reply(
    "Unsupported message type. Please send a photo with caption, followed by audio with caption, then a voice message."
  );
});

bot.launch().then(() => {
  console.log("Bot started");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
