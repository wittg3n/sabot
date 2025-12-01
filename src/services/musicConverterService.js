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

const convertToOgg = async (inputFile, outputFile, startTime, duration) => {
  await fs.promises.access(inputFile, fs.constants.F_OK).catch(() => {
    throw new Error(`Input file does not exist: ${inputFile}`);
  });

  const outputDir = path.dirname(outputFile);
  await fs.promises.mkdir(outputDir, { recursive: true });

  const args = [
    "-y",
    "-ss",
    String(startTime ?? 0),
    "-t",
    String(duration),
    "-i",
    inputFile,
    "-acodec",
    "libopus",
    "-b:a",
    "25k",
    "-ar",
    "48000",
    "-ac",
    "1",
    outputFile,
  ];

  await execFileAsync("ffmpeg", args);
  return outputFile;
};

module.exports = { convertToOgg, getAudioDuration };
