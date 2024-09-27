const { convertToOgg, getAudioDuration } = require('../utils/converter');
const { downloadFile } = require('../utils/downloader');
const path = require('path');
const colors = require('../colors.config');
const fs = require('fs')
module.exports = {
    musicToVoice: (bot) => {
        let currentAudioFileId = null; // Store the audio file ID for processing later

        // Inline keyboard for start time options
        const startTimeOptions = [
            [{ text: '0', callback_data: 'start_time_0' }],
            [{ text: '00:30', callback_data: 'start_time_30' }],
            [{ text: '01:00', callback_data: 'start_time_60' }],
            [{ text: '01:30', callback_data: 'start_time_90' }]
        ];

        // Inline keyboard for duration options
        const durationOptions = [
            [{ text: '00:30', callback_data: 'duration_30' }],
            [{ text: '01:00', callback_data: 'duration_60' }],
            [{ text: '01:30', callback_data: 'duration_90' }],
            [{ text: '02:00', callback_data: 'duration_120' }]
        ];

        bot.on('callback_query', async (ctx) => {
            // Ensure session is initialized
            if (!ctx.session) {
                ctx.session = {};
            }

            const callbackData = ctx.callbackQuery.data;
            const messageId = ctx.session.messageId;
            const chatId = ctx.session.chatId;

            try {
                if (callbackData === 'create_voice') {
                    currentAudioFileId = ctx.callbackQuery.message.audio.file_id; // Store the audio file ID

                    // Prompt user to select start time with inline keyboard
                    const promptMessage = await ctx.reply('Please select the start time:', {
                        reply_markup: {
                            inline_keyboard: startTimeOptions
                        }
                    });

                    ctx.session.promptMessageId = promptMessage.message_id; // Store the prompt message ID
                } else if (callbackData.startsWith('start_time_')) {
                    const startTime = Number(callbackData.split('_')[2]); // Extract start time in seconds
                    console.log(`Selected start time: ${startTime}`.debug);
                    ctx.session.startTime = startTime; // Store start time in session

                    // Edit prompt message to choose duration
                    await ctx.telegram.editMessageText(chatId, ctx.session.promptMessageId, undefined, 'You selected the start time. Now, please choose a duration:', {
                        reply_markup: {
                            inline_keyboard: durationOptions
                        }
                    });
                } else if (callbackData.startsWith('duration_')) {
                    console.log(`Processing duration selection: ${callbackData}`.info);
                    const duration = Number(callbackData.split('_')[1]);
                    const telegramId = ctx.from.id;

                    // Use the audio file path from the session
                    const audioFilePath = ctx.session.audioFilePath;
                    if (!audioFilePath) {
                        throw new Error('Audio file path not found in session.');
                    }

                    const songDuration = await getAudioDuration(audioFilePath);

                    if ((ctx.session.startTime + duration) <= songDuration && ctx.session.startTime <= songDuration) {
                        const oggFilePath = path.join(__dirname, '../userdata', `${telegramId}`, `${currentAudioFileId}.ogg`);

                        // Check if the .ogg file already exists
                        if (!fs.existsSync(oggFilePath)) {
                            console.log(`Trimming audio with duration: ${duration}`.debug);
                            await convertToOgg(audioFilePath, oggFilePath, ctx.session.startTime, duration);
                        } else {
                            console.log(`.ogg file already exists: ${oggFilePath}`);
                        }

                        await ctx.replyWithVoice({ source: oggFilePath });

                        // Edit the prompt message to inform the user that the voice message has been sent
                        await ctx.telegram.editMessageText(chatId, ctx.session.promptMessageId, undefined, 'Your trimmed voice message has been sent!');

                        // Clear session data for the next request
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
