const csv = require("csv-parser");
const fs = require("fs");

const readCSV = (path, cb) => {
  const result = [];
  fs.createReadStream(path)
    .pipe(csv())
    .on("data", (data) => result.push(data))
    .on("end", () => {
      cb && cb(result);
    });
};

module.exports = { readCSV };
