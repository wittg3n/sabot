# 🤖 SaBot - Telegram Content Scheduler

![License](https://img.shields.io/badge/license-ISC-brightgreen.svg)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)
![Telegraf](https://img.shields.io/badge/Telegraf-4.x-blue.svg)
![SQLite](https://img.shields.io/badge/SQLite-3-blueviolet.svg)
![Redis](https://img.shields.io/badge/Redis-6%2B-red.svg)
![FFmpeg](https://img.shields.io/badge/FFmpeg-4%2B-black.svg)

SaBot is a production-ready Telegram bot built with **Telegraf**. It collects a three-step "chunk" (photo + caption → audio + caption → voice note) from private chats and posts or schedules the compiled post to a channel. The bot ships with inline keyboards, upcoming schedule previews, and structured logging so it is ready to deploy.

## 🚀 Features

- 🧭 **Guided onboarding**: `/start` opens with inline actions for starting a batch, viewing the quick guide, or checking upcoming schedules.
- 🎛️ **Inline-first flow**: Users complete or schedule chunks entirely via inline keyboards—no exposed command text.
- ⏰ **Scheduling with previews**: Shows all upcoming scheduled chunks for the chat and surfaces them again whenever a schedule action is chosen.
- 💾 **Reliable storage**: In-progress chunks live in Redis sessions; finalized/scheduled posts persist in SQLite for restart safety.
- 🎙️ **Media-aware**: Supports the exact sequence of photo, audio, and voice messages with validation and friendly recovery if the order is wrong.
- 🛰️ **Channel posting**: Post immediately or hand off to the scheduler loop for timed delivery to your configured channel.
- 📜 **Structured logging**: Winston-powered console + rotating file logs with contextual metadata across startup, scheduling, and media handling.

## 📋 Requirements

Install the following before running the bot:

- [**Node.js**](https://nodejs.org/) v18+ 🟩
- [**Redis**](https://redis.io/) v6+ 🔴
- [**SQLite**](https://www.sqlite.org/index.html) (CLI available in PATH) 🟪
- [**FFmpeg**](https://ffmpeg.org/) v4+ 🎥

## 🧭 Quickstart

1. **Clone & install**

   ```bash
   git clone https://github.com/your-username/sabot.git
   cd sabot
   npm install
   ```

2. **Configure environment** (via `.env` or shell):

   ```bash
   export BOT_TOKEN="<telegram_bot_token>"
   export CHANNEL_ID="<target_channel_username_or_id>"
   # Optional overrides
   export REDIS_URL="redis://localhost:6379"
   export DATABASE_PATH="data.sqlite"
   ```

3. **Run the bot**

   ```bash
   node index.js
   ```

4. **Talk to the bot**
   - Send `/start` to see the inline keyboard with **Start Batch**, **Upcoming Schedules**, and **Quick Guide**.
   - Follow the inline prompts to send **photo → audio → voice**. Choose **Post now** or **Schedule** via inline buttons; upcoming schedules are displayed whenever you schedule.

## 🧱 Project structure

```bash
📦 sabot/
├── index.js                 # Entrypoint that wires and launches the bot
├── sqlite-db.js             # SQLite helper for CLI-backed persistence
├── src/
│   ├── app.js               # Application factory and scheduler bootstrap
│   ├── config/
│   │   └── environment.js   # Environment loading & validation
│   ├── infrastructure/
│   │   └── sqlite.js        # Low-level SQLite runner
│   ├── repositories/
│   │   └── chunkRepository.js # CRUD for chunks & schedules
│   ├── services/
│   │   └── chunkService.js  # Business logic for chunk validation & posting
│   ├── bot/
│   │   └── handlers.js      # Telegraf handlers & inline keyboards
│   └── logger.js            # Winston logger configuration
├── package.json
└── README.md
```

## 🛠️ Configuration notes

- **Channel permissions**: Ensure the bot is an admin of the target channel so it can post scheduled content.
- **Logging**: Default transports write to console and rotating log files. Adjust levels or paths in `src/logger.js`.
- **Scheduler**: Uses SQLite-backed schedule queue; the loop starts automatically from `src/app.js` during startup.

## 📚 Usage tips

- Stay within the **photo → audio → voice** order. If you misorder a step, the bot will reset the current batch and guide you.
- Use **Upcoming Schedules** from the inline keyboard to confirm what is queued before adding new slots.
- To redeploy, keep `index.js` as the runtime entry; `src/app.js` contains the injectable wiring for tests or alternative runners.

## 🤝 Contributing

Contributions are welcome! Please fork the repo, open a feature branch, and submit a pull request. For significant changes, open an issue first to discuss the proposal.

## 📝 License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.
