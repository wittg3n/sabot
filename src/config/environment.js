'use strict';

require('dotenv').config();

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required in environment variables`);
  }
  return value;
}

module.exports = {
  load() {
    return {
      botToken: getRequiredEnv('BOT_TOKEN'),
      channelId: getRequiredEnv('CHANNEL_ID'),
      databasePath: process.env.DATABASE_PATH || 'data.sqlite',
    };
  },
};
