require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const store = require("./redis.config")
const bot = new Telegraf(process.env.TOKEN);
bot.use(session({ store }));

const { musicToVoice } = require('./handler/music')
const { menu, stop, start, launch } = require('./handler/main')

start(bot)

menu(bot)


musicToVoice(bot)

stop(bot)

launch(bot)
/*TODO i need to create these:
a database which contains music and the cover and caption and voice.
i can store onley fileIds.

 */
