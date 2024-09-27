require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const store = require("../../config/redis.config")
const bot = new Telegraf(process.env.TOKEN);
bot.use(session({ store }));

const { musicToVoice } = require('./handler/musicHandler')
const { menu, stop, start, launch } = require('./handler/mainHandler')

start(bot)

menu(bot)


musicToVoice(bot)

stop(bot)

launch(bot)
/*TODO i need to create these:
a database which contains music and the cover and caption and voice.
i can store onley fileIds.

 */

/*TODO post list are accessable by user and posts of the week are shown like this:
    /post-(random generated hash usnig fileId and telegram id)
    create a listener for this
    if user inputs /post more than 6 times they should wait for 1 munutes
*/
