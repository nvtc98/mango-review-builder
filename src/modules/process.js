const {
  getFPTAudio,
  getVBEEAudio,
  getVBEEAudioData,
} = require("@modules/axios");
const fs = require("fs");
const {
  trimVideo,
  trimVideoWithAudio,
  addAudio,
  getDuration,
  mergeVideo,
} = require("@modules/ffmpeg");
const { downloadYoutube } = require("./youtube");
const _ = require("lodash");
const fshare = require("./fshare");

let processData = {};
let isBusy = false;

const getAvailability = () => {
  return !isBusy;
};

const getProgess = (session) => {
  if (!processData[session]) {
    return 0;
  }
  return processData[session].isDone
    ? -1
    : Math.round(processData[session].progress) || 0;
};

const addProgress = (session, value) => {
  processData[session].progress += value;
};

const getOutputPath = (session) =>
  processData[session].outputPath.replace("src/assets/", "assets/");

const removeFiles = (session, length, inputVideoPath) => {
  try {
    fs.unlinkSync(inputVideoPath);
    fs.unlinkSync("src/assets/temp/input-" + session + "-owned.mp4"); // TODO: need dynamic
  } catch {}
  try {
    for (let i = 0; i < length; ++i) {
      const videoPath = `src/assets/temp/video-${session}-${i}.mp4`;
      const videoAudioPath = `src/assets/temp/video-audio-${session}-${i}.mp4`;
      fs.unlinkSync(videoAudioPath);
      fs.unlinkSync(videoPath);
    }
  } catch (err) {
    console.error(err);
  }
};

const getVideoUrl = async (url, pathToDownload) => {
  let videoPath = url;
  if (url.search("youtube.com") !== -1) {
    await downloadYoutube(url, pathToDownload);
    videoPath = pathToDownload;
  } else if (url.search("fshare.vn") !== -1) {
    videoPath = await fshare.download(url);
  }
  console.log("videoPath", videoPath);
  return videoPath;
};

const processVideo = async (session, csvData, videoName) => {
  try {
    isBusy = true;
    processData[session] = { session, progress: 0 };

    // filter
    let data = [],
      isSelectedVideoName = false;
    csvData.forEach((x) => {
      if (x["Tên phim"] === videoName) {
        isSelectedVideoName = true;
      } else if (x["Tên phim"] && x["Tên phim"] != videoName) {
        isSelectedVideoName = false;
      }
      if (isSelectedVideoName) {
        data.push(x);
      }
    });
    console.log("Start processing:", data.length);

    // get audio
    let audioList = [];
    let videoList = [];
    for (const item of data) {
      const content = item["Nội dung thuyết minh"];
      let audio = null;
      if (content) {
        if (!audio) {
          const audioResult = await getVBEEAudio(content);
          audioList.push(_.get(audioResult, "data.id", null));
        }
      } else {
        audioList.push(null);
      }
      addProgress(session, 10 / data.length);
    }
    console.log("audioList", audioList);

    // download video
    const url = data[0]["Link phim"];
    let videoPath = await getVideoUrl(url, "src/assets/temp/input.mp4");
    addProgress(session, 10);

    let index = 0;
    for (const item of data) {
      const audio = audioList[index]
        ? await getVBEEAudioData(audioList[index])
        : null;
      console.log("vbee audio", audio);
      let isAudioAvailable = !!audio;
      let audioDuration = isAudioAvailable ? await getDuration(audio) : null;
      if (!audioDuration) {
        isAudioAvailable = false;
      }
      const videoAudioPath = `src/assets/temp/video-audio-${session}-${index}.mp4`;
      const startTime = item["TIme bắt đầu"];
      console.log("Start triming: ", startTime, audioDuration);
      if (!startTime) {
        return;
      }

      let _videoPath = videoPath;
      // owned video
      if (item["Link phim"] && item["Link phim"] !== url) {
        _videoPath = await getVideoUrl(
          item["Link phim"],
          "src/assets/temp/input-" + session + "-owned.mp4"
        );
      }

      if (isAudioAvailable) {
        // trim video
        await trimVideo(
          _videoPath,
          `src/assets/temp/video-${session}-${index}.mp4`,
          startTime,
          audioDuration + 0.5
        );
        addProgress(session, 35 / data.length);

        // add audio to trimmed video
        console.log("Add audio:", index, startTime, audioDuration);
        await addAudio(
          `src/assets/temp/video-${session}-${index}.mp4`,
          audio,
          videoAudioPath
        );
        videoList.push(videoAudioPath);
      } else {
        console.log("no audio", startTime, item["Thời lượng đoạn phim"]);
        await trimVideoWithAudio(
          _videoPath,
          videoAudioPath,
          startTime,
          item["Thời lượng đoạn phim"]
        );
        addProgress(session, 35 / data.length);
        videoList.push(videoAudioPath);
      }

      addProgress(session, 35 / data.length);
      ++index;
    }

    // merge videos
    console.log("Merge videos...");
    // const outputPath = "src/assets/output-" + session + ".mp4";
    const outputPath = `src/assets/output-${session}.mp4`;
    mergeVideo(videoList, outputPath, () => {
      console.log("Done.", outputPath);
      processData[session] = { isDone: true, outputPath };
      // writeJSON(jsonData);
      isBusy = false;
      removeFiles(session, data.length, videoPath);
    });
  } catch (error) {
    console.log("Error:", error);
    processData[session].progress = -2;
    isBusy = false;
  }
};

module.exports = { processVideo, getAvailability, getProgess, getOutputPath };
