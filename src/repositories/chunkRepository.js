"use strict";

const createTables = `
  CREATE TABLE IF NOT EXISTS chunks (
    chat_id TEXT PRIMARY KEY,
    step INTEGER NOT NULL,
    photo_file_id TEXT,
    photo_caption TEXT,
    audio_file_id TEXT,
    audio_caption TEXT,
    voice_file_id TEXT,
    voice_caption TEXT
  );

  CREATE TABLE IF NOT EXISTS scheduled_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    scheduled_at INTEGER NOT NULL,
    photo_file_id TEXT NOT NULL,
    photo_caption TEXT,
    audio_file_id TEXT NOT NULL,
    audio_caption TEXT,
    voice_file_id TEXT NOT NULL,
    voice_caption TEXT
  );
`;

class ChunkRepository {
  constructor(db) {
    this.db = db;
    this.db.exec(createTables);
  }

  getByChatId(chatId) {
    return this.db
      .prepare("SELECT * FROM chunks WHERE chat_id = ?")
      .get(chatId);
  }

  startChunk(chatId, photoId, caption) {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO chunks (
          chat_id,
          step,
          photo_file_id,
          photo_caption,
          audio_file_id,
          audio_caption,
          voice_file_id,
          voice_caption
        ) VALUES (?, 1, ?, ?, NULL, NULL, NULL, NULL)`
      )
      .run(chatId, photoId, caption || "");
  }

  addAudio(chatId, audioId, caption) {
    this.db
      .prepare(
        `UPDATE chunks SET
          step = 2,
          audio_file_id = ?,
          audio_caption = ?
        WHERE chat_id = ?`
      )
      .run(audioId, caption || "", chatId);
  }

  addVoice(chatId, voiceId, caption) {
    this.db
      .prepare(
        `UPDATE chunks SET
          step = 3,
          voice_file_id = ?,
          voice_caption = ?
        WHERE chat_id = ?`
      )
      .run(voiceId, caption || "", chatId);
  }

  reset(chatId) {
    this.db.prepare("DELETE FROM chunks WHERE chat_id = ?").run(chatId);
  }

  /**
   * یک بسته را در جدول زمان‌بندی ذخیره می‌کند و id رکورد ایجادشده را برمی‌گرداند.
   */
  schedule(chatId, chunk, scheduledAt) {
    const scheduledTs = scheduledAt.getTime();

    this.db
      .prepare(
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
      )
      .run(
        chatId,
        scheduledTs,
        chunk.photo_file_id,
        chunk.photo_caption,
        chunk.audio_file_id,
        chunk.audio_caption,
        chunk.voice_file_id,
        chunk.voice_caption
      );

    // چون هر query یک پروسه‌ی sqlite جداست، با ترکیب فیلدها id را برمی‌داریم
    const row = this.db
      .prepare(
        `SELECT id FROM scheduled_chunks
         WHERE chat_id = ?
           AND scheduled_at = ?
           AND photo_file_id = ?
           AND audio_file_id = ?
           AND voice_file_id = ?
         ORDER BY id DESC
         LIMIT 1`
      )
      .get(
        chatId,
        scheduledTs,
        chunk.photo_file_id,
        chunk.audio_file_id,
        chunk.voice_file_id
      );

    return row ? row.id : null;
  }

  fetchDue(now) {
    return this.db
      .prepare(
        "SELECT * FROM scheduled_chunks WHERE scheduled_at <= ? ORDER BY scheduled_at ASC"
      )
      .all(now.getTime());
  }

  fetchUpcomingByChatId(chatId, now = new Date()) {
    return this.db
      .prepare(
        "SELECT * FROM scheduled_chunks WHERE chat_id = ? AND scheduled_at > ? ORDER BY scheduled_at ASC"
      )
      .all(chatId, now.getTime());
  }

  removeScheduled(id) {
    this.db.prepare("DELETE FROM scheduled_chunks WHERE id = ?").run(id);
  }

  /**
   * گرفتن یک برنامه زمان‌بندی‌شده بر اساس id
   */
  getScheduledById(id) {
    return this.db
      .prepare("SELECT * FROM scheduled_chunks WHERE id = ?")
      .get(id);
  }
}

module.exports = ChunkRepository;
