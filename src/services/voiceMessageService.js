const axios = require("axios");
const fs = require("fs");

const sendVoiceMessage = async (telegramId, oggFilePath) => {
  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendVoice`;
  const formData = {
    chat_id: telegramId,
    voice: fs.createReadStream(oggFilePath),
  };

  await axios.post(url, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
module.exports = sendVoiceMessage;
