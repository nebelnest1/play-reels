import {
    makeRedirect
} from "./shared-QIIGKJUA.js";
import {
    parseConfig
} from "./shared-KEIH4Q3I.js";
var SHOULD_STOP_AUTOEXIT_ON_INTERACTION = true;
var setAutoexit = async () => {
    var _a;
    const config = parseConfig(APP_CONFIG);
    if (!config) return;
    const autoexit = config == null ? void 0 : config.autoexit;
    if (autoexit == null ? void 0 : autoexit.currentTab) {
        const timeToRedirect = (_a = autoexit.timeToRedirect) != null ? _a : 90;
        let shouldRedirect = document.visibilityState === "visible";
        let timerFinished = false;
        const checkVisibilty = function() {
            if (document.visibilityState === "visible") {
                shouldRedirect = true;
                if (timerFinished) makeRedirect(config, "autoexit");
            } else {
                shouldRedirect = false;
            }
        };
        const setAutoexit2 = () => {
            document.addEventListener("visibilitychange", checkVisibilty);
            return setTimeout(() => {
                timerFinished = true;
                if (shouldRedirect) makeRedirect(config, "autoexit");
            }, timeToRedirect * 1e3);
        };
        let timeout = setAutoexit2();
        const handleInteraction = () => {
            clearTimeout(timeout);
            document.removeEventListener("visibilitychange", checkVisibilty);
            if (SHOULD_STOP_AUTOEXIT_ON_INTERACTION) return;
            timeout = setAutoexit2();
        };
        document.addEventListener("mousemove", handleInteraction);
        document.addEventListener("click", handleInteraction);
        document.addEventListener("scroll", handleInteraction);
    }
};
setAutoexit();