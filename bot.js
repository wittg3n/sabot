require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const store = require("./redis.config")
const bot = new Telegraf(process.env.TOKEN);
bot.use(session({ store }));

const { musicToVoice } = require('./handler/music')
const { menu, stop, start, launch } = require('./handler/main')

//yo
start(bot)

//download music
menu(bot)

//music related buttons

//create voice
musicToVoice(bot)

//stop the bot
stop(bot)

//lunches the bot
launch(bot)
/*TODO i need to create these:
a database which contains music and the cover and caption and voice.
i can store onley fileIds.

 */
