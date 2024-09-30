const { convertToOgg, getAudioDuration } = require('../utils/converter');
const { downloadFile } = require('../utils/downloader');
const query = require('../../config/inlineQueries');
const path = require('path');
const fs = require('fs');
const { default: axios } = require('axios');

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
                    ctx.session.startTime = startTime;

                    await ctx.telegram.editMessageText(chatId, ctx.session.promptMessageId, undefined, 'You selected the start time. Now, please choose a duration:', {
                        reply_markup: {
                            inline_keyboard: query.durationOptions
                        }
                    });
                } else if (callbackData.startsWith('duration_')) {
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
                            await convertToOgg(audioFilePath, oggFilePath, ctx.session.startTime, duration);
                        }

                        // ارسال ویس به کاربر
                        await ctx.replyWithVoice({ source: oggFilePath });

                        // پرسش از کاربر برای ارسال به کانال
                        const channelPrompt = await ctx.reply('آیا می‌خواهید این ویس را به کانال ارسال کنید؟', {
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: 'بله', callback_data: 'publish_to_channel' }],
                                    [{ text: 'خیر', callback_data: 'no_publish' }]
                                ]
                            }
                        });

                        ctx.session.channelPromptMessageId = channelPrompt.message_id;

                        currentAudioFileId = null;
                        ctx.session.startTime = null;
                    } else {
                        await ctx.telegram.editMessageText(chatId, ctx.session.promptMessageId, undefined, 'The selected start time and duration exceed the length of the audio file. Please choose a different duration:', {
                            reply_markup: {
                                inline_keyboard: query.startTimeOptions
                            }
                        });
                    }
                } else if (callbackData === 'publish_to_channel') {
                    
                    const userChannelId = axios.get(`http://localhost:3001/user/get_all_channles/${ctx.from.id}`) // تابعی که شما باید برای دریافت آیدی کانال از دیتابیس بنویسید

                    if (!userChannelId) {
                        await ctx.reply('لطفاً آیدی کانال خود را بفرستید:');
                        ctx.session.awaitingChannelId = true; // نشان دادن اینکه در حال انتظار آیدی کانال هستیم
                    } else {
                        // ارسال ویس به کانال
                        await ctx.telegram.sendVoice(userChannelId, { source: oggFilePath });
                        await ctx.reply(`ویس به کانال ${userChannelId} ارسال شد.`);
                    }
                } else if (ctx.session.awaitingChannelId) {
                    const channelId = ctx.message.text; 
                    const response = await axios.get('http://localhost:3000/add_channel', {
                        params: {
                            telegramId,
                            channelId,
                            channelName
                        }
                    });
                    if(response){
                        ctx.reply(`آیدی کانال شما با موفقیت ذخیره شد: ${channelId}`);
                        ctx.session.awaitingChannelId = false; 
                    }
                    else{
                        ctx.reply('مشکلی در ذخیره کانال پیش آمده.',{
                            reply_markup:{
                                inline_keyboard: query.publishToChannel 
                            }
                        })
                    }

                }
            } catch (error) {
                console.error('Error processing request:', error.message);
                await ctx.reply('There was an error while trying to update your request. Please try again.');
            }
        });
    }
};
