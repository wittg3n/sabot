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
      .audioFrequency(48000)
      .audioChannels(1)
      .outputOptions(["-y"])
      .on("end", () => resolve(outputFile))
      .on("error", (err) => reject(err))
      .save(outputFile);
  });
};

module.exports = { convertToOgg, getAudioDuration };
