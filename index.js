const { createApp } = require("./src/app");

async function main() {
  const { bot } = await createApp();
  await bot.launch();
  console.log("Bot started");
}

main().catch((error) => {
  console.error("Failed to start bot", error);
  process.exit(1);
});
