const fs = require("fs");

const writeJSON = (data, path = __basedir + "/src/configs/saved-data.json") => {
  try {
    let jsonData = JSON.stringify(data);
    fs.writeFileSync(path, jsonData);
  } catch (error) {
    console.log(error);
  }
};

const readJSON = (path = __basedir + "/src/configs/saved-data.json") => {
  const data = require(path);
  return data;
};

const removeFile = (path) => {
  try {
    fs.unlinkSync(path);
  } catch (err) {
    console.error(err);
  }
};

const writeFile = (path, content, cb) => {
  fs.writeFile(path, content, function (err) {
    if (err) return console.log(err);
    console.log("Saved to file.");
    cb && cb();
  });
};

module.exports = { writeJSON, readJSON, removeFile, writeFile };
