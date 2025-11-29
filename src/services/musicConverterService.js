const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

const getAudioDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      const duration = metadata.format.duration;
      resolve(duration);
    });
  });
};

const convertToOgg = async (inputFile, outputFile, startTime, duration) => {
  await fs.promises.access(inputFile, fs.constants.F_OK).catch(() => {
    throw new Error(`Input file does not exist: ${inputFile}`);
  });

  const outputDir = path.dirname(outputFile);
  await fs.promises.mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .setStartTime(startTime)
      .duration(duration)
      .audioCodec("libopus")
      .audioBitrate("25k")
      .audioFilters("aformat=sample_rates=48000")
      .audioChannels(1)
      .on("end", () => {
        console.log(`Conversion finished successfully: ${outputFile}`);
        resolve(outputFile);
      })
      .on("error", (error) => {
        console.error("Error occurred during conversion:", error);
        reject(error);
      })
      .save(outputFile);
  });
};

module.exports = { convertToOgg, getAudioDuration };
