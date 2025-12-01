const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const ffmpeg = require("fluent-ffmpeg");

const execFileAsync = promisify(execFile);

// محاسبه مدت آهنگ با ffprobe
const getAudioDuration = async (filePath) => {
  // مطمئن شو فایل وجود داره
  await fs.promises.access(filePath, fs.constants.F_OK);

  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error", // این فقط یک بار باید باشه
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);

  const duration = parseFloat(stdout.trim());
  if (!Number.isFinite(duration)) {
    throw new Error("duration error");
  }

  return duration;
};

// تنظیمات اجباری برای voice تلگرام (waveform)
const forcedStartTime = 0;
const forcedDuration = 61;

// تبدیل mp3 به OGG (voice) به فرمتی که تلگرام waveform نشون بده
const convertToOgg = async (inputFile, outputFile) => {
  await fs.promises.access(inputFile, fs.constants.F_OK);

  const outputDir = path.dirname(outputFile);
  await fs.promises.mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(inputFile)
      .setStartTime(forcedStartTime)
      .duration(forcedDuration)
      .noVideo()
      .audioCodec("libopus")
      .audioChannels(1)
      .audioBitrate("32k")
      .audioFilters("aformat=sample_rates=48000") // مهم برای waveform
      .outputOptions([
        "-y",
        "-map_metadata",
        "-1", // حذف metadata
        "-write_xing",
        "0", // ضروری برای voice
      ])
      .on("end", () => resolve(outputFile))
      .on("error", reject)
      .save(outputFile);
  });
};

module.exports = { convertToOgg, getAudioDuration };
