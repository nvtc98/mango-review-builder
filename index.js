require("module-alias/register");

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const startServer = require("@modules/express");

// startServer();

const fs = require("fs");

let student = [1, { key: "bv", value: "SAF" }, 3, 5];

let data = JSON.stringify(student);
fs.writeFileSync("src/configs/saved-data.json", data);
