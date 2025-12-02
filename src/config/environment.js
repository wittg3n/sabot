"use strict";

const dotenv = require("dotenv");

let cachedConfig = null;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required in environment variables`);
  }
  return value;
}

function load() {
  if (cachedConfig) {
    return cachedConfig;
  }

  dotenv.config();

  cachedConfig = {
    botToken: getRequiredEnv("BOT_TOKEN"),
    channelId: getRequiredEnv("CHANNEL_ID"),
    databasePath: getRequiredEnv("DATABASE_PATH"),
    redisUrl: getRequiredEnv("REDIS_URL"),
  };

  return cachedConfig;
}

function getBotToken() {
  return load().botToken;
}

module.exports = {
  load,
  getBotToken,
};
