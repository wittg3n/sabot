const path = require('path');
const fs = require('fs');
const axios = require('axios');

const downloadFile = async (fileId, telegramId) => {
    try {
        console.log('we are in downloader.js')
        // Step 1: Get file path from Telegram API
        const fileResponse = await axios.get(`https://api.telegram.org/bot${process.env.TOKEN}/getFile`, {
            params: { file_id: fileId }
        });

        const filePath = fileResponse.data.result.file_path;
        const downloadUrl = `https://api.telegram.org/file/bot${process.env.TOKEN}/${filePath}`;

        // Step 2: Download the file
        const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });

        // Step 3: Create the output directory if it doesn't exist
        const outputDir = path.join(__dirname, '../userdata', String(telegramId));
        
        // Ensure the output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true }); // Create directory recursively
            console.log(`Directory created: ${outputDir}`);
        }

        // Step 4: Define the output file path
        const fileOutputPath = path.join(outputDir, `${fileId}.mp3`);

        // Step 5: Write the file to disk
        fs.writeFileSync(fileOutputPath, response.data);
        console.log(`File successfully downloaded: ${fileOutputPath}`);
        return fileOutputPath;

    } catch (error) {
        console.error('Error downloading file:', error.message);
        throw new Error('Failed to download the file.');
    }
};

module.exports = { downloadFile };
