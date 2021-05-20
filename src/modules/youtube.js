const fs = require("fs");
const youtubedl = require("youtube-dl");

const downloadYoutube = (url, output) => {
  const video = youtubedl(
    url,
    // Optional arguments passed to youtube-dl.
    ["--format=18"],
    // Additional options can be given for calling `child_process.execFile()`.
    { cwd: __dirname }
  );

  // Will be called when the download starts.
  video.on("info", function (info) {
    console.log("Download started");
    console.log("filename: " + info._filename);
    console.log("size: " + info.size);
  });

  video.pipe(fs.createWriteStream(output));

  // Will be called if download was already completed and there is nothing more to download.
  video.on("complete", function complete(info) {
    "use strict";
    console.log("filename: " + info._filename + " already downloaded.");
  });

  video.on("end", function () {
    console.log("finished downloading!");
  });
};

module.exports = { downloadYoutube };
