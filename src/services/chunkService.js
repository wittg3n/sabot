"use strict";

class ChunkService {
  constructor({ repository, bot, channelId }) {
    this.repository = repository;
    this.bot = bot;
    this.channelId = channelId;

    // Chats that are currently in "please send me the date/time" mode
    this.pendingScheduleChatIds = new Set();
  }

  // ----- chunk state -----

  getChunk(chatId) {
    return this.repository.getByChatId(chatId);
  }

  startChunk(chatId, photo, caption) {
    this.repository.startChunk(chatId, photo.file_id, caption);
  }

  addAudio(chatId, audio, caption) {
    this.repository.addAudio(chatId, audio.file_id, caption);
  }

  addVoice(chatId, voice, caption) {
    this.repository.addVoice(chatId, voice.file_id, caption);
  }

  resetChunk(chatId) {
    // Clear both DB state and any pending schedule state
    this.repository.reset(chatId);
    this.clearScheduleRequest(chatId);
  }

  // ----- schedule state helpers -----

  requestScheduleInput(chatId) {
    this.pendingScheduleChatIds.add(chatId);
  }

  isWaitingForSchedule(chatId) {
    return this.pendingScheduleChatIds.has(chatId);
  }

  clearScheduleRequest(chatId) {
    this.pendingScheduleChatIds.delete(chatId);
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

  async postChunk(chatId) {
    const chunk = this.getChunk(chatId);

    if (!chunk || chunk.step !== 3) {
      return {
        success: false,
        message:
          "No complete chunk to post. Please send photo, audio, and voice in order.",
      };
    }

    try {
      await this.sendChunkToChannel(chunk);
      this.resetChunk(chatId);
      return { success: true, message: "Posted to channel ✅" };
    } catch (error) {
      console.error("Failed to post chunk", error);
      return {
        success: false,
        message: "Failed to post to channel. Please try again.",
      };
    }
  }

  scheduleChunk(chatId, scheduledAt) {
    const chunk = this.getChunk(chatId);

    if (!chunk || chunk.step !== 3) {
      return {
        success: false,
        message:
          "No complete chunk to schedule. Please send photo, audio, and voice in order.",
      };
    }

    this.repository.schedule(chatId, chunk, scheduledAt);
    this.resetChunk(chatId);

    return {
      success: true,
      message: `Chunk scheduled for ${scheduledAt.toLocaleString()}.`,
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
          `Scheduled chunk posted to channel at ${new Date().toLocaleString()}.`
        );
      } catch (error) {
        console.error("Failed to post scheduled chunk", error);

        await this.bot.telegram.sendMessage(
          scheduled.chat_id,
          "Failed to post your scheduled chunk. Please try scheduling again."
        );
      }
    }
  }
}

module.exports = ChunkService;
