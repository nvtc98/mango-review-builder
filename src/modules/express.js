const express = require("express");
const fs = require("fs");
const fileUpload = require("express-fileupload");
const { readCSV } = require("@modules/csv");
const {
  processVideo,
  getProgess,
  getAvailability,
  getOutputPath,
} = require("./process");
const _ = require("lodash");
const path = require("path");
const { removeFile, writeJSON, readJSON } = require("./file");

const defaultPort = 5000;
const app = express();

const addQueryString = (response, queryObject) => {
  let queryArray = [];
  Object.keys(queryObject).forEach((x) => {
    queryArray.push(`${x}=${queryObject[x]}`);
  });
  response.redirect("/?" + queryArray.join("&"));
};

const saveFile = (file, path, cb) => {
  file.mv(path, function (err) {
    if (err) {
      cb && cb(null, err);
    }
    cb && cb(path, null);
  });
};

const removeFiles = () => {
  const tempDir = "src/assets/temp";
  const uploadDir = "src/assets/upload";

  fs.readdir(tempDir, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(tempDir, file), (err) => {
        if (err) throw err;
      });
    }
  });

  fs.readdir(uploadDir, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(uploadDir, file), (err) => {
        if (err) throw err;
      });
    }
  });
};

const getPath = (session, fileName) => {
  return "src/assets/upload/" + session + "-" + fileName;
  // return "tmp/" + session + "-" + fileName;
};

const startServer = (port = defaultPort) => {
  let csvData = {};
  // app.use(function (req, res, next) {
  // 	res.header('Access-Control-Allow-Origin', '*');
  // 	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  // 	next();
  // });

  removeFiles();

  app.use(fileUpload());
  app.use(express.static("public"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/assets", express.static("./src/assets"));
  app.use("/", express.static("./src/views"));

  app.get("/", async (request, response) => {
    console.log(`Get a request from: ${request.url}`);
    response.sendFile(path.resolve("src/views/index.html"));
  });

  app.post("/upload-csv", function (request, response) {
    const session = _.get(request, "body.session", null);
    if (!session) {
      return response.status(400).send("No session included.");
    }
    if (!request.files || Object.keys(request.files).length === 0) {
      return response.status(400).send("No files were uploaded.");
    }

    let csvFile = request.files.csvFile;
    console.log("Got csv file.");

    // Use the mv() method to place the file somewhere on your server
    saveFile(csvFile, getPath(session, "csv.csv"), (_path, err) => {
      if (err) {
        console.log(err);
        return response.status(400).send("Failed to upload file.");
      }
      readCSV(_path, (data) => {
        csvData[session] = data;
        response.sendFile(path.resolve("src/views/index.html"));
        removeFile(getPath(session, "csv.csv"));
      });
    });
  });

  app.post("/get-csv-data", function (request, response) {
    const session = _.get(request, "body.session", null);
    if (csvData[session]) {
      const list = Object.keys(_.groupBy(csvData[session], "Tên phim")).filter(
        (x) => x.trim()
      );
      response.status(200).send(list);
      return;
    }
    response.status(200).send(null);
  });

  app.post("/process", function (request, response) {
    const session = _.get(request, "body.session", null);
    const videoSelect = _.get(request, "body.videoSelect", null);
    // if (!request.files || Object.keys(request.files).length === 0) {
    //   return response.status(400).send("No files were uploaded.");
    // }

    // // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    // let file = request.files.videoFile;
    // saveFile(file, getPath(session, file.name), (_path, err) => {
    //   if (err) {
    //     console.log(err);
    //     return response.status(400).send("Failed to upload file.");
    //   }
    if (!getAvailability()) {
      return response
        .status(400)
        .send("Another video is being processed. Please try again later.");
    }
    // let isRightFormat = true;
    // let videoCount = 0;
    // let isSelectedVideo = false;

    // csvData[session].forEach((x) => {
    //   if (x["Tên phim"]) {
    //     isSelectedVideo = x["Tên phim"] === videoSelect;
    //   }
    //   if (!isSelectedVideo || !x["Link phim"]) {
    //     return;
    //   }
    //   if (
    //     x["Link phim"].search("youtube.com") === -1 &&
    //     !/[.]\w{1,4}$/.test(x["Link phim"])
    //   ) {
    //     isRightFormat = false;
    //     isSelectedVideo = false;
    //   } else {
    //     ++videoCount;
    //   }
    // });
    // if (!isRightFormat || !videoCount) {
    //   return response
    //     .status(400)
    //     .send("Your videos does not match supported formats.");
    // }
    processVideo(session, csvData[session], videoSelect);
    response.status(200).send("started");
  });

  app.post("/get-progress", function (request, response) {
    const session = _.get(request, "body.session", null);
    const progress = getProgess(session);
    // console.log("progress", progress);
    if (progress === -1) {
      response.status(200).send(getOutputPath(session));
      return;
    }
    response.status(200).send(`${progress}%`);
  });

  app.post("/vbee-callback", function (request, response) {
    console.log(request.body);
    const url = _.get(request, "body.link", "");
    const text = _.get(request, "body.request.input_text", "");
    const id = _.get(request, "body.request.request_id", "");
    if (!global.vbeeAudioData) {
      global.vbeeAudioData = {};
    }
    global.vbeeAudioData[id] = url;
  });

  app.post("/get-vbee-audio", function (request, response) {
    try {
      const id = _.get(request, "body.id", null);
      console.log("get-vbee-audio", id, global.vbeeAudioData);
      const data = _.get(global, `vbeeAudioData['${id}']`, null);
      response.status(200).send(data);
      // delete global.vbeeAudioData[id];
    } catch {}
  });

  app.post("/get-vbee-audio-list", function (request, response) {
    const list = _.get(request, "body.list", []);
    console.log("get-vbee-audio-list", list, global.vbeeAudioData);
    response.status(200).send(list.map((x) => global.vbeeAudioData[x]));
  });

  const server = app.listen(process.env.PORT || port, (error) => {
    if (error) return console.log(`Error: ${error}`);
    console.log(
      `Server is now ready. Open on browser: http://localhost:${
        server.address().port
      }/`
    );
  });
};

module.exports = startServer;
