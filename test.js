const Core = require("./built/Core").default;
const core = new Core(true);
/*
core.search("classroom of the elite").then((data) => {
    console.log(data[0].connectors);
});
*/
//core.pdfToHTML("https://api.anify.tv/pdf/e6eGj").then(console.log)
core.crawl(true).then(console.log)