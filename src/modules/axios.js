const axios = require("axios");
const viettelConfigs = require("@constants/viettel-ai.json");
const fptConfigs = require("@constants/fpt-ai.json");
const fs = require("fs");
const _ = require("lodash");

const getViettelAudio = async (text) => {
  const { headers, url, params } = viettelConfigs;
  const data = {
    ...params,
    text,
  };
  var dest = "src/assets/output.wav";
  var file = fs.createWriteStream(dest);
  try {
    const response = await axios({
      method: "post",
      url,
      data,
      headers,
    })
      .then((res) => {
        const response = res;
        console.log(`statusCode: ${res.statusCode}`);

        console.log("res " + response);
        response.pipe(file);
        file.on("finish", function () {
          console.log("File download Completed");
        });

        res.on("data", (d) => {
          // process.stdout.write(d)
        });
      })
      .catch((e) => console.log(e));
    return response;
  } catch (error) {
    return null;
  }
};

const getFPTAudio = async (text, cb) => {
  const { headers, url } = fptConfigs;
  try {
    const response = await axios({
      method: "post",
      url,
      data: text,
      headers,
    });
    const result = _.get(response, "data.async", "");
    cb && cb(result);
    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
};

module.exports = { getViettelAudio, getFPTAudio };
