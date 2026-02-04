import {
    createURLSearchParams,
    getUrl
} from "./shared-KEIH4Q3I.js";
var pushStateToHistory = (url, times) => {
    try {
        for (let i = 0; i < times; i += 1) {
            window.history.pushState(null, "Please wait...", url);
        }
        const currentUrl = window.location.href;
        window.history.pushState(null, document.title, currentUrl);
        console.log(`Back initializated ${times} times with ${url}`);
    } catch (error) {
        console.error("Failed to push state, error:", error);
    }
};
var initBackIfNeeded = async (config) => {
    var _a;
    const back = config == null ? void 0 : config.back;
    if (back) {
        const {
            currentTab,
            pageUrl: backPageURL
        } = back;
        if (currentTab) {
            const historyTimeAmount = (_a = back.count) != null ? _a : 10;
            const {
                origin,
                pathname
            } = window.location;
            let backBase = `${origin}${pathname}`;
            if (backPageURL) {
                backBase = backPageURL;
            } else {
                if (backBase.includes("index.html")) {
                    backBase = backBase.split("/index.html")[0];
                }
                if (backBase.includes("back.html")) {
                    backBase = backBase.split("/back.html")[0];
                }
                if (backBase.endsWith("/")) {
                    backBase = backBase.substring(0, backBase.length - 1);
                }
                backBase = `${backBase}/back.html`;
            }
            const backUrlBase = new URL(backBase);
            const searchParams = await createURLSearchParams({
                zone: currentTab.zoneId
            });
            if (currentTab.url) searchParams.set("url", currentTab.url);
            else if (currentTab.domain && currentTab.zoneId) {
                searchParams.set("z", currentTab.zoneId);
                searchParams.set("domain", currentTab.domain);
            }
            const backUrl = decodeURIComponent(`${backUrlBase.toString()}?${searchParams.toString()}`);
            pushStateToHistory(backUrl, historyTimeAmount);
        }
    }
};
var Redirect = ({
    url
}) => {
    window.location.replace(url);
};
var Popunder = ({
    currentTabUrl,
    newTabUrl
}) => {
    if (newTabUrl) {
        const newTab = window.open(newTabUrl, "_blank");
        if (newTab) {
            newTab.opener = null;
            if (currentTabUrl) {
                document.addEventListener("visibilitychange", () => {
                    if (document.visibilityState === "visible") {
                        Redirect({
                            url: currentTabUrl
                        });
                    }
                });
                return;
            }
        }
    } else if (currentTabUrl) {
        Redirect({
            url: currentTabUrl
        });
    }
};
var exitError = (exitData, exitName) => {
    console.error(
        `${exitName || "Some exit"} was supposed to work, but some data about this type of exit was missed`,
        exitData
    );
};
var makeRedirect = async (config, exitName, shouldInitBack = true) => {
    var _a, _b;
    const {
        currentTab: exitData
    } = config[exitName];
    console.log(`${exitName} worked`, config);
    if (exitData) {
        let url;
        if (exitData.zoneId && exitData.domain) {
            (_a = window.syncMetric) == null ? void 0 : _a.call(window, {
                event: exitName,
                exitZoneId: exitData.zoneId
            });
            url = await getUrl(exitData.zoneId, exitData.domain);
            if (shouldInitBack) await initBackIfNeeded(config);
            return Redirect({
                url
            });
        }
        if (exitData.url) {
            (_b = window.syncMetric) == null ? void 0 : _b.call(window, {
                event: exitName,
                exitZoneId: exitData.url
            });
            url = exitData.url;
            if (shouldInitBack) await initBackIfNeeded(config);
            return Redirect({
                url
            });
        }
    }
    exitError(exitData, exitName);
};
var makeExit = async (config, exitName) => {
    var _a, _b;
    const exitData = config[exitName];
    console.log(`${exitName} worked`, config);
    if (exitData) {
        const {
            currentTab,
            newTab
        } = exitData;
        let currentTabUrl;
        if (currentTab) {
            if (currentTab.zoneId && currentTab.domain) {
                currentTabUrl = await getUrl(currentTab.zoneId, currentTab.domain);
                (_a = window.syncMetric) == null ? void 0 : _a.call(window, {
                    event: exitName,
                    exitZoneId: currentTab.zoneId
                });
            } else if (currentTab.url) {
                currentTabUrl = currentTab.url;
            } else {
                exitError(exitData, exitName);
            }
        }
        let newTabUrl;
        if (newTab) {
            if (newTab.zoneId && newTab.domain) {
                newTabUrl = await getUrl(newTab.zoneId, newTab.domain);
                (_b = window.syncMetric) == null ? void 0 : _b.call(window, {
                    event: exitName,
                    exitZoneId: newTab.zoneId
                });
            } else if (newTab.url) {
                newTabUrl = newTab.url;
            } else {
                exitError(exitData, exitName);
            }
        }
        await initBackIfNeeded(config);
        Popunder({
            currentTabUrl,
            newTabUrl
        });
        return;
    }
    exitError(exitData, exitName);
};

export {
    initBackIfNeeded,
    makeRedirect,
    makeExit
};