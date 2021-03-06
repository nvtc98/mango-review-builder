const axios = require("axios");
const fptConfigs = require("@configs/fpt-ai.json");
const vbeeConfigs = require("@configs/vbee.json");
const _ = require("lodash");

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

const getVBEEAudio = async (text, cb) => {
  const { data, url } = vbeeConfigs;
  try {
    const response = await axios({
      method: "post",
      url,
      data: { ...data, input_text: text },
    });
    const result = _.get(response, "data", {});
    cb && cb(result);
    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const getVBEEAudioData = async (id) => {
  try {
    const response = await axios({
      method: "post",
      url: "https://mango-review-builder.herokuapp.com/get-vbee-audio",
      data: { id },
    });
    // console.log("response", response);
    const result = _.get(response, "data", null);
    if (!result) {
      console.log("again");
      return await getVBEEAudioData(id);
    }
    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
};

module.exports = { getFPTAudio, getVBEEAudio, getVBEEAudioData };
