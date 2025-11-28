"use strict";

const { Markup } = require("telegraf");

const ACTIONS = {
  POST_NOW: "chunk:post_now",
  SCHEDULE: "chunk:schedule",
  CANCEL: "chunk:cancel",
};

const readyKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback("ارسال فوری 🚀", ACTIONS.POST_NOW)],
  [Markup.button.callback("زمان‌بندی ⏰", ACTIONS.SCHEDULE)],
  [Markup.button.callback("لغو ❌", ACTIONS.CANCEL)],
]);

function sendOrderError(ctx, service) {
  service.resetChunk(ctx.session);
  return ctx.reply(
    "نوع پیام یا ترتیب اشتباه بود. بسته ریست شد؛ لطفاً دوباره با ارسال عکس (همراه کپشن) شروع کن."
  );
}

function registerChunkHandlers(bot, chunkService) {
  // /start
  bot.start((ctx) => {
    ctx.reply(
      [
        "سلام! 😊 خوش اومدی به بات آماده‌سازی چانک‌ها.",
        "",
        "این بات بهت کمک می‌کنه که خیلی راحت و منظم، محتوای سه‌تایی‌ت رو (عکس، آهنگ، ویس) آماده و برای کانال منتشر کنی.",
        "",
        "فقط کافیه این مراحل رو انجام بدی:",
        "1️⃣ اول یک *عکس* با کپشن بفرست،",
        "2️⃣ بعد یک *فایل صوتی (Audio)* با کپشن،",
        "3️⃣ و در آخر یک *ویس (Voice)* ارسال کن.",
        "",
        "وقتی سه مرحله کامل شد، می‌تونی:",
        "• با دستور /post همین الان منتشرش کنی،",
        "• یا با /schedule زمان‌بندی‌ش کنی تا خودش اتوماتیک پست بشه.",
        "",

        "",
        "هر جا کمکی لازم داشتی در خدمتم! ✨",
      ].join("\n")
    );
  });

  // /cancel
  bot.command("cancel", (ctx) => {
    const chatId = ctx.chat.id;
    chunkService.resetChunk(ctx.session);
    ctx.reply("بسته فعلی لغو شد. اگر خواستی دوباره شروع کنی، از عکس آغاز کن!");
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
          "فعلاً بسته کاملی برای زمان‌بندی نداریم. لطفاً به ترتیب عکس، فایل صوتی و ویس را بفرست."
        );
      }

      chunkService.requestScheduleInput(ctx.session);

      return ctx.reply(
        "لطفاً تاریخ و ساعت را با قالب DD/MM/YYYY HH:MM وارد کن (ساعت اختیاری است). مثال: 17/02/2025 09:30"
      );
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
    ctx.reply("صدا رسید! لطفاً حالا ویس را بفرست تا بسته کامل شود. 🎤");
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
      "بسته آماده است! برای ارسال فوری /post را بفرست، برای زمان‌بندی با تاریخ /schedule DD/MM/YYYY HH:MM و برای وارد کردن تاریخ در پیام بعدی فقط /schedule را بفرست. برای لغو هم /cancel را بزن.",
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
    return ctx.reply(result.message);
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

    chunkService.requestScheduleInput(ctx.session);
    await ctx.answerCbQuery();
    await ctx.reply(
      "لطفاً تاریخ و ساعت را با قالب DD/MM/YYYY HH:MM بفرست (ساعت اختیاری است). مثال: 17/02/2025 09:30"
    );
  });

  bot.action(ACTIONS.CANCEL, async (ctx) => {
    chunkService.resetChunk(ctx.session);
    await ctx.answerCbQuery("بسته لغو شد.");
    await ctx.reply("بسته فعلی لغو شد. هر وقت خواستی دوباره شروع کن!");
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
