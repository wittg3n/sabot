const axios = require('axios');
const fs = require('fs')
const path = require('path');
const { downloadFile } = require('../utils/downloader');
const responses = require('../../../responses')
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
        console.log('Attempting to launch bot...'.bgBlue);
        bot.launch()
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
            if (!ctx.session) {
                ctx.session = {};
            }

            const audioFileId = ctx.message.audio.file_id;
            const telegramId = ctx.from.id;

            try {
                // Construct expected file path
                const expectedAudioFilePath = path.join(__dirname, '../../../userdata', String(telegramId), `${audioFileId}.mp3`);

                // Ensure that each user's session is unique and reset if needed
                if (ctx.session.audioFileId !== audioFileId) {
                    ctx.session.audioFileId = audioFileId;
                    ctx.session.audioFilePath = null; // Reset stored audio path
                }

                // Check if file already exists
                if (!ctx.session.audioFilePath || !fs.existsSync(expectedAudioFilePath)) {
                    const sentMessage = await ctx.reply(responses.downloading);
                    ctx.session.messageToDelete = sentMessage.message_id;

                    // Download new file
                    const audioFilePath = await downloadFile(audioFileId, telegramId);
                    console.log(`Downloaded audio to: ${audioFilePath}`);
                    ctx.session.audioFilePath = audioFilePath;
                } else {
                    console.log('Audio file already exists, using existing file.');
                    ctx.session.audioFilePath = expectedAudioFilePath;
                }

                // Delete the downloading message
                if (ctx.session.messageToDelete) {
                    await ctx.deleteMessage(ctx.session.messageToDelete);
                    ctx.session.messageToDelete = null;
                }

                // Send the audio back to the user
                const message = await ctx.replyWithAudio(
                    ctx.session.audioFileId,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: responses.changeCaption, callback_data: 'change_caption' }],
                                [{ text: responses.musicToVoice, callback_data: 'create_voice' }]
                            ]
                        }
                    }
                );

                // Store the message and chat details in session
                ctx.session.messageId = message.message_id;
                ctx.session.chatId = ctx.chat.id;

            } catch (error) {
                console.error('Error handling audio:', error.message);
                await ctx.reply(responses.failedToProcessAudio);
            }
        });
    }
};
