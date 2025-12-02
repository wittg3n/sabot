const path = require("path");
const fs = require("fs");
const { getBotToken } = require("../config/environment");

const downloadFile = async (fileId, telegramId) => {
  try {
    console.log("we are in downloader.js");

    const botToken = getBotToken();
    const getFileUrl = new URL(
      `https://api.telegram.org/bot${botToken}/getFile`
    );
    getFileUrl.searchParams.set("file_id", fileId);

    const fileResponse = await fetch(getFileUrl);

    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file info: ${fileResponse.statusText}`);
    }

    const fileMetadata = await fileResponse.json();
    const filePath = fileMetadata?.result?.file_path;

    if (!filePath) {
      throw new Error("Telegram did not return a file path for the audio.");
    }

    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    const fileBuffer = Buffer.from(await response.arrayBuffer());

    const outputDir = path.join(__dirname, "../../userdata", String(telegramId));

    await fs.promises.mkdir(outputDir, { recursive: true });
    const fileOutputPath = path.join(outputDir, `${fileId}.mp3`);

    await fs.promises.writeFile(fileOutputPath, fileBuffer);
    console.log(`File successfully downloaded: ${fileOutputPath}`);
    return fileOutputPath;
  } catch (error) {
    console.error("Error downloading file:", error.message);
    throw new Error("Failed to download the file.");
  }
};

module.exports = { downloadFile };
