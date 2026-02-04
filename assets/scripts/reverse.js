import {
    initBackIfNeeded,
    makeRedirect
} from "./shared-QIIGKJUA.js";
import {
    parseConfig
} from "./shared-KEIH4Q3I.js";
var Reverse = async () => {
    const config = parseConfig(APP_CONFIG);
    if (!config) return;
    const reverse = config == null ? void 0 : config.reverse;
    let isHistoryPushed = false;
    if (reverse == null ? void 0 : reverse.currentTab) {
        window.addEventListener(
            "click",
            async () => {
                try {
                    if (isHistoryPushed) return;
                    const {
                        pathname
                    } = window.location;
                    const searchParams = window.location.search;
                    const pathnameWithSearchParams = `${pathname}${searchParams}`;
                    await initBackIfNeeded(config);
                    window.history.pushState(null, "", `${pathnameWithSearchParams}`);
                    isHistoryPushed = true;
                } catch (error) {
                    console.error("Reverse pushStateToHistory error:", error);
                }
            }, {
                capture: true
            }
        );
        window.addEventListener("popstate", () => {
            makeRedirect(config, "reverse", false);
        });
    }
};
Reverse();