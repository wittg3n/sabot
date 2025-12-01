"use strict";

const { Markup } = require("telegraf");
const path = require("path");
const logger = require("../logger");

const {
  convertToOgg,
  getAudioDuration,
} = require("../services/musicConverterService");
const { downloadFile } = require("../services/musicDownloaderService");

const ACTIONS = {
  POST_NOW: "chunk:post_now",
  SCHEDULE: "chunk:schedule",
  CANCEL: "chunk:cancel",
  CONVERT_AUDIO: "chunk:convert_audio",
  SKIP_CONVERT: "chunk:skip_convert",
  VIEW_SCHEDULES: "chunk:view_schedules",
};
var date=new Date();
date.setHours(date.getHours()+3);
date.setMinutes(date.getMinutes()+30);


const readyKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("ارسال فوری 🚀", ACTIONS.POST_NOW)],
  [Markup.button.callback("زمان‌بندی ⏰", ACTIONS.SCHEDULE)],
  [Markup.button.callback("برنامه‌های پیش‌رو 🗓️", ACTIONS.VIEW_SCHEDULES)],
  [Markup.button.callback("لغو ❌", ACTIONS.CANCEL)],
]);

function formatUpcomingSchedules(upcoming) {
  if (!upcoming || upcoming.length === 0) {
    return "upcoming schedules:\nفعلاً بسته زمان‌بندی‌شده‌ای در صف نیست.";
  }

  const lines = upcoming.map((item, index) => {
    const time = new Date(item.scheduled_at).toLocaleString();
    return `${index + 1}. ${time}`;
  });

  return ["upcoming schedules:", ...lines].join("\n");
}

async function replyWithUpcomingSchedules(ctx, chunkService) {
  const upcoming = chunkService.getUpcomingSchedules(ctx.chat.id);
  const message = formatUpcomingSchedules(upcoming);
  await ctx.reply(message);
}

function sendOrderError(ctx, service) {
  service.resetChunk(ctx.session);
  return ctx.reply(
    "نوع پیام یا ترتیب اشتباه بود. بسته ریست شد؛ لطفاً دوباره با ارسال عکس (همراه کپشن) شروع کن."
  );
}

function formatServerTime() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");

  const date = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return `زمان سرور الان: ${date} ${time}`;
}

async function handleQuickSchedule(ctx, chunkService, scheduledAt) {
  const chunk = chunkService.getChunk(ctx.session);

  if (!chunk || chunk.step !== 3) {
    await ctx.answerCbQuery("بسته کامل نیست.", { show_alert: true });
    return;
  }

  if (!scheduledAt || !(scheduledAt instanceof Date) || Number.isNaN(scheduledAt.getTime())) {
    await ctx.answerCbQuery("زمان نامعتبر است.", { show_alert: true });
    return;
  }

  if (scheduledAt <= new Date()) {
    await ctx.answerCbQuery("زمان باید در آینده باشد.", { show_alert: true });
    return;
  }

  const result = chunkService.scheduleChunk(ctx.chat.id, ctx.session, scheduledAt);
  await ctx.answerCbQuery();
  await ctx.reply(result.message);
}

