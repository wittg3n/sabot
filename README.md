# 🎶 Sabot - Telegram Music Bot 🎶

![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)
![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-v5.0%2B-blue.svg)
![Redis](https://img.shields.io/badge/Redis-6%2B-red.svg)
![FFmpeg](https://img.shields.io/badge/FFmpeg-4%2B-black.svg)

Sabot is a modular Telegram bot that converts music files into voice messages 🎵, handles file uploads 🗂️, and manages user sessions 🧑‍💻. It's designed for scalability and ease of use, making it easy to add more features as needed.

## 🚀 Features
- 🎶 **Music to Voice Conversion**: Converts music files to Telegram voice messages.
- 💾 **Session Management**: Uses Redis and MongoDB for session storage.
- 📂 **File Uploads**: Stores user-uploaded music in a `userdata/` folder.
- 🔮 **Future Features**: Planned support for YouTube to MP3, MP3 tag editing, and more.

## 📋 Requirements

Before running the bot, ensure you have the following installed:

- [**Node.js**](https://nodejs.org/) v16+ 🟩
- [**MongoDB**](https://www.mongodb.com/) v5+ 🟦
- [**Redis**](https://redis.io/) v6+ 🔴
- [**FFmpeg**](https://ffmpeg.org/) v4+ 🎥

### Installation Instructions

1. **Node.js**: Install Node.js from [here](https://nodejs.org/).
   - Verify installation:
     ```bash
     node -v
     ```

2. **MongoDB**: Install MongoDB from [here](https://www.mongodb.com/try/download/community).
   - Verify installation:
     ```bash
     mongod --version
     ```

3. **Redis**: Install Redis from [here](https://redis.io/download).
   - Verify installation:
     ```bash
     redis-server --version
     ```

4. **FFmpeg**: Install FFmpeg from [here](https://ffmpeg.org/download.html).
   - Verify installation:
     ```bash
     ffmpeg -version
     ```

## 📂 Project Structure

```bash
📦 Project Root
/
├── handler
│   ├── main.js               
│   └── music.js               
├── server
│   ├── /api                   
│   │   ├── user.js           
│   └── /database            
│       ├── post.js            
│       ├── users.js         
│       ├── db.config.js     
│       └── index.js           
├── /userdata                 
├── /utils                     
│   ├── converter.js           
│   ├── downloader.js         
│   └── sendVoiceMessage.js   
├── .env                       
├── bot.js                     
├── colors.config.js          
├── redis.config.js           
├── responses.js              
├── package.json              
└── README.md                 

```

## 📦 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/sabot.git
   cd sabot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   Create a `.env` file in the root directory and add your secrets:
   ```bash
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
   MONGO_URI=mongodb://localhost:27017/sabot
   REDIS_URL=redis://localhost:6379
   ```

4. Start the bot:
   ```bash
   npm start
   ```

## 📚 Usage

Sabot interacts with users by converting their uploaded music into voice messages. Users upload their favorite songs, and the bot automatically converts them into `.ogg` format and sends them back.

## 🛠️ Configuration

To adjust the bot’s functionality, modify the relevant files in the `utils/` directory, such as the audio converter settings in `convertor.js`.

For example:
```js
// utils/convertor.js
ffmpeg(audioFile)
   .audioCodec('libopus')
   .audioBitrate(25)
   .audioChannels(1)
   .audioFrequency(48000)
   .toFormat('ogg')
   .save(outputFilePath);
```

## 🛡️ Security & Session Management

Sabot uses Redis and MongoDB to securely store session data and user information.

- **Redis** configuration: `redis.config.js`
- **MongoDB** models: `server/user.js`

## 🔮 Roadmap

- [x] Convert music files to Telegram voice messages.
- [ ] Add YouTube to MP3 converter.
- [ ] Schedule posts to Telegram channels.
- [ ] Edit MP3 tags on uploaded files.

## 🤝 Contributing

Feel free to contribute! Fork the repo, make your changes, and submit a pull request. All contributions are welcome.

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---
