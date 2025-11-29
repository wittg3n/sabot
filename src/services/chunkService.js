"use strict";

const logger = require("../logger");

class ChunkService {
  constructor({ repository, bot, channelId }) {
    this.repository = repository;
    this.bot = bot;
    this.channelId = channelId;
  }

  // ----- chunk state -----

  getChunk(session) {
    return session.chunk;
  }

  startChunk(session, photo, caption) {
    session.chunk = {
      step: 1,
      photo_file_id: photo.file_id,
      photo_caption: caption || '',
    };
    this.clearScheduleRequest(session);
  }

  addAudio(session, audio, caption) {
    if (!session.chunk) return;

    session.chunk = {
      ...session.chunk,
      step: 2,
      audio_file_id: audio.file_id,
      audio_caption: caption || '',
    };
  }

  addVoice(session, voice, caption) {
    if (!session.chunk) return;

    session.chunk = {
      ...session.chunk,
      step: 3,
      voice_file_id: voice.file_id,
      voice_caption: caption || '',
    };
  }

  resetChunk(session) {
    session.chunk = null;
    this.clearScheduleRequest(session);
  }

  // ----- schedule state helpers -----

  requestScheduleInput(session) {
    session.waitingForSchedule = true;
  }

  isWaitingForSchedule(session) {
    return Boolean(session.waitingForSchedule);
  }

  clearScheduleRequest(session) {
    session.waitingForSchedule = false;
  }

  // ----- upcoming schedules -----

  getUpcomingSchedules(chatId, now = new Date()) {
    return this.repository.fetchUpcomingByChatId(chatId, now);
  }

  // ----- parsing / validation -----

  parseScheduleInput(input) {
    if (!input) {
      return null;
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    // Expect "DD/MM/YYYY" or "DD/MM/YYYY HH:MM"
    const [datePart, timePart = "00:00"] = trimmed.split(/\s+/);
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

  // ----- sending -----

  async sendChunkToChannel(chunk) {
    await this.bot.telegram.sendPhoto(this.channelId, chunk.photo_file_id, {
      caption: chunk.photo_caption,
    });

    await this.bot.telegram.sendAudio(this.channelId, chunk.audio_file_id, {
      caption: chunk.audio_caption,
    });

    await this.bot.telegram.sendVoice(this.channelId, chunk.voice_file_id, {
      caption: chunk.voice_caption || undefined,
    });
  }

  async postChunk(chatId, session) {
    const chunk = this.getChunk(session);

    if (!chunk || chunk.step !== 3) {
      return {
        success: false,
        message:
          "بسته برای ارسال کامل نیست. لطفاً به ترتیب عکس، فایل صوتی و ویس را بفرست.",
      };
    }

    try {
      await this.sendChunkToChannel(chunk);
      this.resetChunk(session);
      return { success: true, message: "در کانال ارسال شد ✅" };
    } catch (error) {
      logger.error("Failed to post chunk", error);
      return {
        success: false,
        message: "ارسال به کانال ناموفق بود. لطفاً دوباره تلاش کن.",
      };
    }
  }

  scheduleChunk(chatId, session, scheduledAt) {
    const chunk = this.getChunk(session);

    if (!chunk || chunk.step !== 3) {
      return {
        success: false,
        message:
          "بسته برای زمان‌بندی کامل نیست. لطفاً به ترتیب عکس، فایل صوتی و ویس را بفرست.",
      };
    }

    this.repository.schedule(chatId, chunk, scheduledAt);
    logger.info("Chunk scheduled", { chatId, scheduledAt: scheduledAt.toISOString() });
    this.resetChunk(session);

    return {
      success: true,
      message: `بسته برای ${scheduledAt.toLocaleString()} زمان‌بندی شد.`,
    };
  }

  async postDueScheduled() {
    const now = new Date();
    const dueChunks = this.repository.fetchDue(now);

    for (const scheduled of dueChunks) {
      try {
        await this.sendChunkToChannel(scheduled);
        this.repository.removeScheduled(scheduled.id);

        await this.bot.telegram.sendMessage(
          scheduled.chat_id,
          `بسته زمان‌بندی‌شده در ${new Date().toLocaleString()} در کانال ارسال شد.`
        );
      } catch (error) {
        logger.error("Failed to post scheduled chunk", error, { scheduledId: scheduled.id });

        await this.bot.telegram.sendMessage(
          scheduled.chat_id,
          "ارسال بسته زمان‌بندی‌شده ناموفق بود و حذف شد؛ لطفاً دوباره زمان‌بندی کن."
        );

        this.repository.removeScheduled(scheduled.id);
      }
    }
  }
}

module.exports = ChunkService;
