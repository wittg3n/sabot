# KIAGram Telegram Bot

A production-ready Telegram bot built with Node.js and Telegraf to collect three related messages (photo with caption, audio with caption, and voice message) from private chats and repost them to a configured Telegram channel as fresh posts. Each chunk can also be scheduled for future release and all data is persisted in SQLite so the bot can restart without losing state.

## Features
- Collects message chunks per user chat in strict order: photo → audio → voice (kept in Redis-backed Telegraf sessions).
- Validates message order and resets on mistakes with clear feedback.
- Posts completed chunks immediately or schedules them for a specified date/time.
- Persists schedules in SQLite (bundled via the system `sqlite3` CLI) while in-progress chunks remain in Redis sessions for smooth sequencing and scheduling prompts.
- Commands: `/start`, `/post`, `/schedule`, `/cancel`.
- Inline keyboards for quick "post now", "schedule", or "cancel" actions when a chunk is ready.
- Startup environment validation and structured layering (config → infrastructure → repositories → services → bot handlers).
- Basic logging for startup, chunk lifecycle, and scheduled posting loop.

## Project structure
- `index.js`: the runtime entrypoint. It constructs the bot by calling `createApp` from `src/app.js`, starts the Telegraf instance, and handles shutdown signals. Keep this file as the single executable entry for `npm start` or hosting platforms.
- `src/app.js`: the application factory that wires configuration, database connection, repositories, services, bot handlers, and the scheduler loop. This remains separate so the initialization logic can be imported or tested without side effects.
- `src/config/environment.js`: environment loading and validation.
- `src/infrastructure/sqlite.js`: lightweight SQLite helper around the `sqlite3` CLI.
- `src/repositories/chunkRepository.js`: data access for chunks and schedules.
- `src/services/chunkService.js`: business logic for validating chunks, scheduling, and posting to the channel.
- `src/bot/handlers.js`: Telegraf command and message handlers that delegate to the service layer.

Keep both `index.js` and `src/app.js`: `index.js` is intentionally minimal so it can be the single entrypoint, while `src/app.js` encapsulates wiring and can be reused in tests or other runners.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (use `.env` or your preferred method):
   ```bash
   export BOT_TOKEN="<your_bot_token>"
   export CHANNEL_ID="<your_channel_username_or_id>"
   # Optional: override the SQLite file path and Redis connection
   export DATABASE_PATH="data.sqlite"
   export REDIS_URL="redis://localhost:6379"
   ```
3. Run the bot:
   ```bash
   npm start
   ```

Ensure the bot has admin permissions to post in the target channel.
