const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

const getAudioDuration = (filePath) =>
  new Promise((resolve, reject) => {
    fs.promises
      .access(filePath, fs.constants.F_OK)
      .then(() => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            reject(err);
            return;
          }

          const duration = metadata?.format?.duration;

          if (!Number.isFinite(duration)) {
            reject(new Error(`Could not determine duration for file: ${filePath}`));
            return;
          }

          resolve(duration);
        });
      })
      .catch((err) => reject(err));
  });

const convertToOgg = async (inputFile, outputFile, startTime, duration) => {
  await fs.promises.access(inputFile, fs.constants.F_OK).catch(() => {
    throw new Error(`Input file does not exist: ${inputFile}`);
  });

  const outputDir = path.dirname(outputFile);
  await fs.promises.mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .setStartTime(startTime ?? 0)
      .duration(duration)
      .audioCodec("libopus")
      .audioBitrate("25k")
      .audioFrequency(48000)
      .audioChannels(1)
      .outputOptions(["-y"])
      .on("end", () => resolve(outputFile))
      .on("error", (err) => reject(err))
      .save(outputFile);
  });
};

module.exports = { convertToOgg, getAudioDuration };
