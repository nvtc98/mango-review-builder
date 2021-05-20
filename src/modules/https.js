const viettelConfigs = require("@configs/viettel-ai.json");
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

module.exports = { getViettelAudio };
