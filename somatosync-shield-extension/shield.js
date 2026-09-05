(() => {
  if (document.querySelector('meta[name="somatosync-app"][content="recovery-layer-v1"]')) return;

  const STYLE_ID = "somatosync-shield-style";
  const BANNER_ID = "somatosync-shield-preflight";
  const DOCK_ID = "somatosync-shield-dock";
  const READING_SURFACE_ATTR = "data-somatosync-shield-reading-surface";
  const GUIDE_ATTR = "data-somatosync-shield-guide-current";
  const STATIC_ATTR = "data-somatosync-shield-static";
  const PAUSED_ATTR = "data-somatosync-shield-paused";
  const HOST = location.hostname;

  let currentProfile = null;
  let pageApplied = false;
  let activeSettings = null;
  let activeSource = "current";
  let activeProfileUpdatedAt = null;
  let guideListening = false;
  let guideRaf = 0;

  function safeNumber(value, fallback, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function symptomsFrom(profile) {
    const symptoms = profile?.symptomContext || {};
    return {
      lightSensitivity: safeNumber(symptoms.lightSensitivity, 0, 0, 5),
      visualMotionDiscomfort: safeNumber(symptoms.visualMotionDiscomfort, 0, 0, 5),
      mentalFatigue: safeNumber(symptoms.mentalFatigue, 0, 0, 5),
      headache: safeNumber(symptoms.headache, 0, 0, 5),
      visualProblems: safeNumber(symptoms.visualProblems, 0, 0, 5),
    };
  }

  function settingsFrom(profile, recommended) {
    if (!profile) return null;
    const source = recommended && profile.recommended ? profile.recommended : profile;
    const symptoms = symptomsFrom(profile);
    const visualCalming = Boolean(source.softContrast) || symptoms.lightSensitivity >= 3;
    const cognitiveSupport = Boolean(source.reduceDensity) || symptoms.mentalFatigue >= 3;
    const motionSupport = Boolean(source.reduceMotion) || symptoms.visualMotionDiscomfort >= 3;

    return {
      textScale: safeNumber(source.textScale, 1, 1, 1.35),
      lineSpacing: safeNumber(source.lineSpacing, 1, 1, 1.4),
      focusReadingLayout: Boolean(source.focusReadingLayout) || cognitiveSupport,
      reduceMotion: motionSupport || Boolean(source.stabilizeViewport),
      simplifyChrome: cognitiveSupport || Boolean(source.emphasizeStructure),
      warmPalette: visualCalming,
      strongerCalming: symptoms.lightSensitivity >= 4,
      calmMedia: visualCalming || Boolean(source.calmMedia),
      readingGuide: cognitiveSupport || Boolean(source.emphasizeStructure),
      legibleTypeface: safeNumber(source.textScale, 1, 1, 1.35) > 1.02 || Boolean(source.focusReadingLayout),
      symptoms,
    };
  }

  function visibleChanges(settings) {
    if (!settings) return [];
    const changes = [];
    if (settings.textScale > 1.02) changes.push("larger text");
    if (settings.lineSpacing > 1.03) changes.push("more spacing");
    if (settings.focusReadingLayout) changes.push("focused reading width");
    if (settings.warmPalette) changes.push("calmer colors");
    if (settings.calmMedia) changes.push("softer images");
    if (settings.reduceMotion) changes.push("reduced motion");
    if (settings.simplifyChrome) changes.push("less page clutter");
    if (settings.readingGuide) changes.push("reading guide");
    return changes;
  }

  function reasonText(settings) {
    if (!settings) return "Based on your SomatoSync reading setup.";
    const reasons = [];
    if (settings.symptoms.lightSensitivity >= 3) reasons.push("light sensitivity");
    if (settings.symptoms.visualMotionDiscomfort >= 3) reasons.push("visual or motion discomfort");
    if (settings.symptoms.mentalFatigue >= 3) reasons.push("mental fatigue");
    if (!reasons.length) return "Based on supports that helped in recent SomatoSync sessions.";
    return `Matched to ${reasons.join(", ")}.`;
  }

  function removeBanner() {
    document.getElementById(BANNER_ID)?.remove();
  }

  function removeDock() {
    document.getElementById(DOCK_ID)?.remove();
  }

  function readingSurface() {
    const selectors = ["article", "main article", "#mw-content-text", "main", "[role='main']", "#content"];
    for (const selector of selectors) {
      const candidate = document.querySelector(selector);
      if (candidate && (candidate.innerText?.replace(/\s+/g, " ").trim().length || 0) >= 500) return candidate;
    }
    return document.body;
  }

  function clearReadingGuide() {
    if (guideListening) {
      window.removeEventListener("scroll", scheduleGuideUpdate);
      window.removeEventListener("resize", scheduleGuideUpdate);
      guideListening = false;
    }
    if (guideRaf) cancelAnimationFrame(guideRaf);
    guideRaf = 0;
    document.querySelectorAll(`[${GUIDE_ATTR}]`).forEach((element) => element.removeAttribute(GUIDE_ATTR));
  }

  function updateReadingGuide() {
    guideRaf = 0;
    const surface = document.querySelector(`[${READING_SURFACE_ATTR}]`);
    if (!surface || !activeSettings?.readingGuide) return;
    const center = window.innerHeight * 0.48;
    const blocks = [...surface.querySelectorAll("p, li, blockquote")]
      .filter((element) => (element.textContent || "").trim().length >= 45)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight;
      });
    let best = null;
    let bestDistance = Infinity;
    for (const block of blocks) {
      const rect = block.getBoundingClientRect();
      const distance = Math.abs((rect.top + rect.bottom) / 2 - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = block;
      }
    }
    document.querySelectorAll(`[${GUIDE_ATTR}]`).forEach((element) => {
      if (element !== best) element.removeAttribute(GUIDE_ATTR);
    });
    best?.setAttribute(GUIDE_ATTR, "true");
  }

  function scheduleGuideUpdate() {
    if (!guideRaf) guideRaf = requestAnimationFrame(updateReadingGuide);
  }

  function startReadingGuide() {
    clearReadingGuide();
    if (!activeSettings?.readingGuide) return;
    guideListening = true;
    window.addEventListener("scroll", scheduleGuideUpdate, { passive: true });
    window.addEventListener("resize", scheduleGuideUpdate, { passive: true });
    scheduleGuideUpdate();
  }

  function markMovingChrome(settings) {
    document.querySelectorAll(`[${STATIC_ATTR}]`).forEach((element) => element.removeAttribute(STATIC_ATTR));
    if (!settings.reduceMotion) return;
    const surface = document.querySelector(`[${READING_SURFACE_ATTR}]`);
    const elements = [...document.body.querySelectorAll("body *")].slice(0, 1200);
    for (const element of elements) {
      if (element.id === DOCK_ID || element.id === BANNER_ID || element.closest(`#${DOCK_ID}, #${BANNER_ID}`)) continue;
      const position = getComputedStyle(element).position;
      if ((position === "fixed" || position === "sticky") && (!surface || !surface.contains(element))) {
        element.setAttribute(STATIC_ATTR, "true");
      }
    }
    document.querySelectorAll("video[autoplay]").forEach((video) => {
      try {
        if (!video.paused) {
          video.setAttribute(PAUSED_ATTR, "true");
          video.pause();
        }
      } catch { /* ignore media that cannot be paused */ }
    });
  }

  function pageStyle(settings) {
    const lineHeight = Math.max(1.55, 1.5 * settings.lineSpacing).toFixed(2);
    const warmBackground = settings.strongerCalming ? "#ded1bf" : "#ebe0d2";
    const warmSurface = settings.strongerCalming ? "#eee4d7" : "#f6eee5";
    const mediaBrightness = settings.strongerCalming ? "0.78" : "0.87";
    const textScalePercent = Math.round(settings.textScale * 100);
    const rules = [
      `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] p, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] li, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] blockquote, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] dd, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] td, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] th { font-size:${textScalePercent}% !important; line-height:${lineHeight} !important; letter-spacing:0.006em !important; }`,
      `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] p { margin-block:0 1.05em !important; }`,
      `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h1, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h2, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h3 { line-height:1.28 !important; margin-top:1.55em !important; margin-bottom:.6em !important; }`,
    ];

    if (settings.legibleTypeface) {
      rules.push(`html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}], html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] * { font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif !important; }`);
    }

    if (settings.focusReadingLayout) {
      rules.push(
        `html[data-somatosync-shield="on"] body { background:#edf0ee !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] { box-sizing:border-box !important; width:min(760px,calc(100vw - 32px)) !important; max-width:760px !important; margin-left:auto !important; margin-right:auto !important; padding:clamp(22px,4vw,42px) !important; border:1px solid rgba(87,101,96,.22) !important; border-radius:22px !important; background:#fbfcfb !important; box-shadow:0 16px 50px rgba(30,43,39,.12),0 0 0 100vmax rgba(50,65,60,.055) !important; }`
      );
    }

    if (settings.warmPalette) {
      rules.push(
        `html[data-somatosync-shield="on"] body { background:${warmBackground} !important; color:#302d29 !important; }`,
        `html[data-somatosync-shield="on"]::before { content:"" !important; position:fixed !important; inset:0 !important; pointer-events:none !important; z-index:2147483000 !important; background:${settings.strongerCalming ? "rgba(198,170,118,.12)" : "rgba(211,184,135,.07)"} !important; }`,
        `html[data-somatosync-shield="on"] header, html[data-somatosync-shield="on"] nav, html[data-somatosync-shield="on"] aside, html[data-somatosync-shield="on"] footer, html[data-somatosync-shield="on"] [role="banner"], html[data-somatosync-shield="on"] [role="navigation"] { filter:saturate(.72) brightness(.94) contrast(.95) !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] { background:${warmSurface} !important; color:#302d29 !important; border-color:#c9b9a5 !important; box-shadow:0 16px 50px rgba(66,49,33,.14),0 0 0 100vmax rgba(105,82,52,.08) !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] p, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] li, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] dd, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] blockquote { color:#314047 !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h1, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h2, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h3, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h4 { color:#22323a !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] a { color:#315f72 !important; text-decoration-thickness:1px !important; text-underline-offset:2px !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] pre, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] code, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] blockquote, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] table { background:#eae4da !important; border-color:#d2c9bb !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] [class*="card" i], html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] [class*="panel" i], html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] [class*="box" i], html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] [class*="banner" i] { background:#eee8dd !important; border-color:#d4ccbf !important; box-shadow:none !important; }`
      );
    }

    if (settings.calmMedia) {
      rules.push(`html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] img, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] video, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] svg:not(svg[aria-hidden="true"]) { filter:saturate(.72) brightness(${mediaBrightness}) contrast(.94) !important; opacity:.94 !important; }`);
    }

    if (settings.reduceMotion) {
      rules.push(
        `html[data-somatosync-shield="on"] *, html[data-somatosync-shield="on"] *::before, html[data-somatosync-shield="on"] *::after { animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; scroll-behavior:auto !important; }`,
        `html[data-somatosync-shield="on"] [${STATIC_ATTR}] { position:static !important; transform:none !important; }`
      );
    }

    if (settings.simplifyChrome) {
      rules.push(`html[data-somatosync-shield="on"] nav, html[data-somatosync-shield="on"] aside, html[data-somatosync-shield="on"] footer, html[data-somatosync-shield="on"] [role="navigation"], html[data-somatosync-shield="on"] [role="complementary"], html[data-somatosync-shield="on"] [class*="sidebar" i], html[data-somatosync-shield="on"] [id*="sidebar" i], html[data-somatosync-shield="on"] [class*="recommend" i], html[data-somatosync-shield="on"] [aria-label*="related" i], html[data-somatosync-shield="on"] [class*="advert" i], html[data-somatosync-shield="on"] [id*="advert" i], html[data-somatosync-shield="on"] [class*="promo" i], html[data-somatosync-shield="on"] [class*="social" i], html[data-somatosync-shield="on"] [class*="floating" i], html[data-somatosync-shield="on"] [class*="sticky" i] { display:none !important; }`);
      if (HOST.endsWith("wikipedia.org")) {
        rules.push(`html[data-somatosync-shield="on"] .vector-header-container, html[data-somatosync-shield="on"] .vector-column-start, html[data-somatosync-shield="on"] .vector-column-end, html[data-somatosync-shield="on"] .vector-page-toolbar, html[data-somatosync-shield="on"] .mw-editsection, html[data-somatosync-shield="on"] .navbox, html[data-somatosync-shield="on"] .catlinks, html[data-somatosync-shield="on"] .mw-footer-container { display:none !important; }`);
      }
    }

    if (settings.readingGuide) {
      rules.push(
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] p, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] li, html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] blockquote { transition:opacity .12s ease,background-color .12s ease,border-color .12s ease !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] [${GUIDE_ATTR}="true"] { opacity:1 !important; background:rgba(139,157,145,.13) !important; border-left:3px solid #728e8a !important; border-radius:7px !important; padding-left:.75em !important; padding-right:.45em !important; }`
      );
    }

    return rules.join("\n");
  }

  function applySettingsToPage(settings) {
    document.getElementById(STYLE_ID)?.remove();
    document.querySelectorAll(`[${READING_SURFACE_ATTR}]`).forEach((element) => element.removeAttribute(READING_SURFACE_ATTR));
    document.querySelectorAll(`[${STATIC_ATTR}]`).forEach((element) => element.removeAttribute(STATIC_ATTR));
    clearReadingGuide();
    if (!settings.reduceMotion) {
      document.querySelectorAll(`[${PAUSED_ATTR}]`).forEach((element) => {
        element.removeAttribute(PAUSED_ATTR);
        try { element.play?.().catch?.(() => undefined); } catch { /* keep media paused if playback is blocked */ }
      });
    }

    activeSettings = { ...settings };
    const surface = readingSurface();
    surface?.setAttribute(READING_SURFACE_ATTR, "true");

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = pageStyle(activeSettings);
    document.head.appendChild(style);
    document.documentElement.setAttribute("data-somatosync-shield", "on");
    markMovingChrome(activeSettings);
    startReadingGuide();
    pageApplied = true;
  }

  function restorePage() {
    document.getElementById(STYLE_ID)?.remove();
    document.documentElement.removeAttribute("data-somatosync-shield");
    document.querySelectorAll(`[${READING_SURFACE_ATTR}]`).forEach((element) => element.removeAttribute(READING_SURFACE_ATTR));
    document.querySelectorAll(`[${STATIC_ATTR}]`).forEach((element) => element.removeAttribute(STATIC_ATTR));
    document.querySelectorAll(`[${PAUSED_ATTR}]`).forEach((element) => {
      element.removeAttribute(PAUSED_ATTR);
      try { element.play?.().catch?.(() => undefined); } catch { /* keep media paused if playback is blocked */ }
    });
    clearReadingGuide();
    removeDock();
    pageApplied = false;
    activeSettings = null;
    activeProfileUpdatedAt = null;
  }

  function readSitePrefs(callback) {
    chrome.storage.local.get({ somatosyncShieldSitePrefs: {} }, (stored) => {
      callback(stored.somatosyncShieldSitePrefs || {});
    });
  }

  function setAlwaysForSite(always) {
    readSitePrefs((prefs) => {
      chrome.storage.local.set({
        somatosyncShieldSitePrefs: {
          ...prefs,
          [HOST]: { ...(prefs[HOST] || {}), always: Boolean(always), updatedAt: new Date().toISOString() },
        },
      });
    });
  }

  function createDock() {
    removeDock();
    if (!pageApplied || !activeSettings) return;

    const host = document.createElement("div");
    host.id = DOCK_ID;
    Object.assign(host.style, { position: "fixed", right: "18px", bottom: "18px", zIndex: "2147483647" });
    const root = host.attachShadow({ mode: "open" });
    const changes = visibleChanges(activeSettings);
    root.innerHTML = `
      <style>
        *{box-sizing:border-box} .wrap{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#1f2a30}
        .bar{display:flex;align-items:center;gap:10px;min-width:286px;padding:11px 12px;border:1px solid #cfd9dc;border-radius:16px;background:#fff;box-shadow:0 14px 34px rgba(19,37,46,.18)}
        .dot{width:9px;height:9px;border-radius:999px;background:#4f887e;box-shadow:0 0 0 4px #e3f0ed}.copy{min-width:0;flex:1}.copy strong{display:block;font-size:15px;line-height:1.25}.copy span{display:block;margin-top:3px;font-size:14px;line-height:1.35;color:#66737c}
        button{border:1px solid #d5dee1;border-radius:10px;padding:8px 10px;background:#fff;color:#30414a;font:650 14.5px/1 system-ui;cursor:pointer}button:hover{background:#f3f6f7}.restore{color:#7c4f4f}
        .panel{display:none;margin-top:8px;width:350px;padding:15px;border:1px solid #cfd9dc;border-radius:16px;background:#fff;box-shadow:0 14px 34px rgba(19,37,46,.18)}.panel.open{display:block}.why{font-size:14px;line-height:1.45;color:#5d6b73;margin-bottom:11px}.grid{display:grid;gap:8px}.row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 10px;border-radius:10px;background:#f5f7f7}.row span{font-size:14.5px;font-weight:650}.row input{width:19px;height:19px;accent-color:#315f72}.always{margin-top:11px;padding-top:11px;border-top:1px solid #e2e7e9;background:#fff}.always small{display:block;margin-top:3px;color:#748088;font-size:14px;line-height:1.4}
      </style>
      <div class="wrap">
        <div class="bar">
          <span class="dot"></span>
          <div class="copy"><strong>SomatoSync Shield active</strong><span>${changes.length} page ${changes.length === 1 ? "change" : "changes"}</span></div>
          <button id="adjust">Adjust</button><button id="restore" class="restore">Restore</button>
        </div>
        <div class="panel" id="panel">
          <div class="why">${reasonText(activeSettings)}</div>
          <div class="grid">
            <label class="row"><span>Calm colors</span><input data-key="warmPalette" type="checkbox" ${activeSettings.warmPalette ? "checked" : ""}></label>
            <label class="row"><span>Calm images</span><input data-key="calmMedia" type="checkbox" ${activeSettings.calmMedia ? "checked" : ""}></label>
            <label class="row"><span>Focus article</span><input data-key="simplifyChrome" type="checkbox" ${activeSettings.simplifyChrome ? "checked" : ""}></label>
            <label class="row"><span>Reading guide</span><input data-key="readingGuide" type="checkbox" ${activeSettings.readingGuide ? "checked" : ""}></label>
            <label class="row"><span>Reduce motion</span><input data-key="reduceMotion" type="checkbox" ${activeSettings.reduceMotion ? "checked" : ""}></label>
          </div>
          <label class="row always"><span>Always use on ${HOST}</span><input id="always" type="checkbox"><small></small></label>
        </div>
      </div>`;

    const panel = root.getElementById("panel");
    root.getElementById("adjust")?.addEventListener("click", () => panel?.classList.toggle("open"));
    root.getElementById("restore")?.addEventListener("click", () => {
      restorePage();
      removeBanner();
    });
    root.querySelectorAll("input[data-key]").forEach((input) => {
      input.addEventListener("change", (event) => {
        const target = event.currentTarget;
        if (!(target instanceof HTMLInputElement) || !activeSettings) return;
        activeSettings = { ...activeSettings, [target.dataset.key]: target.checked };
        applySettingsToPage(activeSettings);
        createDock();
        const nextPanel = document.getElementById(DOCK_ID)?.shadowRoot?.getElementById("panel");
        nextPanel?.classList.add("open");
      });
    });
    const always = root.getElementById("always");
    if (always instanceof HTMLInputElement) {
      readSitePrefs((prefs) => { always.checked = Boolean(prefs[HOST]?.always); });
      always.addEventListener("change", () => setAlwaysForSite(always.checked));
    }
    document.body.appendChild(host);
  }

  function applyPage(profile, recommended = false) {
    const settings = settingsFrom(profile, recommended);
    if (!settings) return;
    activeSource = recommended ? "recommended" : "current";
    activeProfileUpdatedAt = profile?.updatedAt || null;
    applySettingsToPage(settings);
    removeBanner();
    createDock();
  }

  function readingHeavyPage() {
    const surface = readingSurface();
    const text = surface?.innerText?.replace(/\s+/g, " ").trim() || "";
    return text.length >= 1400;
  }

  function showPreflight(profile) {
    if (!profile?.recommended || document.getElementById(BANNER_ID) || !readingHeavyPage()) return;
    const preview = settingsFrom(profile, true);
    const changes = visibleChanges(preview).slice(0, 4);
    readSitePrefs((prefs) => {
      if (prefs[HOST]?.dismissedProfileAt === profile.updatedAt) return;
      const banner = document.createElement("div");
      banner.id = BANNER_ID;
      banner.setAttribute("role", "dialog");
      banner.setAttribute("aria-label", "SomatoSync reading setup");
      banner.innerHTML = `
        <div style="font:700 15px/1.35 system-ui,-apple-system,sans-serif;color:#17242a">Use your SomatoSync reading setup?</div>
        <div style="margin-top:5px;font:400 14px/1.45 system-ui,-apple-system,sans-serif;color:#4b5a62">${reasonText(preview)}</div>
        ${changes.length ? `<div style="margin-top:8px;font:600 14px/1.45 system-ui;color:#315f72">${changes.join(" · ")}</div>` : ""}
        <div style="display:flex;gap:8px;margin-top:12px">
          <button data-action="use" style="border:0;border-radius:10px;padding:8px 12px;background:#315f72;color:white;font:650 14px system-ui;cursor:pointer">Use setup</button>
          <button data-action="dismiss" style="border:1px solid #d6dde1;border-radius:10px;padding:8px 12px;background:white;color:#475569;font:650 14px system-ui;cursor:pointer">Not now</button>
        </div>`;
      Object.assign(banner.style, {
        position: "fixed", right: "20px", bottom: "20px", zIndex: "2147483647", width: "min(370px,calc(100vw - 32px))",
        padding: "16px", border: "1px solid #d6dde1", borderRadius: "16px", background: "#fff", boxShadow: "0 16px 40px rgba(15,23,42,.18)"
      });
      banner.querySelector('[data-action="use"]')?.addEventListener("click", () => applyPage(profile, true));
      banner.querySelector('[data-action="dismiss"]')?.addEventListener("click", () => {
        removeBanner();
        readSitePrefs((nextPrefs) => {
          chrome.storage.local.set({ somatosyncShieldSitePrefs: { ...nextPrefs, [HOST]: { ...(nextPrefs[HOST] || {}), dismissedProfileAt: profile.updatedAt } } });
        });
      });
      document.body.appendChild(banner);
    });
  }

  function showSetupUpdate(profile) {
    if (!profile || document.getElementById(BANNER_ID)) return;
    const recommended = activeSource === "recommended" && Boolean(profile.recommended);
    const preview = settingsFrom(profile, recommended);
    if (!preview) return;
    readSitePrefs((prefs) => {
      if (prefs[HOST]?.dismissedUpdateAt === profile.updatedAt) return;
      const changes = visibleChanges(preview).slice(0, 4);
      const banner = document.createElement("div");
      banner.id = BANNER_ID;
      banner.setAttribute("role", "dialog");
      banner.setAttribute("aria-label", "Updated SomatoSync reading setup");
      banner.innerHTML = `
        <div style="font:700 15px/1.35 system-ui,-apple-system,sans-serif;color:#17242a">Your SomatoSync setup changed</div>
        <div style="margin-top:5px;font:400 14px/1.45 system-ui,-apple-system,sans-serif;color:#4b5a62">Update this page to match the newest reading supports?</div>
        ${changes.length ? `<div style="margin-top:8px;font:600 14px/1.45 system-ui;color:#315f72">${changes.join(" · ")}</div>` : ""}
        <div style="display:flex;gap:8px;margin-top:12px">
          <button data-action="update" style="border:0;border-radius:10px;padding:8px 12px;background:#315f72;color:white;font:650 14px system-ui;cursor:pointer">Update page</button>
          <button data-action="keep" style="border:1px solid #d6dde1;border-radius:10px;padding:8px 12px;background:white;color:#475569;font:650 14px system-ui;cursor:pointer">Keep current</button>
        </div>`;
      Object.assign(banner.style, {
        position: "fixed", right: "20px", bottom: "20px", zIndex: "2147483647", width: "min(390px,calc(100vw - 32px))",
        padding: "16px", border: "1px solid #d6dde1", borderRadius: "16px", background: "#fff", boxShadow: "0 16px 40px rgba(15,23,42,.18)"
      });
      banner.querySelector('[data-action="update"]')?.addEventListener("click", () => applyPage(profile, recommended));
      banner.querySelector('[data-action="keep"]')?.addEventListener("click", () => {
        removeBanner();
        readSitePrefs((nextPrefs) => {
          chrome.storage.local.set({ somatosyncShieldSitePrefs: { ...nextPrefs, [HOST]: { ...(nextPrefs[HOST] || {}), dismissedUpdateAt: profile.updatedAt } } });
        });
      });
      document.body.appendChild(banner);
    });
  }

  function load() {
    chrome.storage.local.get({
      somatosyncShieldEnabled: true,
      somatosyncShieldProfile: null,
      somatosyncShieldAutoPreflight: true,
      somatosyncShieldSitePrefs: {},
    }, (stored) => {
      currentProfile = stored.somatosyncShieldProfile;
      if (!stored.somatosyncShieldEnabled || !currentProfile) {
        restorePage();
        removeBanner();
        return;
      }
      const sitePref = stored.somatosyncShieldSitePrefs?.[HOST] || {};
      if (sitePref.always) {
        applyPage(currentProfile, Boolean(currentProfile.recommended));
        return;
      }

      // Default behavior is consent-first: never auto-apply on a normal site.
      // If the user manually adapted this page and SomatoSync later syncs a new setup,
      // keep the current page stable and ask before replacing it.
      if (pageApplied) {
        if (currentProfile.updatedAt && currentProfile.updatedAt !== activeProfileUpdatedAt) {
          showSetupUpdate(currentProfile);
        }
        return;
      }

      restorePage();
      if (stored.somatosyncShieldAutoPreflight) window.setTimeout(() => showPreflight(currentProfile), 500);
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.somatosyncShieldProfile || changes.somatosyncShieldEnabled || changes.somatosyncShieldAutoPreflight || changes.somatosyncShieldSitePrefs) load();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "SOMATOSYNC_SHIELD_APPLY_CURRENT") {
      if (currentProfile) applyPage(currentProfile, false);
      sendResponse({ applied: Boolean(currentProfile), pageApplied, changes: visibleChanges(activeSettings) });
      return;
    }
    if (message?.type === "SOMATOSYNC_SHIELD_APPLY_RECOMMENDED") {
      if (currentProfile?.recommended) applyPage(currentProfile, true);
      sendResponse({ applied: Boolean(currentProfile?.recommended), pageApplied, changes: visibleChanges(activeSettings) });
      return;
    }
    if (message?.type === "SOMATOSYNC_SHIELD_RESTORE") {
      restorePage();
      removeBanner();
      sendResponse({ applied: false, pageApplied });
      return;
    }
    if (message?.type === "SOMATOSYNC_SHIELD_STATUS") {
      sendResponse({ pageApplied, hasProfile: Boolean(currentProfile), hasRecommended: Boolean(currentProfile?.recommended), source: activeSource, changes: visibleChanges(activeSettings) });
    }
  });

  load();
})();
