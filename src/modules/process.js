const { getFPTAudio } = require("@modules/axios");
const fs = require("fs");
const {
  trimVideo,
  addAudio,
  getDuration,
  mergeVideo,
} = require("@modules/ffmpeg");

let processData = {};

const getAvailability = () => {
  return !processData.session;
};

const getProgess = () => {
  return processData.isDone ? -1 : Math.round(processData.progress) || 0;
};

const addProgress = (value) => {
  processData.progress += value;
};

const getOutputPath = () =>
  processData.outputPath.replace("src/assets/", "assets/");

const removeFiles = (session, length, inputVideoPath) => {
  try {
    fs.unlinkSync("src/assets/temp/list-" + session + ".txt");
    fs.unlinkSync(inputVideoPath);
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

const processVideo = async (session, csvData, videoPath, videoName) => {
  try {
    processData = { session, progress: 0 };

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

    let audioList = [];
    let videoList = [];
    for (const item of data) {
      const content = item["Nội dung thuyết minh"];
      let audio = null;
      if (content) {
        audio = await getFPTAudio(content);
      }
      audioList.push(audio);
      // audioList.push(
      //   "https://file01.fpt.ai/text2speech-v5/short/2021-05-19/minhquang.+1.ca895bd8a6eee25796a0b60ea8f622d0.mp3"
      // );
      addProgress(20 / data.length);
    }
    fs.writeFile(
      "src/assets/temp/list-" + session + ".txt",
      audioList.join("\n"),
      function (err) {
        if (err) return console.log(err);
        console.log("Audio url saved to file.");
      }
    );

    console.log("AudioList", audioList);
    let index = 0;
    for (const item of data) {
      const audioDuration = await getDuration(audioList[index]);
      const startTime = item["TIme bắt đầu"];
      console.log("Start triming: ", startTime, audioDuration);
      if (!startTime || !audioDuration) {
        return;
      }
      await trimVideo(
        videoPath,
        `src/assets/temp/video-${session}-${index}.mp4`,
        startTime,
        audioDuration + 0.5
      );
      addProgress(35 / data.length);
      console.log("Add audio:", index, startTime, audioDuration);
      const videoAudioPath = `src/assets/temp/video-audio-${session}-${index}.mp4`;
      await addAudio(
        `src/assets/temp/video-${session}-${index}.mp4`,
        audioList[index],
        videoAudioPath
      );
      videoList.push(videoAudioPath);
      addProgress(35 / data.length);
      ++index;
    }
    console.log("Merge videos...");
    // const outputPath = "src/assets/output-" + session + ".mp4";
    const outputPath = "src/assets/output.mp4";
    mergeVideo(videoList, outputPath, () => {
      console.log("Done.", outputPath);
      processData = { isDone: true, outputPath };
      removeFiles(session, data.length, videoPath);
    });
  } catch (error) {
    console.log("Error:", error);
  }
};

module.exports = { processVideo, getAvailability, getProgess, getOutputPath };