function registerChunkHandlers(bot, chunkService) {
  // /start
bot.start((ctx) => {
  logger.info("Received /start", { chatId: ctx.chat.id, user: ctx.from?.id });
  ctx.reply(
    [
      "سلام! 😊 خوش اومدی به *سابات*.",
      "",
      "اینجا می‌تونی محتوای سه‌مرحله‌ای خودت (عکس، آهنگ، ویس) رو بدون دردسر آماده و برای کانال منتشر کنی.",
      "",
      "*چطور کار می‌کنیم؟*",
      "• عکس همراه کپشن را بفرست.",
      "• فایل صوتی با کپشن را اضافه کن.",
      "• ویس را ارسال کن یا اجازه بده آهنگت تبدیل به ویس شود.",
      "",
      "بعد از کامل شدن بسته، دکمه‌های مدیریت (ارسال فوری، زمان‌بندی و برنامه‌های پیش‌رو) ظاهر می‌شوند تا حرفه‌ای تصمیم بگیری.",
      "",
      "هر وقت آماده‌ای، با ارسال عکس شروع کن. ✨",
    ].join("\n"),
    { parse_mode: "Markdown" }
  );
});

  // /cancel
  bot.command("cancel", (ctx) => {
    const chatId = ctx.chat.id;
    chunkService.resetChunk(ctx.session);
    logger.info("Chunk canceled", { chatId });
    ctx.reply("بسته فعلی لغو شد. اگر خواستی دوباره شروع کنی، از عکس آغاز کن!");
  });

  // /post
  bot.command("post", async (ctx) => {
    const result = await chunkService.postChunk(ctx.chat.id, ctx.session);
    logger.info("Manual post command invoked", { chatId: ctx.chat.id, success: result.success });
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
          "فعلاً بسته کاملی برای زمان‌بندی نداریم. لطفاً به ترتیب عکس، فایل صوتی و ویس را بفرست."
        );
      }

      chunkService.requestScheduleInput(ctx.session);

      return ctx.reply(
        "لطفاً تاریخ و ساعت را با قالب DD/MM/YYYY HH:MM وارد کن (ساعت اختیاری است). مثال: 17/02/2025 09:30"
      ).then(() => replyWithUpcomingSchedules(ctx, chunkService));
    }

    // Mode 2: /schedule 28/11/2025 19:09
    const scheduledAt = chunkService.parseScheduleInput(scheduleInput);

    if (!scheduledAt) {
      return ctx.reply(
        "تاریخ/ساعت درست نیست. قالب باید DD/MM/YYYY HH:MM باشد (ساعت اختیاری). مثال: 17/02/2025 09:30"
      );
    }

    if (scheduledAt <= new Date()) {
      return ctx.reply(
        "زمان انتخاب‌شده باید در آینده باشد. لطفاً دوباره امتحان کن."
      );
    }

    const result = chunkService.scheduleChunk(chatId, ctx.session, scheduledAt);
    return ctx.reply(result.message).then(() => replyWithUpcomingSchedules(ctx, chunkService));
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
    logger.info("Photo received", { chatId, fileId: largestPhoto.file_id });
    ctx.reply("عکس رسید! حالا فایل صوتی را همراه کپشن بفرست. 🎶");
  });

  // Audio
  bot.on("audio", (ctx) => {
    const chatId = ctx.chat.id;
    const current = chunkService.getChunk(ctx.session);

    if (!current || current.step !== 1) {
      return sendOrderError(ctx, chunkService);
    }

    chunkService.addAudio(ctx.session, ctx.message.audio, ctx.message.caption);
    logger.info("Audio received", { chatId, fileId: ctx.message.audio.file_id });
    ctx.reply(
      "صدا رسید! میخوای همین آهنگو تبدیل به ویس کنم یا خودت ویس می‌فرستی؟",
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "میخوای همین آهنگو تبدیل به ویس کنم؟",
            ACTIONS.CONVERT_AUDIO
          ),
        ],
        [
          Markup.button.callback(
            "نه خودم ویس دارم",
            ACTIONS.SKIP_CONVERT
          ),
        ],
      ])
    );
  });

  // Voice
  bot.on("voice", (ctx) => {
    const chatId = ctx.chat.id;
    const current = chunkService.getChunk(ctx.session);

    if (!current || current.step !== 2) {
      return sendOrderError(ctx, chunkService);
    }

    chunkService.addVoice(ctx.session, ctx.message.voice, ctx.message.caption);
    logger.info("Voice received", { chatId, fileId: ctx.message.voice.file_id });
    ctx.reply(
      "بسته آماده است! از دکمه‌های زیر برای ارسال فوری، زمان‌بندی یا لغو استفاده کن.",
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
        "تاریخ/ساعت معتبر نیست. لطفاً با قالب DD/MM/YYYY HH:MM وارد کن. مثال: 17/02/2025 09:30"
      );
    }

    if (scheduledAt <= new Date()) {
      return ctx.reply("باید زمانی در آینده را انتخاب کنی. دوباره تلاش کن.⏳");
    }

    // We got a valid date → schedule and clear the pending state
    chunkService.clearScheduleRequest(ctx.session);
    const result = chunkService.scheduleChunk(chatId, ctx.session, scheduledAt);
    return ctx.reply(result.message).then(() => replyWithUpcomingSchedules(ctx, chunkService));
  });

  bot.action(ACTIONS.POST_NOW, async (ctx) => {
    const result = await chunkService.postChunk(ctx.chat.id, ctx.session);
    await ctx.answerCbQuery(result.message, { show_alert: !result.success });
    if (result.success) {
      await ctx.reply("بسته ارسال شد و در کانال منتشر گردید. ✅");
    }
  });

  bot.action(ACTIONS.SCHEDULE, async (ctx) => {
    const chunk = chunkService.getChunk(ctx.session);

    if (!chunk || chunk.step !== 3) {
      await ctx.answerCbQuery("بسته کامل برای زمان‌بندی موجود نیست.", {
        show_alert: true,
      });
      return;
    }
const now = new Date();
 const serverTimeText = `⏰ زمان فعلی سرور (هلند): ${now.toLocaleString()}`;
    chunkService.requestScheduleInput(ctx.session);
    await ctx.answerCbQuery();
    await ctx.reply(
      "لطفاً تاریخ و ساعت را با قالب DD/MM/YYYY HH:MM بفرست (ساعت اختیاری است). مثال: 17/02/2025 09:30" + "\n" + serverTimeText
    );
    await replyWithUpcomingSchedules(ctx, chunkService);
  });

  bot.action(ACTIONS.CANCEL, async (ctx) => {
    chunkService.resetChunk(ctx.session);
    await ctx.answerCbQuery("بسته لغو شد.");
    await ctx.reply("بسته فعلی لغو شد. هر وقت خواستی دوباره شروع کن!");
  });

  bot.action(ACTIONS.SKIP_CONVERT, async (ctx) => {
    const chunk = chunkService.getChunk(ctx.session);

    if (!chunk || chunk.step !== 2) {
      await ctx.answerCbQuery("اول باید آهنگ ارسال شود.", { show_alert: true });
      return;
    }

    await ctx.answerCbQuery();
    await ctx.reply("باشه، حالا ویس رو بفرست تا بسته کامل بشه. 🎤");
  });

  bot.action(ACTIONS.CONVERT_AUDIO, async (ctx) => {
    const chunk = chunkService.getChunk(ctx.session);

    if (!chunk || chunk.step !== 2 || !chunk.audio_file_id) {
      await ctx.answerCbQuery("اول باید آهنگ ارسال شود.", { show_alert: true });
      return;
    }

    await ctx.answerCbQuery();

    try {
      const telegramId = ctx.from.id;
      const audioPath = await downloadFile(chunk.audio_file_id, telegramId);
      const duration = await getAudioDuration(audioPath);
      const oggPath = path.join(
        __dirname,
        "../../userdata",
        `${telegramId}`,
        `${chunk.audio_file_id}.ogg`
      );

      await convertToOgg(audioPath, oggPath, 0, duration);

      const voiceMessage = await ctx.replyWithVoice({ source: oggPath });

      chunkService.addVoice(
        ctx.session,
        voiceMessage.voice,
        chunk.audio_caption || ""
      );

      await ctx.reply(
        "ویس آماده شد! از دکمه‌های زیر برای ارسال فوری یا زمان‌بندی استفاده کن.",
        readyKeyboard
      );
    } catch (error) {
      logger.error("Failed to convert audio to voice", error);
      await ctx.reply("تبدیل آهنگ به ویس با خطا مواجه شد. لطفاً ویس را خودت بفرست.");
    }
  });

  bot.action(ACTIONS.VIEW_SCHEDULES, async (ctx) => {
    await ctx.answerCbQuery();
    await replyWithUpcomingSchedules(ctx, chunkService);
  });

  // Fallback for any other message types
  bot.on("message", (ctx, next) => {
    // photo/audio/voice are handled above
    if (ctx.message.photo || ctx.message.audio || ctx.message.voice) {
      return next();
    }

    return ctx.reply(
      "این نوع پیام پشتیبانی نمی‌شود. لطفاً به ترتیب عکس با کپشن، فایل صوتی با کپشن و سپس ویس را بفرست."
    );
  });
}

module.exports = { registerChunkHandlers };
