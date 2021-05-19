const viettelConfigs = require("@constants/viettel-ai.json");
const fptConfigs = require("@constants/fpt-ai.json");
const fs = require("fs");
const https = require("https");

const getViettelAudio = async (text, destination, cb) => {
  const { headers, params, hostname, path } = viettelConfigs;
  const data = JSON.stringify({
    ...params,
    text,
  });
  const file = fs.createWriteStream(destination);

  const options = {
    hostname,
    path,
    method: "POST",
    headers,
  };

  const request = https.request(options, (response) => {
    console.log(response.statusMessage);
    response.pipe(file);
    file.on("finish", function () {
      console.log("File download Completed");
      cb && cb();
    });
  });

  request.on("error", (error) => {
    console.error(error);
  });

  request.write(data);
  request.end();
};

const getFPTAudio = async (text, destination, cb) => {
  const { headers, hostname, path } = fptConfigs;
  const data = text;

  const options = {
    hostname,
    path,
    method: "POST",
    headers,
  };

  const request = https.request(options, (response) => {
    console.log(response.statusCode);
    console.log(response.statusMessage);
    const chunks = [];
    response.on("data", (chunk) => {
      chunks.push(chunk);
    });

    response.on("end", () => {
      const body = Buffer.concat(chunks);
      console.log("body", body);
    });
  });

  request.on("error", (error) => {
    console.error(error);
  });

  request.write(data);
  request.end();
};

module.exports = { getViettelAudio, getFPTAudio };
