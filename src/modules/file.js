const fs = require("fs");

const writeJSON = (data, path = "src/configs/saved-data.json") => {
  try {
    let jsonData = JSON.stringify(data);
    fs.writeFileSync(path, jsonData);
  } catch (error) {
    console.log(error);
  }
};

const removeFile = (path) => {
  try {
    fs.unlinkSync(path);
  } catch (err) {
    console.error(err);
  }
};

module.exports = { writeJSON, removeFile };
