const { getFPTAudio } = require("@modules/axios");
const fs = require("fs");
const {
  trimVideo,
  addAudio,
  getDuration,
  mergeVideo,
} = require("@modules/ffmpeg");
const { downloadYoutube } = require("./youtube");
const { readJSON, writeJSON } = require("./file");

let processData = {};

const getAvailability = () => {
  return !processData[session].session;
};

const getProgess = (session) => {
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
    // fs.unlinkSync(inputVideoPath);
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

const processVideo = async (session, csvData, videoName) => {
  try {
    processData[session] = { session, progress: 0 };
    let jsonData = readJSON();

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
        if (jsonData.audio[content]) {
          const audioDuration = await getDuration(jsonData.audio[content]);
          if (audioDuration) {
            audio = jsonData.audio[content];
          }
        }
        if (!audio) {
          // audio = await getFPTAudio(content);
        }
        // audioList.push(audio);
        audioList.push(
          "https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_700KB.mp3"
        );
        // jsonData.audio[content] = audio;
        jsonData.audio[content] =
          "https://file-examples-com.github.io/uploads/2017/11/file_example_MP3_700KB.mp3";
      } else {
        audioList.push(null);
      }
      addProgress(session, 10 / data.length);
    }
    console.log("AudioList", audioList);

    // download video
    const url = data[0]["Link phim"];
    let videoPath = null;
    if (url.search("youtube.com") !== -1) {
      await downloadYoutube(url, "src/assets/temp/input.mp4");
      videoPath = "src/assets/temp/input.mp4";
    }
    addProgress(session, 10);

    let index = 0;
    for (const item of data) {
      const audioDuration = await getDuration(audioList[index]);
      const videoAudioPath = `src/assets/temp/video-audio-${session}-${index}.mp4`;
      let isAudioAvailable = !!audioDuration;
      if (!audioDuration) {
        audioDuration = item["Thời lượng đoạn phim"];
      }
      const startTime = item["TIme bắt đầu"];
      console.log("Start triming: ", startTime, audioDuration);
      if (!startTime || !audioDuration) {
        return;
      }

      if (isAudioAvailable) {
        // trim video
        await trimVideo(
          videoPath,
          `src/assets/temp/video-${session}-${index}.mp4`,
          startTime,
          audioDuration + 0.5
        );
        addProgress(session, 35 / data.length);

        // add audio to trimmed video
        console.log("Add audio:", index, startTime, audioDuration);
        await addAudio(
          `src/assets/temp/video-${session}-${index}.mp4`,
          audioList[index],
          videoAudioPath
        );
        videoList.push(videoAudioPath);
      } else {
        await trimVideo(
          videoPath,
          videoAudioPath,
          startTime,
          audioDuration + 0.5
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
      writeJSON(jsonData);
      removeFiles(session, data.length, videoPath);
    });
  } catch (error) {
    console.log("Error:", error);
  }
};

module.exports = { processVideo, getAvailability, getProgess, getOutputPath };
