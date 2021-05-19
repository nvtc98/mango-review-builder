const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
const ffprobe = require("ffprobe"),
  ffprobeStatic = require("ffprobe-static");
const fs = require("fs");
const { getViettelAudio } = require("@modules/https");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobeStatic.path);
const command = ffmpeg();
let timemark = null;

const onProgress = (progress) => {
  // if (progress.timemark != timemark) {
  //   timemark = progress.timemark;
  //   console.log("Time mark: " + timemark + "...");
  // }
};

const onError = (err, stdout, stderr) => {
  console.log("Cannot process video: " + err.message);
};

const onEnd = () => {
  console.log("Finished processing.");
};

const getDuration = async (path) => {
  return await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(path, function (err, metadata) {
      if (err) {
        reject();
      }
      resolve(metadata.format.duration);
    });
  });
};

const mergeVideo = (videoList, output, cb) => {
  const command = ffmpeg();
  videoList.forEach((x) => command.input(x));
  command
    .on("progress", onProgress)
    .on("error", onError)
    .on("end", cb)
    .mergeToFile(output, "src/assets/temp");
};

const mergeAudio = (command, audio) => {
  command
    .addInput("src/assets/GSNA.mp4")
    .setStartTime("00:04:30")
    .setDuration("00:01:18")
    .addInput(audio)
    .complexFilter([
      {
        filter: "amix",
        options: { inputs: 2, duration: "longest" },
      },
    ])
    // .output("src/assets/output.mp4")
    .on("progress", onProgress)
    .on("error", onError)
    .on("end", onEnd)
    .saveToFile("src/assets/output.mp4", "src/assets/temp");
};

const addAudio = async (videoWithNoAudio, audio, output) => {
  const promise = (resolve, reject) => {
    ffmpeg()
      .addInput(videoWithNoAudio)
      .addInput(audio)
      .on("progress", onProgress)
      .on("error", onError)
      .on("end", resolve)
      .saveToFile(output, "src/assets/temp");
  };
  return await new Promise(promise);
};

const trimVideo = async (input, output, startTime, duration) => {
  const promise = (resolve, reject) => {
    ffmpeg()
      .input(input)
      .setStartTime(startTime)
      .setDuration(duration)
      .noAudio()
      .output(output)
      .on("progress", onProgress)
      .on("error", (e) => reject(e))
      .on("end", resolve)
      .run();
  };
  return await new Promise(promise);
};

module.exports = { trimVideo, addAudio, getDuration, mergeVideo };
