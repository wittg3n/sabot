"use strict";

// src/services/voiceMessageService.js
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const logger = require("../logger");

// مطمئن می‌شیم .env (اگر هست) لود شده
require("dotenv").config();

function getBotToken() {
  // اول BOT_TOKEN (مطابق environment.js)
  // اگر نباشد، برای سازگاری با تنظیمات قبلی، TOKEN را هم چک می‌کنیم
  return process.env.BOT_TOKEN || process.env.TOKEN || null;
}

const sendVoiceMessage = async (telegramId, oggFilePath) => {
  const botToken = getBotToken();

  if (!botToken) {
    const msg = "BOT_TOKEN (or TOKEN) is not configured in environment";
    logger.error(msg, { chatId: telegramId, oggFilePath });
    throw new Error(msg);
  }

  const url = `https://api.telegram.org/bot${botToken}/sendVoice`;

  try {
    const form = new FormData();

    form.append("chat_id", telegramId);
    form.append("voice", fs.createReadStream(oggFilePath));

    const response = await axios.post(url, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    if (!response.data.ok) {
      throw new Error(
        `Telegram API error: ${response.data.description || "Unknown error"}`
      );
    }

    logger.info("Voice message sent via HTTP API", {
      chatId: telegramId,
      url,
      telegramResponse: response.data,
    });

    return response.data;
  } catch (error) {
    // متادیتای «ایمن» برای لاگ، بدون ساختار حلقه‌ای axios
    const safeMeta = {
      chatId: telegramId,
      url,
      message: error.message,
      code: error.code,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
    };

    logger.error("Failed to send voice message via HTTP API", safeMeta);
    throw error;
  }
};

module.exports = sendVoiceMessage;
