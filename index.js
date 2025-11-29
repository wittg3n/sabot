const { createApp } = require("./src/app");
const logger = require("./src/logger");

async function main() {
  const { bot } = await createApp();
  await bot.launch();
  logger.info("Bot started and polling is active");
}

main().catch((error) => {
  logger.error("Failed to start bot", error);
  process.exit(1);
});
