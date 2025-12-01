const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const getAudioDuration = async (filePath) => {
  await fs.promises.access(filePath, fs.constants.F_OK);

  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);

  const duration = parseFloat(stdout.trim());

  if (!Number.isFinite(duration)) {
    throw new Error(`Could not determine duration for file: ${filePath}`);
  }

  return duration;
};
const forcedStartTime = 0;
const forcedDuration = 30;
const convertToOgg = async (inputFile, outputFile) => {
  await fs.promises.access(inputFile, fs.constants.F_OK).catch(() => {
    throw new Error(`Input file does not exist: ${inputFile}`);
  });

  const outputDir = path.dirname(outputFile);
  await fs.promises.mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .setStartTime(forcedStartTime)
      .duration(forcedDuration)
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
