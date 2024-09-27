const { convertToOgg, getAudioDuration } = require('../utils/converter');
const { downloadFile } = require('../utils/downloader');
const path = require('path');
const colors = require('../colors.config');
const fs = require('fs')
module.exports = {
    musicToVoice: (bot) => {
        let currentAudioFileId = null;


        const startTimeOptions = [
            [{ text: '0', callback_data: 'start_time_0' }],
            [{ text: '00:30', callback_data: 'start_time_30' }],
            [{ text: '01:00', callback_data: 'start_time_60' }],
            [{ text: '01:30', callback_data: 'start_time_90' }]
        ];


        const durationOptions = [
            [{ text: '00:30', callback_data: 'duration_30' }],
            [{ text: '01:00', callback_data: 'duration_60' }],
            [{ text: '01:30', callback_data: 'duration_90' }],
            [{ text: '02:00', callback_data: 'duration_120' }]
        ];

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
                            inline_keyboard: startTimeOptions
                        }
                    });

                    ctx.session.promptMessageId = promptMessage.message_id;
                } else if (callbackData.startsWith('start_time_')) {
                    const startTime = Number(callbackData.split('_')[2]);
                    console.log(`Selected start time: ${startTime}`.debug);
                    ctx.session.startTime = startTime;


                    await ctx.telegram.editMessageText(chatId, ctx.session.promptMessageId, undefined, 'You selected the start time. Now, please choose a duration:', {
                        reply_markup: {
                            inline_keyboard: durationOptions
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
                        const oggFilePath = path.join(__dirname, '../userdata', `${telegramId}`, `${currentAudioFileId}.ogg`);

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
                                inline_keyboard: durationOptions
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
