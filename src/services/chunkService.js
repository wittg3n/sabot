'use strict';

class ChunkService {
  constructor({ repository, bot, channelId }) {
    this.repository = repository;
    this.bot = bot;
    this.channelId = channelId;
  }

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
    this.repository.reset(chatId);
  }

  getCurrentTimeInfo() {
    const now = new Date();
    const offsetMinutes = now.getTimezoneOffset();
    const sign = offsetMinutes <= 0 ? '+' : '-';
    const absolute = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
    const minutes = String(absolute % 60).padStart(2, '0');
    const offsetLabel = `UTC${sign}${hours}:${minutes}`;

    return {
      now,
      offsetLabel,
      formatted: `${now.toLocaleString()} (${offsetLabel})`,
    };
  }

  parseScheduleInput(input) {
    if (!input) {
      return null;
    }

    const [datePart, timePart = '00:00:00'] = input.trim().split(/\s+/);
    const [day, month, year] = (datePart || '').split('/').map(Number);
    const [hour, minute = 0, second = 0] = (timePart || '').split(':').map(Number);

    if (
      !day ||
      !month ||
      !year ||
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      Number.isNaN(second)
    ) {
      return null;
    }

    const scheduledAt = new Date(year, month - 1, day, hour, minute, second);

    if (Number.isNaN(scheduledAt.getTime())) {
      return null;
    }

    return scheduledAt;
  }

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
      return { success: false, message: 'No complete chunk to post. Please send photo, audio, and voice in order.' };
    }

    try {
      await this.sendChunkToChannel(chunk);
      this.resetChunk(chatId);
      return { success: true, message: 'Posted to channel ✅' };
    } catch (error) {
      console.error('Failed to post chunk', error);
      return { success: false, message: 'Failed to post to channel. Please try again.' };
    }
  }

  scheduleChunk(chatId, scheduledAt) {
    const chunk = this.getChunk(chatId);

    if (!chunk || chunk.step !== 3) {
      return { success: false, message: 'No complete chunk to schedule. Please send photo, audio, and voice in order.' };
    }

    this.repository.schedule(chatId, chunk, scheduledAt);
    this.resetChunk(chatId);
    const { offsetLabel } = this.getCurrentTimeInfo();
    return {
      success: true,
      message: `Chunk scheduled for ${scheduledAt.toLocaleString()} (${offsetLabel}).`,
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
          `Scheduled chunk posted to channel at ${new Date().toLocaleString()}.`,
        );
      } catch (error) {
        console.error('Failed to post scheduled chunk', error);
        await this.bot.telegram.sendMessage(
          scheduled.chat_id,
          'Failed to post your scheduled chunk. Please try scheduling again.',
        );
      }
    }
  }
}

module.exports = ChunkService;
