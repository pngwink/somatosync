(() => {
  if (document.querySelector('meta[name="somatosync-app"][content="recovery-layer-v1"]')) return;

  const STYLE_ID = "somatosync-shield-style-v3";
  const BANNER_ID = "somatosync-shield-preflight";
  const DOCK_ID = "somatosync-shield-dock";
  const SPOTLIGHT_ID = "somatosync-shield-reading-spotlight";
  const READING_SURFACE_ATTR = "data-somatosync-shield-reading-surface";
  const GUIDE_ATTR = "data-somatosync-shield-guide-current";
  const STATIC_ATTR = "data-somatosync-shield-static";
  const PAUSED_ATTR = "data-somatosync-shield-paused";
  const WAS_PLAYING_ATTR = "data-somatosync-shield-was-playing";
  const CONSENT_VERSION = 2;
  const SITE_KEY = location.origin;
  const SITE_LABEL = location.hostname || location.origin;

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
    const strongLightSensitivity = Boolean(source.photophobiaMode) || symptoms.lightSensitivity >= 4;
    const visualCalming = strongLightSensitivity || Boolean(source.softContrast) || symptoms.lightSensitivity >= 2;
    const severeVisualDifficulty = symptoms.visualProblems >= 4 || safeNumber(source.textScale, 1, 1, 1.5) >= 1.2;
    const cognitiveSupport = Boolean(source.reduceDensity) || symptoms.mentalFatigue >= 3;
    const motionSupport = Boolean(source.reduceMotion) || Boolean(source.stabilizeViewport) || symptoms.visualMotionDiscomfort >= 3;
    const readingSpotlight = Boolean(source.readingSpotlight);
    const pauseMedia = Boolean(source.pauseMedia) || symptoms.visualMotionDiscomfort >= 4;
    const symptomTextFloor = symptoms.visualProblems >= 4 ? 1.25 : symptoms.visualProblems >= 3 || symptoms.headache >= 4 ? 1.14 : 1;

    return {
      textScale: Math.max(symptomTextFloor, safeNumber(source.textScale, 1, 1, 1.5)),
      lineSpacing: Math.max(severeVisualDifficulty ? 1.18 : 1, safeNumber(source.lineSpacing, 1, 1, 1.4)),
      focusReadingLayout: Boolean(source.focusReadingLayout) || cognitiveSupport || symptoms.visualProblems >= 3,
      reduceMotion: motionSupport,
      simplifyChrome: cognitiveSupport,
      warmPalette: visualCalming && !strongLightSensitivity,
      photophobiaMode: strongLightSensitivity,
      strongerCalming: symptoms.lightSensitivity >= 3,
      calmMedia: visualCalming || Boolean(source.calmMedia),
      readingGuide: readingSpotlight || cognitiveSupport || Boolean(source.emphasizeStructure),
      readingSpotlight,
      pauseMedia,
      legibleTypeface: severeVisualDifficulty || safeNumber(source.textScale, 1, 1, 1.5) > 1.05 || Boolean(source.focusReadingLayout),
      symptoms,
    };
  }

  function visibleChanges(settings) {
    if (!settings) return [];
    const changes = [];
    if (settings.photophobiaMode) changes.push("low-luminance sensory theme");
    else if (settings.warmPalette) changes.push("reduced-luminance colors");
    if (settings.textScale >= 1.2) changes.push("larger reading typography");
    else if (settings.textScale > 1.02) changes.push("larger text");
    if (settings.lineSpacing > 1.06) changes.push("more spacing");
    if (settings.focusReadingLayout) changes.push("focused article width");
    if (settings.calmMedia) changes.push("dimmed media");
    if (settings.pauseMedia) changes.push("paused moving media");
    if (settings.reduceMotion) changes.push("motion frozen");
    if (settings.simplifyChrome) changes.push("information hierarchy simplified");
    if (settings.readingSpotlight) changes.push("reading ruler");
    else if (settings.readingGuide) changes.push("reading guide");
    return changes;
  }

  function reasonText(settings) {
    if (!settings) return "Based on your SomatoSync reading setup.";
    const reasons = [];
    if (settings.symptoms.lightSensitivity >= 4) reasons.push("severe light sensitivity");
    else if (settings.symptoms.lightSensitivity >= 2) reasons.push("light sensitivity");
    if (settings.symptoms.visualProblems >= 3) reasons.push("visual difficulty");
    if (settings.symptoms.visualMotionDiscomfort >= 3) reasons.push("visual or motion discomfort");
    if (settings.symptoms.mentalFatigue >= 3) reasons.push("mental fatigue");
    if (!reasons.length) return "Based on supports that helped in recent SomatoSync sessions.";
    return `Matched to ${reasons.join(", ")}.`;
  }

  function removeBanner() { document.getElementById(BANNER_ID)?.remove(); }
  function removeDock() { document.getElementById(DOCK_ID)?.remove(); }
  function removeSpotlight() { document.getElementById(SPOTLIGHT_ID)?.remove(); }

  function readingSurface() {
    const strong = ["article", "main article", "#mw-content-text", "[role='article']"];
    for (const selector of strong) {
      const candidate = document.querySelector(selector);
      if (candidate && (candidate.innerText?.replace(/\s+/g, " ").trim().length || 0) >= 350) return candidate;
    }
    const broad = ["main", "[role='main']", "#content"];
    for (const selector of broad) {
      const candidate = document.querySelector(selector);
      if (candidate && (candidate.innerText?.replace(/\s+/g, " ").trim().length || 0) >= 700) return candidate;
    }
    return document.body;
  }

  function clearReadingGuide() {
    if (guideListening) {
      window.removeEventListener("scroll", scheduleGuideUpdate, true);
      window.removeEventListener("resize", scheduleGuideUpdate);
      guideListening = false;
    }
    if (guideRaf) cancelAnimationFrame(guideRaf);
    guideRaf = 0;
    removeSpotlight();
    document.querySelectorAll(`[${GUIDE_ATTR}]`).forEach((element) => element.removeAttribute(GUIDE_ATTR));
  }

  function ensureSpotlight() {
    if (!activeSettings?.readingSpotlight) {
      removeSpotlight();
      return null;
    }
    let overlay = document.getElementById(SPOTLIGHT_ID);
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = SPOTLIGHT_ID;
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "2147482000" });
    for (const name of ["top", "bottom", "left", "right"]) {
      const pane = document.createElement("div");
      pane.dataset.pane = name;
      Object.assign(pane.style, {
        position: "fixed", pointerEvents: "none",
        background: activeSettings.photophobiaMode ? "rgba(11,20,22,.34)" : "rgba(14,24,25,.24)",
      });
      overlay.appendChild(pane);
    }
    document.body.appendChild(overlay);
    return overlay;
  }

  function updateReadingGuide() {
    guideRaf = 0;
    const surface = document.querySelector(`[${READING_SURFACE_ATTR}]`);
    if (!surface || !activeSettings?.readingGuide) return;
    const center = window.innerHeight * 0.48;
    const blocks = [...surface.querySelectorAll("p, li, blockquote, dd")]
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
      if (distance < bestDistance) { bestDistance = distance; best = block; }
    }
    document.querySelectorAll(`[${GUIDE_ATTR}]`).forEach((element) => {
      if (element !== best) element.removeAttribute(GUIDE_ATTR);
    });
    best?.setAttribute(GUIDE_ATTR, "true");

    const overlay = ensureSpotlight();
    if (!overlay || !best) return;
    const panes = ["top", "bottom", "left", "right"].map((name) => overlay.querySelector(`[data-pane="${name}"]`));
    if (panes.some((pane) => !pane)) return;
    const rect = best.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    const padX = 14;
    const padY = 10;
    const surfaceLeft = Math.max(0, surfaceRect.left);
    const surfaceRight = Math.min(window.innerWidth, surfaceRect.right);
    const surfaceTop = Math.max(0, surfaceRect.top);
    const surfaceBottom = Math.min(window.innerHeight, surfaceRect.bottom);
    const left = Math.max(surfaceLeft, rect.left - padX);
    const right = Math.min(surfaceRight, rect.right + padX);
    const top = Math.max(surfaceTop, rect.top - padY);
    const bottom = Math.min(surfaceBottom, rect.bottom + padY);
    Object.assign(panes[0].style, { left: `${surfaceLeft}px`, top: `${surfaceTop}px`, width: `${Math.max(0, surfaceRight - surfaceLeft)}px`, height: `${Math.max(0, top - surfaceTop)}px` });
    Object.assign(panes[1].style, { left: `${surfaceLeft}px`, top: `${bottom}px`, width: `${Math.max(0, surfaceRight - surfaceLeft)}px`, height: `${Math.max(0, surfaceBottom - bottom)}px` });
    Object.assign(panes[2].style, { left: `${surfaceLeft}px`, top: `${top}px`, width: `${Math.max(0, left - surfaceLeft)}px`, height: `${Math.max(0, bottom - top)}px` });
    Object.assign(panes[3].style, { left: `${right}px`, top: `${top}px`, width: `${Math.max(0, surfaceRight - right)}px`, height: `${Math.max(0, bottom - top)}px` });
  }

  function scheduleGuideUpdate() { if (!guideRaf) guideRaf = requestAnimationFrame(updateReadingGuide); }

  function startReadingGuide() {
    clearReadingGuide();
    if (!activeSettings?.readingGuide) return;
    guideListening = true;
    window.addEventListener("scroll", scheduleGuideUpdate, true);
    window.addEventListener("resize", scheduleGuideUpdate);
    scheduleGuideUpdate();
  }

  function isCriticalChrome(element) {
    return Boolean(element.closest("header,nav,[role='navigation'],[role='banner'],[role='search'],aside,[role='complementary']") || element.matches("header,nav,[role='navigation'],[role='banner'],[role='search'],aside,[role='complementary']"));
  }

  function markMovingChrome(settings) {
    document.querySelectorAll(`[${STATIC_ATTR}]`).forEach((element) => element.removeAttribute(STATIC_ATTR));
    if (!settings.reduceMotion) return;
    const surface = document.querySelector(`[${READING_SURFACE_ATTR}]`);
    const elements = [...document.body.querySelectorAll("body *")].slice(0, 1500);
    for (const element of elements) {
      if (element.id === DOCK_ID || element.id === BANNER_ID || element.id === SPOTLIGHT_ID || element.closest(`#${DOCK_ID},#${BANNER_ID},#${SPOTLIGHT_ID}`)) continue;
      if (isCriticalChrome(element)) continue;
      const position = getComputedStyle(element).position;
      const interactive = element.matches("button,a,input,select,textarea") || Boolean(element.querySelector("button,a,input,select,textarea"));
      if ((position === "fixed" || position === "sticky") && !interactive && (!surface || !surface.contains(element))) {
        element.setAttribute(STATIC_ATTR, "true");
      }
    }
  }

  function applyMediaPolicy(settings) {
    document.querySelectorAll(`[${PAUSED_ATTR}]`).forEach((element) => {
      if (!(element instanceof HTMLVideoElement)) return;
      if (element.getAttribute(WAS_PLAYING_ATTR) === "true") {
        try { element.play?.().catch?.(() => undefined); } catch { /* leave paused if blocked */ }
      }
      element.removeAttribute(PAUSED_ATTR);
      element.removeAttribute(WAS_PLAYING_ATTR);
    });
    if (!settings.pauseMedia) return;
    document.querySelectorAll("video").forEach((video) => {
      try {
        if (!video.paused) video.setAttribute(WAS_PLAYING_ATTR, "true");
        video.setAttribute(PAUSED_ATTR, "true");
        video.pause();
      } catch { /* inaccessible media stays unchanged */ }
    });
  }

  function pageStyle(settings) {
    const lineHeight = Math.max(1.6, 1.42 * settings.lineSpacing).toFixed(2);
    const textScalePercent = Math.round(settings.textScale * 100);
    const rules = [
      `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] { background-image:none !important; }`,
      `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] p,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] li,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] blockquote,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] dd { font-size:${textScalePercent}% !important; line-height:${lineHeight} !important; letter-spacing:.012em !important; word-spacing:.035em !important; }`,
      `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] p { margin-block:0 1.18em !important; }`,
      `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h1,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h2,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h3 { line-height:1.16 !important; margin-top:1.65em !important; margin-bottom:.65em !important; letter-spacing:-.012em !important; }`,
    ];

    if (settings.legibleTypeface) {
      rules.push(`html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}],html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] * { font-family:Arial,Verdana,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif !important; }`);
    }

    if (settings.focusReadingLayout) {
      rules.push(
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] { box-sizing:border-box !important; width:min(100%,780px) !important; max-width:780px !important; margin-left:auto !important; margin-right:auto !important; padding:clamp(24px,4vw,48px) !important; border:2px solid rgba(98,105,101,.24) !important; border-radius:20px !important; box-shadow:0 18px 58px rgba(20,29,26,.16) !important; }`
      );
    }

    if (settings.photophobiaMode) {
      rules.push(
        `html[data-somatosync-shield="on"],html[data-somatosync-shield="on"] body { background:#11181b !important; color:#d8e2de !important; background-image:none !important; }`,
        `html[data-somatosync-shield="on"] body *:not(img):not(video):not(svg):not(canvas) { background-image:none !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] { background:#1d2a2f !important; color:#d8e2de !important; border-color:#33464a !important; box-shadow:0 16px 46px rgba(0,0,0,.26) !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] p,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] li,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] dd,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] blockquote { color:#c7d3cf !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h1,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h2,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h3,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] h4 { color:#e5ece9 !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] a { color:#9bc4bb !important; text-decoration-thickness:2px !important; text-underline-offset:3px !important; }`,
        `html[data-somatosync-shield="on"] header,html[data-somatosync-shield="on"] nav,html[data-somatosync-shield="on"] aside,html[data-somatosync-shield="on"] footer,html[data-somatosync-shield="on"] [role="navigation"],html[data-somatosync-shield="on"] [role="complementary"] { background-color:#172126 !important; color:#aebdb7 !important; border-color:#33464a !important; }`
      );
    } else if (settings.warmPalette) {
      rules.push(
        `html[data-somatosync-shield="on"] body { background:#d4d6d2 !important; color:#202a2a !important; background-image:none !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] { background:#eceeea !important; color:#202a2a !important; border-color:#abb4af !important; box-shadow:0 14px 42px rgba(37,49,48,.14) !important; }`,
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] p,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] li { color:#34413f !important; }`
      );
    }

    if (settings.calmMedia) {
      const brightness = settings.photophobiaMode ? ".66" : settings.strongerCalming ? ".72" : ".8";
      rules.push(`html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] img,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] video,html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] svg:not(svg[aria-hidden="true"]) { filter:saturate(.52) brightness(${brightness}) contrast(.94) !important; opacity:.84 !important; }`);
    }

    if (settings.pauseMedia) {
      rules.push(`html[data-somatosync-shield="on"] video[${PAUSED_ATTR}] { filter:grayscale(.85) brightness(.35) contrast(.82) !important; opacity:.38 !important; }`);
    }

    if (settings.reduceMotion) {
      rules.push(
        `html[data-somatosync-shield="on"] *,html[data-somatosync-shield="on"] *::before,html[data-somatosync-shield="on"] *::after { animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; transition-delay:0ms !important; scroll-behavior:auto !important; }`,
        `html[data-somatosync-shield="on"] [${STATIC_ATTR}] { position:static !important; transform:none !important; }`
      );
    }

    if (settings.simplifyChrome) {
      // Never hide generic navigation or sidebars. Only clearly non-essential promotional/recommendation chrome is removed.
      rules.push(
        `html[data-somatosync-shield="on"] [class*="advert" i],html[data-somatosync-shield="on"] [id*="advert" i],html[data-somatosync-shield="on"] [aria-label*="advert" i],html[data-somatosync-shield="on"] [class*="promo" i],html[data-somatosync-shield="on"] [class*="recommend" i],html[data-somatosync-shield="on"] [aria-label*="related" i],html[data-somatosync-shield="on"] [class*="social-share" i] { display:none !important; }`,
        `html[data-somatosync-shield="on"] aside,html[data-somatosync-shield="on"] [role="complementary"],html[data-somatosync-shield="on"] [class*="sidebar" i],html[data-somatosync-shield="on"] [id*="sidebar" i] { opacity:.82 !important; filter:saturate(.72) contrast(.96) !important; transition:opacity .1s linear,filter .1s linear !important; }`,
        `html[data-somatosync-shield="on"] aside:hover,html[data-somatosync-shield="on"] aside:focus-within,html[data-somatosync-shield="on"] [role="complementary"]:hover,html[data-somatosync-shield="on"] [role="complementary"]:focus-within,html[data-somatosync-shield="on"] [class*="sidebar" i]:hover,html[data-somatosync-shield="on"] [class*="sidebar" i]:focus-within { opacity:1 !important; filter:none !important; }`
      );
    }

    if (settings.readingGuide) {
      rules.push(
        `html[data-somatosync-shield="on"] [${READING_SURFACE_ATTR}] [${GUIDE_ATTR}="true"] { position:relative !important; z-index:2147482100 !important; opacity:1 !important; background:${settings.photophobiaMode ? "#213336" : "rgba(117,145,135,.16)"} !important; border-left:5px solid ${settings.photophobiaMode ? "#7faea4" : "#4c7770"} !important; border-radius:9px !important; padding:.5em .8em !important; box-shadow:0 0 0 1px ${settings.photophobiaMode ? "#3f625d" : "rgba(76,119,112,.24)"} !important; }`
      );
    }

    return rules.join("\n");
  }

  function normalizeSettingsForSurface(settings, surface) {
    if (surface !== document.body) return { ...settings };
    // A non-reading page must never have its whole body scaled/reflowed.
    return {
      ...settings,
      textScale: 1,
      lineSpacing: 1,
      focusReadingLayout: false,
      readingGuide: false,
      readingSpotlight: false,
      simplifyChrome: false,
    };
  }

  function applySettingsToPage(settings) {
    document.getElementById(STYLE_ID)?.remove();
    document.querySelectorAll(`[${READING_SURFACE_ATTR}]`).forEach((element) => element.removeAttribute(READING_SURFACE_ATTR));
    document.querySelectorAll(`[${STATIC_ATTR}]`).forEach((element) => element.removeAttribute(STATIC_ATTR));
    clearReadingGuide();

    const surface = readingSurface();
    activeSettings = normalizeSettingsForSurface(settings, surface);
    surface?.setAttribute(READING_SURFACE_ATTR, "true");

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = pageStyle(activeSettings);
    document.head.appendChild(style);
    document.documentElement.setAttribute("data-somatosync-shield", "on");
    markMovingChrome(activeSettings);
    applyMediaPolicy(activeSettings);
    startReadingGuide();
    pageApplied = true;
  }

  function restorePage() {
    document.getElementById(STYLE_ID)?.remove();
    document.documentElement.removeAttribute("data-somatosync-shield");
    document.querySelectorAll(`[${READING_SURFACE_ATTR}]`).forEach((element) => element.removeAttribute(READING_SURFACE_ATTR));
    document.querySelectorAll(`[${STATIC_ATTR}]`).forEach((element) => element.removeAttribute(STATIC_ATTR));
    document.querySelectorAll(`[${PAUSED_ATTR}]`).forEach((element) => {
      if (!(element instanceof HTMLVideoElement)) return;
      const shouldResume = element.getAttribute(WAS_PLAYING_ATTR) === "true";
      element.removeAttribute(PAUSED_ATTR);
      element.removeAttribute(WAS_PLAYING_ATTR);
      if (shouldResume) {
        try { element.play?.().catch?.(() => undefined); } catch { /* leave paused if blocked */ }
      }
    });
    clearReadingGuide();
    removeDock();
    pageApplied = false;
    activeSettings = null;
    activeProfileUpdatedAt = null;
  }

  function readSitePrefs(callback) {
    chrome.storage.local.get({ somatosyncShieldSitePrefs: {} }, (stored) => callback(stored.somatosyncShieldSitePrefs || {}));
  }

  function writeSitePref(patch) {
    readSitePrefs((prefs) => {
      chrome.storage.local.set({
        somatosyncShieldSitePrefs: {
          ...prefs,
          [SITE_KEY]: { ...(prefs[SITE_KEY] || {}), ...patch, updatedAt: new Date().toISOString() },
        },
      });
    });
  }

  function setAlwaysForSite(always) {
    writeSitePref({ always: Boolean(always), consentVersion: CONSENT_VERSION });
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
        *{box-sizing:border-box}.wrap{font-family:Arial,Verdana,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#1f2a30}
        .bar{display:flex;align-items:center;gap:10px;min-width:315px;padding:12px 13px;border:1px solid #cfd9dc;border-radius:16px;background:#fff;box-shadow:0 14px 34px rgba(19,37,46,.2)}
        .dot{width:10px;height:10px;border-radius:999px;background:#4f887e;box-shadow:0 0 0 4px #e3f0ed}.copy{min-width:0;flex:1}.copy strong{display:block;font-size:15.5px;line-height:1.25}.copy span{display:block;margin-top:3px;font-size:14.5px;line-height:1.35;color:#66737c}
        button{border:1px solid #d5dee1;border-radius:10px;padding:9px 11px;background:#fff;color:#30414a;font:650 14.5px/1 system-ui;cursor:pointer}button:hover{background:#f3f6f7}.restore{color:#7c4f4f}
        .panel{display:none;margin-top:8px;width:370px;padding:15px;border:1px solid #cfd9dc;border-radius:16px;background:#fff;box-shadow:0 14px 34px rgba(19,37,46,.18)}.panel.open{display:block}.why{font-size:14.5px;line-height:1.45;color:#5d6b73;margin-bottom:11px}.grid{display:grid;gap:8px}.row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border-radius:10px;background:#f5f7f7}.row span{font-size:14.5px;font-weight:650}.row input{width:19px;height:19px;accent-color:#315f72}.always{margin-top:11px;padding-top:11px;border-top:1px solid #e2e7e9;background:#fff}.always small{display:block;margin-top:3px;color:#748088;font-size:14px;line-height:1.4}.note{margin-top:10px;font-size:14px;line-height:1.4;color:#66737c}
      </style>
      <div class="wrap">
        <div class="bar"><span class="dot"></span><div class="copy"><strong>SomatoSync Shield active</strong><span>${changes.length} reversible page ${changes.length === 1 ? "change" : "changes"}</span></div><button id="adjust">Adjust</button><button id="restore" class="restore">Restore</button></div>
        <div class="panel" id="panel">
          <div class="why">${reasonText(activeSettings)}</div>
          <div class="grid">
            <label class="row"><span>Low-luminance sensory theme</span><input data-key="photophobiaMode" type="checkbox" ${activeSettings.photophobiaMode ? "checked" : ""}></label>
            <label class="row"><span>Calm images</span><input data-key="calmMedia" type="checkbox" ${activeSettings.calmMedia ? "checked" : ""}></label>
            <label class="row"><span>Pause moving media</span><input data-key="pauseMedia" type="checkbox" ${activeSettings.pauseMedia ? "checked" : ""}></label>
            <label class="row"><span>Focus article</span><input data-key="simplifyChrome" type="checkbox" ${activeSettings.simplifyChrome ? "checked" : ""}></label>
            <label class="row"><span>Reading spotlight</span><input data-key="readingSpotlight" type="checkbox" ${activeSettings.readingSpotlight ? "checked" : ""}></label>
            <label class="row"><span>Freeze motion</span><input data-key="reduceMotion" type="checkbox" ${activeSettings.reduceMotion ? "checked" : ""}></label>
          </div>
          <label class="row always"><span>Always use on ${SITE_LABEL}</span><input id="always" type="checkbox"><small></small></label>
          <div class="note">Navigation and sidebars stay available. Only clear ads/promotions/recommendations may be hidden.</div>
        </div>
      </div>`;

    const panel = root.getElementById("panel");
    root.getElementById("adjust")?.addEventListener("click", () => panel?.classList.toggle("open"));
    root.getElementById("restore")?.addEventListener("click", () => { restorePage(); removeBanner(); });
    root.querySelectorAll("input[data-key]").forEach((input) => {
      input.addEventListener("change", (event) => {
        const target = event.currentTarget;
        if (!(target instanceof HTMLInputElement) || !activeSettings) return;
        const key = target.dataset.key;
        activeSettings = { ...activeSettings, [key]: target.checked };
        if (key === "readingSpotlight") activeSettings.readingGuide = target.checked || activeSettings.readingGuide;
        if (key === "photophobiaMode" && target.checked) activeSettings.warmPalette = false;
        applySettingsToPage(activeSettings);
        createDock();
        document.getElementById(DOCK_ID)?.shadowRoot?.getElementById("panel")?.classList.add("open");
      });
    });
    const always = root.getElementById("always");
    if (always instanceof HTMLInputElement) {
      readSitePrefs((prefs) => {
        const pref = prefs[SITE_KEY] || {};
        always.checked = Boolean(pref.always && pref.consentVersion === CONSENT_VERSION);
      });
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
    if (surface === document.body) return false;
    const text = surface?.innerText?.replace(/\s+/g, " ").trim() || "";
    return text.length >= 1200;
  }

  function showPreflight(profile) {
    if (!profile || document.getElementById(BANNER_ID) || !readingHeavyPage()) return;
    const useRecommended = Boolean(profile.recommended);
    const preview = settingsFrom(profile, useRecommended);
    const changes = visibleChanges(preview).slice(0, 5);
    readSitePrefs((prefs) => {
      const pref = prefs[SITE_KEY] || {};
      if (pref.dismissedProfileAt === profile.updatedAt) return;
      if (document.getElementById(BANNER_ID) || pageApplied) return;
      const banner = document.createElement("div");
      banner.id = BANNER_ID;
      banner.setAttribute("role", "dialog");
      banner.setAttribute("aria-label", "SomatoSync reading setup permission");
      banner.innerHTML = `
        <div style="font:750 16px/1.35 Arial,Verdana,system-ui;color:#17242a">Use SomatoSync supports on this site?</div>
        <div style="margin-top:6px;font:400 14.5px/1.5 Arial,Verdana,system-ui;color:#4b5a62">Nothing on ${SITE_LABEL} changes until you approve it. ${reasonText(preview)}</div>
        ${changes.length ? `<div style="margin-top:9px;font:650 14.5px/1.45 Arial,Verdana,system-ui;color:#315f72">${changes.join(" · ")}</div>` : ""}
        <div style="display:flex;gap:8px;margin-top:13px"><button data-action="use" style="border:0;border-radius:10px;padding:9px 13px;background:#315f72;color:white;font:700 14.5px Arial,Verdana,system-ui;cursor:pointer">Use on this page</button><button data-action="dismiss" style="border:1px solid #d6dde1;border-radius:10px;padding:9px 13px;background:white;color:#475569;font:650 14.5px Arial,Verdana,system-ui;cursor:pointer">Not now</button></div>`;
      Object.assign(banner.style, { position: "fixed", right: "20px", bottom: "20px", zIndex: "2147483647", width: "min(410px,calc(100vw - 32px))", padding: "17px", border: "1px solid #d6dde1", borderRadius: "16px", background: "#fff", boxShadow: "0 16px 40px rgba(15,23,42,.2)" });
      banner.querySelector('[data-action="use"]')?.addEventListener("click", () => applyPage(profile, useRecommended));
      banner.querySelector('[data-action="dismiss"]')?.addEventListener("click", () => { removeBanner(); writeSitePref({ dismissedProfileAt: profile.updatedAt }); });
      document.body.appendChild(banner);
    });
  }

  function showSetupUpdate(profile) {
    if (!profile || document.getElementById(BANNER_ID)) return;
    const recommended = activeSource === "recommended" && Boolean(profile.recommended);
    const preview = settingsFrom(profile, recommended);
    if (!preview) return;
    readSitePrefs((prefs) => {
      const pref = prefs[SITE_KEY] || {};
      if (pref.dismissedUpdateAt === profile.updatedAt) return;
      const changes = visibleChanges(preview).slice(0, 5);
      const banner = document.createElement("div");
      banner.id = BANNER_ID;
      banner.setAttribute("role", "dialog");
      banner.setAttribute("aria-label", "Updated SomatoSync reading setup");
      banner.innerHTML = `<div style="font:750 16px/1.35 Arial,Verdana,system-ui;color:#17242a">Your SomatoSync setup changed</div><div style="margin-top:6px;font:400 14.5px/1.5 Arial,Verdana,system-ui;color:#4b5a62">Update this already-approved page to the newest supports?</div>${changes.length ? `<div style="margin-top:9px;font:650 14.5px/1.45 Arial,Verdana,system-ui;color:#315f72">${changes.join(" · ")}</div>` : ""}<div style="display:flex;gap:8px;margin-top:13px"><button data-action="update" style="border:0;border-radius:10px;padding:9px 13px;background:#315f72;color:white;font:700 14.5px Arial,Verdana,system-ui;cursor:pointer">Update page</button><button data-action="keep" style="border:1px solid #d6dde1;border-radius:10px;padding:9px 13px;background:white;color:#475569;font:650 14.5px Arial,Verdana,system-ui;cursor:pointer">Keep current</button></div>`;
      Object.assign(banner.style, { position: "fixed", right: "20px", bottom: "20px", zIndex: "2147483647", width: "min(410px,calc(100vw - 32px))", padding: "17px", border: "1px solid #d6dde1", borderRadius: "16px", background: "#fff", boxShadow: "0 16px 40px rgba(15,23,42,.2)" });
      banner.querySelector('[data-action="update"]')?.addEventListener("click", () => applyPage(profile, recommended));
      banner.querySelector('[data-action="keep"]')?.addEventListener("click", () => { removeBanner(); writeSitePref({ dismissedUpdateAt: profile.updatedAt }); });
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

      const sitePref = stored.somatosyncShieldSitePrefs?.[SITE_KEY] || {};
      const explicitAlwaysConsent = Boolean(sitePref.always && sitePref.consentVersion === CONSENT_VERSION);
      if (explicitAlwaysConsent) {
        applyPage(currentProfile, Boolean(currentProfile.recommended));
        return;
      }

      // Consent-first invariant: profile sync, Focus Mode, tab navigation, and old site prefs
      // can NEVER alter a new page. Only a click in the preflight/popup or v2 site consent can.
      if (pageApplied) {
        if (currentProfile.updatedAt && currentProfile.updatedAt !== activeProfileUpdatedAt) showSetupUpdate(currentProfile);
        return;
      }

      restorePage();
      if (stored.somatosyncShieldAutoPreflight) window.setTimeout(() => showPreflight(currentProfile), 450);
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
      if (currentProfile) applyPage(currentProfile, Boolean(currentProfile.recommended));
      sendResponse({ applied: Boolean(currentProfile), pageApplied, changes: visibleChanges(activeSettings) });
      return;
    }
    if (message?.type === "SOMATOSYNC_SHIELD_RESTORE") {
      restorePage(); removeBanner(); sendResponse({ applied: false, pageApplied }); return;
    }
    if (message?.type === "SOMATOSYNC_SHIELD_STATUS") {
      sendResponse({ pageApplied, hasProfile: Boolean(currentProfile), hasRecommended: Boolean(currentProfile?.recommended), source: activeSource, changes: visibleChanges(activeSettings) });
    }
  });

  load();
})();
