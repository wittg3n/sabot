require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const store = require("../config/redis.config");
const bot = new Telegraf(process.env.TOKEN);
bot.use(session({ store }));

const { musicToVoice } = require('./handler/musicHandler');
const { menu, stop, start, launch } = require('./handler/mainHandler');


const COMMAND_LIMIT = 10;  
const TIME_WINDOW = 60;    

async function rateLimiter(ctx, next) {
    const userId = ctx.from.id;
    const currentTime = Math.floor(Date.now() / 1000); 

    const redisKey = `command_count:${userId}`;

    try {
        const commandTimes = await store.lrangeAsync(redisKey, 0, -1);

        const recentCommands = commandTimes.filter(timestamp => currentTime - timestamp <= TIME_WINDOW);

        if (recentCommands.length >= COMMAND_LIMIT) {
            return ctx.reply('شما بیش از حد مجاز از دستورات استفاده کرده‌اید. لطفاً یک دقیقه دیگر صبر کنید.');
        }

        await store.rpushAsync(redisKey, currentTime);

        await store.expire(redisKey, TIME_WINDOW);

        return next();
    } catch (error) {
        console.error('خطا در محدودیت دستورات:', error);
        return ctx.reply('مشکلی رخ داده است. لطفاً بعداً تلاش کنید.');
    }
}

bot.use(rateLimiter);

start(bot);
menu(bot);
musicToVoice(bot);
stop(bot);
launch(bot);
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');

    await store.quit();
    console.log('Redis connection closed.');
    
    process.exit(0); 
});
/*TODO i need to create these:
a database which contains music and the cover and caption and voice.
i can store onley fileIds.

 */

/*TODO post list are accessable by user and posts of the week are shown like this:
    /post-(random generated hash usnig fileId and telegram id)
    create a listener for this
    if user inputs /post more than 6 times they should wait for 1 munutes
*/
