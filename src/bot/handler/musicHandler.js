const { convertToOgg, getAudioDuration } = require('../utils/converter');
const { downloadFile } = require('../utils/downloader');
const query = require('../../../config/inlineQueries')
const path = require('path');
const fs = require('fs')
module.exports = {
    musicToVoice: (bot) => {
        let currentAudioFileId = null;
     
        bot.on('callback_query', async (ctx) => {
            if (!ctx.session) {
                ctx.session = {};
            }

            const callbackData = ctx.callbackQuery.data;
            const messageId = ctx.session.messageId;
            const chatId = ctx.session.chatId;

            try {
                if (callbackData === 'create_voice') {
                    currentAudioFileId = ctx.callbackQuery.message.audio.file_id;


                    const promptMessage = await ctx.reply('Please select the start time:', {
                        reply_markup: {
                            inline_keyboard: query.startTimeOptions
                        }
                    });

                    ctx.session.promptMessageId = promptMessage.message_id;
                } else if (callbackData.startsWith('start_time_')) {
                    const startTime = Number(callbackData.split('_')[2]);
                    console.log(`Selected start time: ${startTime}`.debug);
                    ctx.session.startTime = startTime;


                    await ctx.telegram.editMessageText(chatId, ctx.session.promptMessageId, undefined, 'You selected the start time. Now, please choose a duration:', {
                        reply_markup: {
                            inline_keyboard: query.durationOptions
                        }
                    });
                } else if (callbackData.startsWith('duration_')) {
                    console.log(`Processing duration selection: ${callbackData}`.info);
                    const duration = Number(callbackData.split('_')[1]);
                    const telegramId = ctx.from.id;


                    const audioFilePath = ctx.session.audioFilePath;
                    if (!audioFilePath) {
                        throw new Error('Audio file path not found in session.');
                    }

                    const songDuration = await getAudioDuration(audioFilePath);

                    if ((ctx.session.startTime + duration) <= songDuration && ctx.session.startTime <= songDuration) {
                        const oggFilePath = path.join(__dirname, '../../../userdata', `${telegramId}`, `${currentAudioFileId}.ogg`);

                        if (!fs.existsSync(oggFilePath)) {
                            console.log(`Trimming audio with duration: ${duration}`.debug);
                            await convertToOgg(audioFilePath, oggFilePath, ctx.session.startTime, duration);
                        } else {
                            console.log(`.ogg file already exists: ${oggFilePath}`);
                        }

                        await ctx.replyWithVoice({ source: oggFilePath });

                        await ctx.telegram.editMessageText(chatId, ctx.session.promptMessageId, undefined, 'Your trimmed voice message has been sent!');

                        currentAudioFileId = null;
                        ctx.session.startTime = null;
                    } else {
                        console.log(`Invalid duration selection. Song duration: ${songDuration}, Selected: ${ctx.session.startTime + duration}`.err);
                        await ctx.telegram.editMessageText(chatId, ctx.session.promptMessageId, undefined, 'The selected start time and duration exceed the length of the audio file. Please choose a different duration:', {
                            reply_markup: {
                                inline_keyboard: query.startTimeOptions
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Error processing request:', error.message);
                await ctx.reply('There was an error while trying to update your request. Please try again.');
            }
        });
    }
};
