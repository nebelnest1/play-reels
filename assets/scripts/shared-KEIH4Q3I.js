var url = new URL(window.location.href);
var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s;
var URL_PARAM = {
    pz: (_a = url.searchParams.get("pz")) != null ? _a : "",
    tb: (_b = url.searchParams.get("tb")) != null ? _b : "",
    tb_reverse: (_c = url.searchParams.get("tb_reverse")) != null ? _c : "",
    ae: (_d = url.searchParams.get("ae")) != null ? _d : "",
    z: (_e = url.searchParams.get("z")) != null ? _e : "",
    var: (_f = url.searchParams.get("var")) != null ? _f : "",
    var_1: (_g = url.searchParams.get("var_1")) != null ? _g : "",
    var_2: (_h = url.searchParams.get("var_2")) != null ? _h : "",
    var_3: (_i = url.searchParams.get("var_3")) != null ? _i : "",
    b: (_j = url.searchParams.get("b")) != null ? _j : "",
    campaignid: (_k = url.searchParams.get("campaignid")) != null ? _k : "",
    abtest: (_l = url.searchParams.get("abtest")) != null ? _l : "",
    rhd: (_m = url.searchParams.get("rhd")) != null ? _m : "1",
    s: (_n = url.searchParams.get("s")) != null ? _n : "",
    ymid: (_o = url.searchParams.get("ymid")) != null ? _o : "",
    wua: (_p = url.searchParams.get("wua")) != null ? _p : "",
    use_full_list_or_browsers: (_q = url.searchParams.get("use_full_list_or_browsers")) != null ? _q : "",
    cid: (_r = url.searchParams.get("cid")) != null ? _r : "",
    geo: (_s = url.searchParams.get("geo")) != null ? _s : ""
};
var fetchPlatformVersion = async () => {
    const navigatorWithUAData = navigator;
    if (!navigatorWithUAData.userAgentData) {
        return "";
    }
    try {
        const hints = ["platformVersion"];
        return (await navigatorWithUAData.userAgentData.getHighEntropyValues(hints)).platformVersion;
    } catch (error) {
        console.error("Error retrieving data from navigator.userAgentData", error);
        return "";
    }
};
var getBrowserTimezone = () => {
    if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
        const {
            timeZone
        } = Intl.DateTimeFormat().resolvedOptions();
        if (timeZone) {
            return timeZone;
        }
    }
    return "";
};
var getBrowserTimeOffset = () => {
    return (new Date()).getTimezoneOffset();
};
var setSearchParams = (params) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
        if (!params[key]) return;
        searchParams.set(key, params[key]);
    });
    return searchParams;
};
var urlParamsUpdateUseParamMapping = ({
    passParamToParams,
    searchParams,
    windowUrl
}) => {
    passParamToParams.forEach((mapping) => {
        var _a2;
        const {
            from,
            to,
            joinWith
        } = mapping;
        const value = Array.isArray(from) ? from.map((param) => {
            var _a3;
            return (_a3 = windowUrl.searchParams.get(param)) != null ? _a3 : "";
        }).filter(Boolean).join(joinWith != null ? joinWith : "") : (_a2 = windowUrl.searchParams.get(from)) != null ? _a2 : "";
        if (value) {
            to.forEach((param) => {
                searchParams.set(param, value);
            });
        }
    });
    return searchParams;
};
var createURLSearchParams = async ({
    zone,
    passParamToParams
}) => {
    var _a2, _b2, _c2, _d2, _e2;
    const browserTimezone = getBrowserTimezone();
    const browserTimeOffset = getBrowserTimeOffset();
    const dataVer = ((_a2 = document.querySelector("html")) == null ? void 0 : _a2.getAttribute("data-version")) || "";
    const landingName = ((_b2 = document.querySelector("html")) == null ? void 0 : _b2.getAttribute("data-landing-name")) || "";
    const templateHash = (_c2 = window.templateHash) != null ? _c2 : "";
    const landMetadata = JSON.stringify({
        dataVer,
        landingName,
        templateHash
    });
    const cmeta = btoa(landMetadata);
    const optionallySearchParams = {
        ["pz"]: URL_PARAM.pz,
        ["tb"]: URL_PARAM.tb,
        ["tb_reverse"]: URL_PARAM.tb_reverse,
        ["ae"]: URL_PARAM.ae,
        ["ab2r"]: URL_PARAM.abtest || String(APP_CONFIG.abtest || "")
    };
    const defaultParams = {
        ["ymid"]: (_d2 = URL_PARAM.var_1) != null ? _d2 : URL_PARAM.var,
        ["var"]: (_e2 = URL_PARAM.var_2) != null ? _e2 : URL_PARAM.z,
        ["var_3"]: URL_PARAM.var_3,
        ["b"]: URL_PARAM.b,
        ["campaignid"]: URL_PARAM.campaignid,
        ["click_id"]: URL_PARAM.s,
        ["rhd"]: URL_PARAM.rhd,
        ["os_version"]: await fetchPlatformVersion(),
        ["btz"]: browserTimezone.toString(),
        ["bto"]: browserTimeOffset.toString(),
        ["cmeta"]: cmeta
    };
    if (zone) defaultParams["zoneid"] = zone;
    Object.entries(optionallySearchParams).forEach(([key, value]) => {
        if (value) defaultParams[key] = value;
    });
    const searchParams = setSearchParams(defaultParams);
    return passParamToParams ? urlParamsUpdateUseParamMapping({
        passParamToParams,
        searchParams,
        windowUrl: new URL(window.location.href)
    }) : searchParams;
};
var getUrl = async (zone, domain, passParamToParams) => {
    const domainWithProtocol = domain.includes("http") ? domain : `https://${domain}`;
    const url2 = new URL(`${domainWithProtocol}/${"afu.php" }`);
    const searchParams = await createURLSearchParams({
        zone: zone.toString(),
        passParamToParams
    });
    const urlWithParams = decodeURIComponent(`${url2.toString()}?${searchParams.toString()}`);
    console.log("URL generated:", urlWithParams);
    return urlWithParams;
};
var checkConfig = () => {
    if (typeof APP_CONFIG === "undefined") {
        document.body.innerHTML = `
            <p style="">LANDING CAN'T BE RENDERED. \u{1F514} PLEASE ADD CODE(you can find an object with options in your Propush account) FROM PROPUSH TO HEAD TAG.</p>
        `;
        return false;
    }
    return true;
};
var tabs = ["currentTab", "newTab"];
var exitTypes = ["zoneId", "url"];
var parseConfig = (rawAppConfig) => {
    const isConfigExist = checkConfig();
    if (!isConfigExist) return void 0;
    const {
        domain,
        videoCount,
        prizeName,
        prizeImg,
        ...exits
    } = rawAppConfig;
    const parsedExits = Object.entries(exits).reduce(
        (acc, [key, value]) => {
            const [exitName, tabOrType, type] = key.split("_");
            if (exitName) {
                if (tabs.includes(tabOrType)) {
                    const tab = tabOrType;
                    if (exitTypes.includes(type)) {
                        acc[exitName] = {
                            ...acc[exitName],
                            [tab]: {
                                domain: type === "zoneId" ? domain : void 0,
                                [type]: value
                            }
                        };
                    }
                } else if (exitTypes.includes(tabOrType)) {
                    const type2 = tabOrType;
                    acc[exitName] = {
                        ...acc[exitName],
                        currentTab: {
                            domain: type2 === "zoneId" ? domain : void 0,
                            [type2]: value
                        }
                    };
                } else {
                    const someSetting = tabOrType;
                    acc[exitName] = {
                        ...acc[exitName],
                        [someSetting]: value
                    };
                }
            }
            return acc;
        }, {}
    );
    return {
        videoCount,
        prizeName,
        prizeImg,
        ...parsedExits
    };
};

export {
    URL_PARAM,
    createURLSearchParams,
    getUrl,
    parseConfig
};