import {
    URL_PARAM,
    createURLSearchParams,
    getUrl,
    parseConfig
} from "./shared-KEIH4Q3I.js";
var PUBLIC_DEFAULT_COOKIE_TTL = 5184e3;
var createPushParams = async (pushZone) => {
    const searchParams = await createURLSearchParams({
        zone: pushZone.toString()
    });
    const abtest = URL_PARAM.abtest || APP_CONFIG.abtest;
    if (URL_PARAM.ymid) {
        searchParams.set("var_2", URL_PARAM.ymid);
    }
    if (pushZone) {
        searchParams.set("z", pushZone);
    }
    if (URL_PARAM.wua) {
        searchParams.set("wua", URL_PARAM.wua);
    }
    if (abtest) {
        searchParams.set("ab2", String(abtest));
        searchParams.set("ab2_ttl", `${PUBLIC_DEFAULT_COOKIE_TTL}`);
    }
    searchParams.set("sw", "./sw.js");
    searchParams.set("d", location.host);
    return searchParams;
};
var setUpPushScript = async ({
    outDomain,
    pushDomain,
    pushZone,
    allowedNew,
    allowedPop,
    subscribedNew,
    subscribedPop
}) => {
    var _a;;
    (async function(s) {
        const searchParams = await createPushParams(pushZone);
        s.src = `https://${pushDomain}/hid.js?${searchParams}`;
        s.onload = function(sdk) {
            sdk.zoneId = pushZone;
            sdk.events.onPermissionDefault = function() {};
            sdk.events.onPermissionAllowed = async function() {
                if (allowedNew) {
                    window.open(await getUrl(allowedNew, outDomain), "_blank");
                }
                if (allowedPop) {
                    window.location.href = await getUrl(allowedPop, outDomain);
                }
            };
            sdk.events.onPermissionDenied = function() {};
            sdk.events.onAlreadySubscribed = async function() {
                if (subscribedNew) {
                    window.open(await getUrl(subscribedNew, outDomain), "_blank");
                }
                if (subscribedPop) {
                    window.location.href = await getUrl(subscribedPop, outDomain);
                }
            };
            sdk.events.onNotificationUnsupported = function() {};
        };
    })(
        (_a = [document.documentElement, document.body].filter(Boolean).pop()) == null ? void 0 : _a.appendChild(document.createElement("script"))
    );
};
var initPushScript = () => {
    var _a, _b;
    const config = parseConfig(APP_CONFIG);
    if (!config) return;
    const push = config.push;
    if (!((_a = push == null ? void 0 : push.currentTab) == null ? void 0 : _a.domain) || !((_b = push == null ? void 0 : push.currentTab) == null ? void 0 : _b.zoneId) || false) return;
    setUpPushScript({
        outDomain: push.currentTab.domain,
        pushDomain: "10zon.com",
        pushZone: push.currentTab.zoneId
    });
};
initPushScript();