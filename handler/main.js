const axios = require('axios');
const fs =require('fs')
const path = require('path');
const { downloadFile } = require('../utils/downloader');
const responses = require ('../responses')
module.exports = {
    start: (bot) => {
        bot.start((ctx) => {
            try {
                axios.post('http://localhost:3001/user/create', {
                    username: ctx.from.username,
                    telegramId: ctx.from.id
                })
                .then(res => {
                        ctx.reply(responses.welcome);
                })
                .catch(error => {
                    console.error('Error saving user:', error.message);
                    ctx.reply(responses.error);
                });
            } catch (error) {
                console.log('err in start', error)
            }
 
        });
    },

    launch: (bot) => {
        bot.launch()
        .then(() => {
            console.log('Bot is running...');
        })
        .catch(error => {
            console.error('Error launching bot:', error.message);
        });
    },

    stop: (bot) => {
        bot.command('stop', (ctx) => {
            ctx.reply('Stopping the bot...').then(() => {
                console.log('Bot is shutting down...');
                bot.stop('User requested stop');
            });
        });
    },
    menu: (bot) => {
        bot.on('audio', async (ctx) => {
            // Ensure session is initialized
            if (!ctx.session) {
                ctx.session = {};
            }

            const audioFileId = ctx.message.audio.file_id;
            const telegramId = ctx.from.id;
            try {
            const expectedAudioFilePath = path.join(__dirname, '../userdata', String(telegramId), `${audioFileId}.mp3`);
            if (!ctx.session.audioFileId) {
                ctx.session.audioFileId = audioFileId;
            }
            if (!fs.existsSync(expectedAudioFilePath)) {
                ctx.reply(responses.downloading)
                const audioFilePath = await downloadFile(audioFileId, telegramId);
                console.log(audioFilePath);
                ctx.session.audioFilePath = audioFilePath; // Store audio file path in session
            } else {
                console.log('Audio file already exists, using existing file.');
                ctx.session.audioFilePath = expectedAudioFilePath; // Use the existing audio file path
            }
                // Send initial message with buttons
                const message = await ctx.replyWithAudio(
                    ctx.session.audioFileId ,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '📝 Change Caption', callback_data: 'change_caption' }],
                                [{ text: '🎤 Create Voice', callback_data: 'create_voice' }]
                            ]
                        }
                    }
                );

                ctx.session.messageId = message.message_id; // Store message ID for editing later
                ctx.session.chatId = ctx.chat.id; // Store chat ID for editing later
            } catch (error) {
                console.error('Error handling audio:', error.message);
                await ctx.reply('Failed to process audio.');
            }
        });
    },
};
