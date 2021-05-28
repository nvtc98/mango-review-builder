const axios = require("axios");
const fshare = require("@configs/fshare.json");
const _ = require("lodash");

let fshareData = {
  token: null,
  sessionId: null,
};

const login = async (cb) => {
  try {
    const { host, path, user, headers } = fshare;
    const response = await axios({
      method: "post",
      url: host + path.login,
      data: user,
      headers,
    });
    const result = _.get(response, "data", {});
    fshareData = { token: result.token, sessionId: result.session_id };
    cb && cb(result);
    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const download = async (url, password = "") => {
  const { token, sessionId } = fshareData;
  const { host, path, headers } = fshare;
  try {
    const response = await axios({
      method: "post",
      url: host + path.download,
      headers: {
        ...headers,
        Cookie: `session_id=${sessionId}`,
      },
      data: {
        url,
        password,
        token,
        zipflag: 0,
      },
    });
    return _.get(response, "data.location", "");
  } catch (error) {
    return error;
  }
};

module.exports = {
  login,
  download,
};
