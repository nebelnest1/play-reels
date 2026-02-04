import {
    makeExit
} from "./shared-QIIGKJUA.js";
import {
    parseConfig
} from "./shared-KEIH4Q3I.js";
var config = parseConfig(APP_CONFIG);
if (config) {
    document.addEventListener("click", () => {
        makeExit(config, "mainExit");
    });
}