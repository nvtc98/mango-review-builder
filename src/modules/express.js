const express = require("express");
const fs = require("fs");
const fileUpload = require("express-fileupload");
const { readCSV } = require("@modules/csv");
const {
  processVideo,
  getProgess,
  getAvailability,
  getOutputPath,
} = require("@modules/process");
const _ = require("lodash");
const path = require("path");

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

const removeFile = (path) => {
  try {
    fs.unlinkSync(path);
  } catch (err) {
    console.error(err);
  }
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

  app.use("/assets", express.static("./src/assets"));

  app.get("/", async (request, response) => {
    console.log(`Get a request from: ${request.url}`);
    response.sendFile(path.resolve("src/views/index.html"));
  });

  app.post("/upload-csv", function (request, response) {
    const session = _.get(request, "body.session", null);
    if (!session) {
      return response.status(400).send("No session key included.");
    }
    if (!request.files || Object.keys(request.files).length === 0) {
      return response.status(400).send("No files were uploaded.");
    }

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
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
        const list = Object.keys(_.groupBy(data, "Tên phim")).filter((x) =>
          x.trim()
        );
        response.sendFile(path.resolve("src/views/index.html"));
        addQueryString(response, { session, list: list.join("--") });
      });
    });
  });

  app.post("/progress", function (request, response) {
    const session = _.get(request, "body.session", null);
    const videoSelect = _.get(request, "body.videoSelect", null);
    if (!session) {
      return response.status(400).send("No session key included.");
    }
    if (!request.files || Object.keys(request.files).length === 0) {
      return response.status(400).send("No files were uploaded.");
    }

    // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    let file = request.files.videoFile;
    saveFile(file, getPath(session, file.name), (_path, err) => {
      if (err) {
        console.log(err);
        return response.status(400).send("Failed to upload file.");
      }
      if (!getAvailability()) {
        return response
          .status(400)
          .send("Another video is being processed. Please try again later.");
      }
      processVideo(session, csvData[session], _path, videoSelect);
      removeFile(getPath(session, "csv.csv"));
      response.sendFile(path.resolve("src/views/progress.html"));
    });
  });

  app.get("/get-progress", function (request, response) {
    const progress = getProgess();
    if (progress === -1) {
      response.status(200).send(getOutputPath());
      return;
    }
    response.status(200).send(`${progress}%`);
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
