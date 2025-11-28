'use strict';

require('dotenv').config();

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required in environment variables`);
  }
  return value;
}

function parseAllowedUsers() {
  const raw = process.env.ALLOWED_USER_IDS;

  if (!raw) {
    return [115187503, 73976040];
  }

  return raw
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id));
}

module.exports = {
  load() {
    return {
      botToken: getRequiredEnv('BOT_TOKEN'),
      channelId: getRequiredEnv('CHANNEL_ID'),
      databasePath: process.env.DATABASE_PATH || 'data.sqlite',
      allowedUserIds: parseAllowedUsers(),
    };
  },
};
