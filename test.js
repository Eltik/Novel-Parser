const Core = require("./built/Core").default;
const core = new Core(true);
core.search("classroom of the elite").then((data) => {
    console.log(data);
});