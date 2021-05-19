const readXlsxFile = require("read-excel-file/node");

readXlsxFile("src/assets/excel.xlsx", { sheet: 2 }).then((rows) => {
  console.log(rows);
  // `rows` is an array of rows
  // each row being an array of cells.
});
