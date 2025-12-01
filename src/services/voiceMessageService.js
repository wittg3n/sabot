const fs = require("fs");

const sendVoiceMessage = async (telegramId, oggFilePath) => {
  const url = `https://api.telegram.org/bot${process.env.TOKEN}/sendVoice`;
  const formData = {
    chat_id: telegramId,
    voice: fs.createReadStream(oggFilePath),
  };

  formData.append("chat_id", telegramId);
  formData.append("voice", fs.createReadStream(oggFilePath));

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to send voice message: ${response.statusText}`);
  }
};
module.exports = sendVoiceMessage;
