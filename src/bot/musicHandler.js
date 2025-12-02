const { convertToOgg, getAudioDuration } = require("../services/musicConverterService");
const query = require("../../config/inlineQueries");
const path = require("path");
const fs = require("fs");
const { default: axios } = require("axios");

function sanitizeChannelLink(link) {
  const validTelegramURL =
    /(?:https?:\/\/)?(?:t\.me\/|telegram\.me\/)([\w\d_]+)/;
  const match = link.match(validTelegramURL);
  return match ? match[0] : null;
}

function extractChannelId(link) {
  const regex = /(?:https?:\/\/)?(?:t\.me\/|telegram\.me\/)(\w+)/;
  const match = link.match(regex);
  return match ? match[1] : null;
}

function extractChannelName(channelLink) {
  const urlParts = channelLink.split("/");
  return urlParts[urlParts.length - 1];
}

async function getChannelName(bot, channelId) {
  try {
    const chat = await bot.telegram.getChat(`@${channelId}`);
    return chat.title; // This will return the actual name of the channel
  } catch (error) {
    console.error("Error fetching channel name:", error.message);
    throw new Error("Unable to retrieve the channel name from Telegram.");
  }
}

module.exports = {
  musicToVoice: (bot) => {
    bot.on("callback_query", async (ctx) => {
      if (!ctx.session) {
        ctx.session = {};
      }

      const callbackData = ctx.callbackQuery.data;
      const chatId = ctx.chat?.id ?? ctx.session.chatId;

      if (chatId) {
        ctx.session.chatId = chatId;
      }

      try {
        if (callbackData === "create_voice") {
          const audioMessage = ctx.callbackQuery.message.audio;
          ctx.session.currentAudioFileId = audioMessage?.file_id || null;

          const promptMessage = await ctx.reply(
            "لظفا زمان شروع را انتخاب کنید",
            {
              reply_markup: {
                inline_keyboard: query.startTimeOptions,
              },
            }
          );

          ctx.session.promptMessageId = promptMessage.message_id;
        } else if (callbackData.startsWith("start_time_")) {
          const startTime = Number(callbackData.split("_")[2]);
          ctx.session.startTime = startTime;

          await ctx.telegram.editMessageText(
            chatId,
            ctx.session.promptMessageId,
            undefined,
            "حالا مدت زمان ویس را انتخاب کنید",
            {
              reply_markup: {
                inline_keyboard: query.durationOptions,
              },
            }
          );
        } else if (callbackData.startsWith("duration_")) {
          const duration = Number(callbackData.split("_")[1]);
          const telegramId = ctx.from.id;
          const audioFilePath = ctx.session.audioFilePath;
          const currentAudioFileId = ctx.session.currentAudioFileId;

          if (!audioFilePath) {
            throw new Error("Audio file path not found in session.");
          }

          const songDuration = await getAudioDuration(audioFilePath);

          if (
            ctx.session.startTime + duration <= songDuration &&
            ctx.session.startTime <= songDuration
          ) {
            const oggFilePath = path.join(
              __dirname,
              "../../../userdata",
              `${telegramId}`,
              `${currentAudioFileId}.ogg`
            );
            ctx.session.oggFilePath = oggFilePath;

            try {
              await fs.promises.access(oggFilePath, fs.constants.F_OK);
            } catch (accessError) {
              if (accessError.code !== "ENOENT") {
                throw accessError;
              }

              await convertToOgg(
                audioFilePath,
                oggFilePath,
                ctx.session.startTime,
                duration
              );
            }

            await ctx.replyWithVoice({ source: oggFilePath });

            const channelPrompt = await ctx.reply(
              "کانال مورد نظر را انتخاب کنید:",
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "در حال بارگذاری کانال‌ها...",
                        callback_data: "loading_channels",
                      },
                    ],
                  ],
                },
              }
            );

            ctx.session.channelPromptMessageId = channelPrompt.message_id;

            try {
              const response = await axios.get(
                `http://localhost:3001/user/get_all_channels/${telegramId}`
              );
              const channels = response.data.channels;
              const msg = response.data.message;
              console.log(msg);
              if (channels && channels.length > 0) {
                const inlineKeyboard = channels.map((channel) => [
                  {
                    text: channel.name,
                    callback_data: `sendtochannel.${channel.id}`,
                  },
                ]);

                inlineKeyboard.push([
                  {
                    text: "اضافه کردن کانال جدید",
                    callback_data: "add_new_channel",
                  },
                ]);

                await ctx.telegram.editMessageText(
                  chatId,
                  ctx.session.channelPromptMessageId,
                  undefined,
                  "کانال مورد نظر را انتخاب کنید:",
                  {
                    reply_markup: {
                      inline_keyboard: inlineKeyboard,
                    },
                  }
                );
              } else {
                await ctx.telegram.editMessageText(
                  chatId,
                  ctx.session.channelPromptMessageId,
                  undefined,
                  "هیچ کانالی یافت نشد. لطفاً یک کانال جدید اضافه کنید:",
                  {
                    reply_markup: {
                      inline_keyboard: [
                        [
                          {
                            text: "اضافه کردن کانال جدید",
                            callback_data: "add_new_channel",
                          },
                        ],
                      ],
                    },
                  }
                );
              }
            } catch (apiError) {
              console.error("API Error:", apiError.message);
              await ctx.telegram.editMessageText(
                chatId,
                ctx.session.channelPromptMessageId,
                undefined,
                "خطایی در دریافت کانال‌ها رخ داد. لطفاً دوباره امتحان کنید."
              );
            }
            ctx.session.currentAudioFileId = null;
            ctx.session.startTime = null;
          } else {
            await ctx.telegram.editMessageText(
              chatId,
              ctx.session.promptMessageId,
              undefined,
              "آغاز و پایانی که انتخاب کردید صحیح نیست. لطفا دوباره انتخاب کنید:",
              {
                reply_markup: {
                  inline_keyboard: query.startTimeOptions,
                },
              }
            );
          }
        } else if (callbackData.startsWith("sendtochannel.")) {
          const channel = callbackData.split(".")[1];
          const selectedChannelId = channel.startsWith("-100")
            ? channel
            : "@" + channel;

          console.log(
            "Attempting to send voice to channel:",
            selectedChannelId
          ); // Log channel ID

          try {
            // Attempt to send the voice message to the selected channel
            await ctx.telegram.sendVoice(selectedChannelId, {
              source: ctx.session.oggFilePath,
            });
            ctx.session.oggFilePath = false;
            await ctx.reply(`ویس به کانال ${selectedChannelId} ارسال شد.`);
          } catch (error) {
            console.error("Error sending voice to channel:", error.message);
            await ctx.reply(
              "خطایی در ارسال صدا به کانال رخ داد. لطفاً دوباره امتحان کنید."
            );

            // Check if the error is due to the chat not being found
            if (error.response && error.response.status === 400) {
              await ctx.reply(
                "کانال پیدا نشد. لطفاً مطمئن شوید که لینک کانال صحیح است و ربات به آن دسترسی دارد."
              );
            }
          }
        } else if (callbackData === "add_new_channel") {
          await ctx.reply("لطفاً لینک کانال جدید را وارد کنید:");
          ctx.session.awaitingChannelLink = true;
        }
      } catch (error) {
        console.error("Error processing request:", error.message);
        await ctx.reply("مشکلی پیش آمده، دوباره امتحان کنید.");
      }
    });

    bot.on("text", async (ctx) => {
      if (ctx.session.awaitingChannelLink) {
        const channelLink = ctx.message.text;
        const sanitizedLink = sanitizeChannelLink(channelLink);

        if (!sanitizedLink) {
          await ctx.reply(
            "لینک نامعتبر است. لطفاً یک لینک معتبر از تلگرام وارد کنید."
          );
          return;
        }

        const telegramId = ctx.from.id;
        const channelId = extractChannelId(sanitizedLink);

        try {
          const channelName = await getChannelName(bot, channelId);

          // Add the new channel to the user's list
          await axios.get("http://localhost:3001/user/add_channel", {
            params: { telegramId, channelId, channelName },
          });

          await ctx.reply(`کانال ${channelName} با موفقیت اضافه شد.`);

          // Fetch the updated list of channels, including the newly added one
          const response = await axios.get(
            `http://localhost:3001/user/get_all_channels/${telegramId}`
          );
          const channels = response.data.channels;

          if (channels.length > 0) {
            const inlineKeyboard = channels.map((channel) => [
              {
                text: channel.name,
                callback_data: `sendtochannel.${channel.id}`,
              },
            ]);

            inlineKeyboard.push([
              {
                text: "اضافه کردن کانال جدید",
                callback_data: "add_new_channel",
              },
            ]);

            // Display the updated list of channels, including the newly added one
            await ctx.reply("کانال‌های شما:", {
              reply_markup: {
                inline_keyboard: inlineKeyboard,
              },
            });
          } else {
            await ctx.reply(
              "هیچ کانالی یافت نشد. لطفاً یک کانال جدید اضافه کنید.",
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: "اضافه کردن کانال جدید",
                        callback_data: "add_new_channel",
                      },
                    ],
                  ],
                },
              }
            );
          }
        } catch (error) {
          console.error("Error adding channel:", error.message);
          await ctx.reply(
            "خطایی در افزودن کانال رخ داد. لطفاً دوباره امتحان کنید."
          );
        }

        ctx.session.awaitingChannelLink = false;
      }
    });
  },
};
