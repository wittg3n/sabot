# KIAGram Telegram Bot

A production-ready Telegram bot built with Node.js and Telegraf to collect three related messages (photo with caption, audio with caption, and voice message) from private chats and repost them to a configured Telegram channel as fresh posts.

## Features
- Collects message chunks per user chat in strict order: photo → audio → voice.
- Validates message order and resets on mistakes with clear feedback.
- Posts completed chunks to a target channel using `sendPhoto`, `sendAudio`, and `sendVoice`.
- Commands: `/start`, `/post`, `/cancel`.
- In-memory per-chat storage; supports multiple users concurrently.
- Basic logging for startup, chunk lifecycle, and posting.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (use `.env` or your preferred method):
   ```bash
   export BOT_TOKEN="<your_bot_token>"
   export CHANNEL_ID="<your_channel_username_or_id>"
   ```
3. Run the bot:
   ```bash
   npm start
   ```

Ensure the bot has admin permissions to post in the target channel.
