const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { convertToOgg } = require('../utils/converter');
const { downloadFile } = require('../utils/downloader');

const musicToVoice = {
    handle: async (audioFileId, chatId, telegramsId) => {
        const outputDir = path.join(__dirname, '../userdata', String(telegramsId));

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        try {
            const inputFilePath = await downloadFile(process.env.TOKEN, audioFileId, telegramsId);
            const outputFilePath = path.join(outputDir, `${audioFileId}.ogg`);
            await convertToOgg(inputFilePath, outputFilePath);

            // Send the OGG file to Telegram
            const formData = new FormData();
            formData.append('voice', fs.createReadStream(outputFilePath));

            const response = await axios.post(`https://api.telegram.org/bot${process.env.TOKEN}/sendVoice`, {
                chat_id: chatId,
                voice: formData,
            }, {
                headers: {
                    ...formData.getHeaders(),
                },
            });

            console.log('Voice sent:', response.data);
            return outputFilePath;
        } catch (err) {
            console.error('Error processing audio file:', err);
            await axios.post(`https://api.telegram.org/bot${process.env.TOKEN}/sendMessage`, {
                chat_id: chatId,
                text: 'There was an error processing your file.',
            });
        }
    }
};

module.exports = musicToVoice;
