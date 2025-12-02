"use strict";

const fs = require("fs").promises;
const path = require("path");
const logger = require("../logger");

// حذف فایل‌های مربوط به یک آهنگ/ویس کاربر
async function deleteUserFiles(telegramId, audioFileId) {
  if (!telegramId || !audioFileId) {
    return;
  }

  const baseDir = path.join(__dirname, "../../userdata", String(telegramId));

  const mp3Path = path.join(baseDir, `${audioFileId}.mp3`);
  const oggPath = path.join(baseDir, `${audioFileId}.ogg`);

  const removeFile = async (filePath, label) => {
    try {
      await fs.unlink(filePath);
      logger.debug?.("Deleted user file", { telegramId, audioFileId, filePath });
    } catch (err) {
      if (err.code === "ENOENT") {
        logger.debug?.("User file already removed", {
          telegramId,
          audioFileId,
          filePath,
        });
        return;
      }

      logger.warn(`Failed to delete ${label} file`, {
        telegramId,
        audioFileId,
        error: err.message,
      });
    }
  };

  await Promise.all([
    removeFile(mp3Path, "mp3"),
    removeFile(oggPath, "ogg"),
  ]);
}

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
      photo_caption: caption || "",
    };
    this.clearScheduleRequest(session);
  }

  addAudio(session, audio, caption) {
    if (!session.chunk) return;

    session.chunk = {
      ...session.chunk,
      step: 2,
      audio_file_id: audio.file_id,
      audio_caption: caption || "",
    };
  }

  addVoice(session, voice, caption) {
    if (!session.chunk) return;

    session.chunk = {
      ...session.chunk,
      step: 3,
      voice_file_id: voice.file_id,
      voice_caption: caption || "",
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

      // پاک کردن فایل‌های mp3 و ogg مربوط به این آهنگ/ویس
      try {
        const telegramId = chatId; // در چت خصوصی، chat_id همان تلگرام آیدی کاربر است
        await deleteUserFiles(telegramId, chunk.audio_file_id);
      } catch (cleanupError) {
        logger.warn("Failed to cleanup files after immediate post", {
          chatId,
          error: cleanupError.message,
        });
      }

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

  /**
   * زمان‌بندی یک بسته؛ علاوه بر پیام، id رکورد زمان‌بندی‌شده را برمی‌گرداند
   * تا در inline keyboard برای لغو استفاده شود.
   */
  scheduleChunk(chatId, session, scheduledAt) {
    const chunk = this.getChunk(session);

    if (!chunk || chunk.step !== 3) {
      return {
        success: false,
        message:
          "بسته برای زمان‌بندی کامل نیست. لطفاً به ترتیب عکس، فایل صوتی و ویس را بفرست.",
      };
    }

    const scheduledId = this.repository.schedule(chatId, chunk, scheduledAt);
    logger.info("Chunk scheduled", {
      chatId,
      scheduledAt: scheduledAt.toISOString(),
      scheduledId,
    });

    this.resetChunk(session);

    return {
      success: true,
      message: `بسته برای ${scheduledAt.toLocaleString()} زمان‌بندی شد.`,
      scheduledId,
    };
  }

  /**
   * لغو یک زمان‌بندی بر اساس id (فقط اگر متعلق به همان chat باشد)
   */
  cancelScheduled(chatId, scheduledId) {
    try {
      const scheduled = this.repository.getScheduledById(scheduledId);

      if (!scheduled) {
        return {
          success: false,
          message: "این برنامه زمان‌بندی پیدا نشد یا قبلاً حذف شده است.",
        };
      }

      if (String(scheduled.chat_id) !== String(chatId)) {
        return {
          success: false,
          message: "شما اجازه لغو این زمان‌بندی را ندارید.",
        };
      }

      // پاک کردن فایل‌های mp3 و ogg مربوط به این برنامه
      try {
        const telegramId = scheduled.chat_id;
        await deleteUserFiles(telegramId, scheduled.audio_file_id);
      } catch (cleanupError) {
        logger.warn("Failed to cleanup files after canceling scheduled post", {
          chatId,
          scheduledId,
          error: cleanupError.message,
        });
      }

      this.repository.removeScheduled(scheduledId);

      const timeText = new Date(scheduled.scheduled_at).toLocaleString();

      logger.info("Scheduled chunk canceled by user", {
        chatId,
        scheduledId,
        time: timeText,
      });

      return {
        success: true,
        message: `بسته زمان‌بندی‌شده برای ${timeText} لغو شد.`,
      };
    } catch (error) {
      logger.error("Failed to cancel scheduled chunk", error, {
        chatId,
        scheduledId,
      });
      return {
        success: false,
        message: "لغو زمان‌بندی با خطا مواجه شد. لطفاً دوباره تلاش کن.",
      };
    }
  }

  async postDueScheduled() {
    const now = new Date();
    const dueChunks = this.repository.fetchDue(now);

    for (const scheduled of dueChunks) {
      try {
        await this.sendChunkToChannel(scheduled);

        // پاک کردن فایل‌های mp3 و ogg مربوط به این آهنگ/ویس
        try {
          const telegramId = scheduled.chat_id;
          await deleteUserFiles(telegramId, scheduled.audio_file_id);
        } catch (cleanupError) {
          logger.warn("Failed to cleanup files after scheduled post", {
            chatId: scheduled.chat_id,
            scheduledId: scheduled.id,
            error: cleanupError.message,
          });
        }

        this.repository.removeScheduled(scheduled.id);

        await this.bot.telegram.sendMessage(
          scheduled.chat_id,
          `بسته زمان‌بندی‌شده در ${new Date().toLocaleString()} در کانال ارسال شد.`
        );
      } catch (error) {
        logger.error("Failed to post scheduled chunk", error, {
          scheduledId: scheduled.id,
        });

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
