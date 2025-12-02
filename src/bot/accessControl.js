'use strict';

const logger = require('../logger');

const allowedUserIds = new Set([115187503, 73976040]);

async function accessControl(ctx, next) {
  const userId = ctx.from?.id;

  if (!userId || !allowedUserIds.has(userId)) {
    logger.warn('Unauthorized access attempt', {
      userId,
      updateType: ctx.updateType,
      chatId: ctx.chat?.id,
    });

    if (ctx.reply) {
      await ctx.reply('شما به این بات دسترسی ندارید.');
    }

    return;
  }

  return next();
}

module.exports = accessControl;
