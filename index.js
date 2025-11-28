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
const scheduledChunks = [];

function resetChunk(chatId) {
  db.prepare('DELETE FROM chunks WHERE chat_id = ?').run(chatId);
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

async function sendChunkToChannel(chunk) {
  await bot.telegram.sendPhoto(CHANNEL_ID, chunk.photo.fileId, {
    caption: chunk.photo.caption,
  });

  await bot.telegram.sendAudio(CHANNEL_ID, chunk.audio.fileId, {
    caption: chunk.audio.caption,
  });

  await bot.telegram.sendVoice(CHANNEL_ID, chunk.voice.fileId, {
    caption: chunk.voice.caption || undefined,
  });
}

async function postChunkToChannel(chatId, ctx) {
  const chunk = getChunk(chatId);
  if (!chunk || chunk.step !== 3) {
    await ctx.reply(
      "No complete chunk to post. Please send photo, audio, and voice in order."
    );
    return;
  }

  try {
    await sendChunkToChannel(chunk);

    console.log(`Chunk posted for chat ${chatId}`);
    resetChunk(chatId);
    await ctx.reply("Posted to channel ✅");
  } catch (error) {
    console.error("Failed to post chunk", error);
    await ctx.reply("Failed to post to channel. Please try again.");
  }
}

function parseScheduleInput(input) {
  if (!input) {
    return null;
  }

  const [datePart, timePart = "00:00"] = input.trim().split(/\s+/);
  const [day, month, year] = (datePart || "").split("/").map(Number);
  const [hour, minute = 0] = (timePart || "").split(":").map(Number);

  if (!day || !month || !year || Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  const scheduledAt = new Date(year, month - 1, day, hour, minute);

  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  return scheduledAt;
}

function scheduleChunkForRelease(chatId, chunk, scheduledAt, ctx) {
  scheduledChunks.push({ chatId, chunk, scheduledAt });
  resetChunk(chatId);
  ctx.reply(`Chunk scheduled for ${scheduledAt.toLocaleString()}.`);
  console.log(
    `Chunk scheduled for chat ${chatId} at ${scheduledAt.toISOString()}`
  );
}

async function postDueScheduledChunks() {
  const now = new Date();

  for (let i = scheduledChunks.length - 1; i >= 0; i -= 1) {
    const scheduled = scheduledChunks[i];

    if (scheduled.scheduledAt <= now) {
      scheduledChunks.splice(i, 1);

      try {
        await sendChunkToChannel(scheduled.chunk);
        console.log(`Scheduled chunk posted for chat ${scheduled.chatId}`);
        await bot.telegram.sendMessage(
          scheduled.chatId,
          `Scheduled chunk posted to channel at ${new Date().toLocaleString()}.`
        );
      } catch (error) {
        console.error("Failed to post scheduled chunk", error);
        await bot.telegram.sendMessage(
          scheduled.chatId,
          "Failed to post your scheduled chunk. Please try scheduling again."
        );
      }
    }
  }
}

function parseScheduleInput(input) {
  if (!input) {
    return null;
  }

  const [datePart, timePart = '00:00'] = input.trim().split(/\s+/);
  const [day, month, year] = (datePart || '').split('/').map(Number);
  const [hour, minute = 0] = (timePart || '').split(':').map(Number);

  if (!day || !month || !year || Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  const scheduledAt = new Date(year, month - 1, day, hour, minute);

  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  return scheduledAt;
}

function scheduleChunkForRelease(chatId, chunk, scheduledAt, ctx) {
  db.prepare(
    `INSERT INTO scheduled_chunks (
      chat_id,
      scheduled_at,
      photo_file_id,
      photo_caption,
      audio_file_id,
      audio_caption,
      voice_file_id,
      voice_caption
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    chatId,
    scheduledAt.getTime(),
    chunk.photo_file_id,
    chunk.photo_caption,
    chunk.audio_file_id,
    chunk.audio_caption,
    chunk.voice_file_id,
    chunk.voice_caption,
  );

  resetChunk(chatId);
  ctx.reply(`Chunk scheduled for ${scheduledAt.toLocaleString()}.`);
  console.log(`Chunk scheduled for chat ${chatId} at ${scheduledAt.toISOString()}`);
}

async function postDueScheduledChunks() {
  const now = new Date();
  const dueChunks = db
    .prepare('SELECT * FROM scheduled_chunks WHERE scheduled_at <= ? ORDER BY scheduled_at ASC')
    .all(now.getTime());

  dueChunks.forEach(async (scheduled) => {
    try {
      await sendChunkToChannel(scheduled);
      db.prepare('DELETE FROM scheduled_chunks WHERE id = ?').run(scheduled.id);
      console.log(`Scheduled chunk posted for chat ${scheduled.chat_id}`);
      await bot.telegram.sendMessage(
        scheduled.chat_id,
        `Scheduled chunk posted to channel at ${new Date().toLocaleString()}.`,
      );
    } catch (error) {
      console.error('Failed to post scheduled chunk', error);
      await bot.telegram.sendMessage(
        scheduled.chat_id,
        'Failed to post your scheduled chunk. Please try scheduling again.',
      );
    }
  });
}

function sendOrderError(ctx) {
  resetChunk(ctx.chat.id);
  return ctx.reply(
    "Unexpected message type or order. Chunk has been reset. Please start again with a photo (with caption)."
  );
}

bot.start((ctx) => {
  ctx.reply(
    "Send a photo with caption, then an audio with caption, then a voice message. Use /post to publish immediately, /schedule <DD/MM/YYYY HH:MM> to schedule, or /cancel to discard the current chunk."
  );
});

bot.command("cancel", (ctx) => {
  resetChunk(ctx.chat.id);
  ctx.reply("Current chunk canceled.");
});

bot.command("post", (ctx) => postChunkToChannel(ctx.chat.id, ctx));

bot.command("schedule", (ctx) => {
  const chatId = ctx.chat.id;
  const chunk = chunks[chatId];

  if (!chunk || chunk.step !== 3) {
    return ctx.reply(
      "No complete chunk to schedule. Please send photo, audio, and voice in order."
    );
  }

  const scheduleInput = ctx.message.text.replace("/schedule", "").trim();
  const scheduledAt = parseScheduleInput(scheduleInput);

  if (!scheduledAt) {
    return ctx.reply(
      "Please provide a valid date/time in the format DD/MM/YYYY HH:MM (time is optional). Example: 17/02/2025 09:30"
    );
  }

  if (scheduledAt <= new Date()) {
    return ctx.reply("Scheduled time must be in the future.");
  }

  scheduleChunkForRelease(chatId, chunk, scheduledAt, ctx);
  return null;
});

bot.on("photo", (ctx) => {
  const chatId = ctx.chat.id;
  const current = getChunk(chatId);

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
  const current = getChunk(chatId);

  if (!current || current.step !== 1) {
    return sendOrderError(ctx);
  }

  addAudioToChunk(chatId, ctx.message.audio, ctx.message.caption);
  ctx.reply("Audio received. Please send the voice message.");
});

bot.on("voice", (ctx) => {
  const chatId = ctx.chat.id;
  const current = getChunk(chatId);

  if (!current || current.step !== 2) {
    return sendOrderError(ctx);
  }

  addVoiceToChunk(chatId, ctx.message.voice, ctx.message.caption);
  ctx.reply(
    "Chunk ready. Send /post to publish to the channel, /schedule <DD/MM/YYYY HH:MM> to delay posting, or /cancel to discard."
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

setInterval(() => {
  postDueScheduledChunks().catch((error) => {
    console.error("Error while posting scheduled chunks", error);
  });
}, 30 * 1000);

bot.launch().then(() => {
  console.log("Bot started");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
