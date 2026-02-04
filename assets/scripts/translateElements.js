var getCurrentLanguage = () => {
    const urlParams = window.location.search;
    const paramLang = new URLSearchParams(urlParams).get("lang");
    const userBrowserLang = navigator.language.split("-")[0];
    return paramLang || userBrowserLang || "en";
};
var translationsCache = {};
var getTranslations = async (loadFallbackTranslation2) => {
    const lang = getCurrentLanguage();
    if (!translationsCache[lang]) {
        translationsCache[lang] = (async () => {
            try {
                const response = await fetch(`./locales/${lang}.json`);
                return await response.json();
            } catch {
                return await loadFallbackTranslation2();
            }
        })();
    }
    return translationsCache[lang];
};
var translateElements = async (loadFallbackTranslation2, macroses) => {
    const lang = getCurrentLanguage();
    document.documentElement.setAttribute("lang", lang);
    if (["ar", "he", "fa", "ur", "az", "ku", "ff", "dv"].includes(lang)) {
        document.documentElement.setAttribute("dir", "rtl");
    }
    const translations = await getTranslations(loadFallbackTranslation2);
    const nonTranslatedKeys = [];
    Object.entries(translations).forEach((translation) => {
        const key = translation[0];
        let value = translation[1];
        const macros = macroses == null ? void 0 : macroses[key];
        value = macros ? value.replaceAll(macros.macros, macros.macrosValue) : value;
        const elementToTranslate = document.querySelectorAll(
            `[data-translate="${key}"]`
        );
        if (elementToTranslate == null ? void 0 : elementToTranslate.length) {
            elementToTranslate.forEach((element) => {
                if (element) {
                    const useHTML = element.hasAttribute("data-translate-html");
                    if (useHTML) {
                        element.innerHTML = value;
                    } else {
                        if (!element.childNodes.length) element.textContent = value;
                        element.childNodes.forEach((node) => {
                            if (node.nodeType === Node.TEXT_NODE) {
                                node.nodeValue = value;
                            }
                        });
                    }
                }
            });
            return;
        }
        nonTranslatedKeys.push(key);
    });
    if (nonTranslatedKeys.length) {
        console.warn(
            `Some keys from locales folder weren't used for translation when loading the landing page for the first time:`,
            nonTranslatedKeys.join(", ")
        );
    }
};
var loadFallbackTranslation = async () => {
    return await import("./shared-ALAZT3NV.js").then(
        (m) => m.default
    );
};
var initTranslation = async () => {
    translateElements(loadFallbackTranslation);
};
initTranslation();