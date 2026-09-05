import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { useAppMode } from "../../context/AppModeContext";
import { detectFaceSignal, loadFaceLandmarker, type FaceLandmarkerLike } from "./faceLandmarker";
import {
  blendTensorFlowProbability, estimateStrain, planAdaptiveIntervention, profileSettings, summarizeSignalWindow, updateModelFromConfirmation,
} from "./neuroAdaptiveEngine";
import {
  loadAdaptiveSessions, loadAdaptiveSettings, loadPersonalizationModel, saveAdaptiveSession,
  saveAdaptiveSettings, savePersonalizationModel, DEFAULT_ADAPTIVE_SETTINGS,
} from "./neuroAdaptiveStorage";
import { getTensorFlowTrainingStatus, predictConfirmedStrain } from "./tfPersonalization";
import { getCurrentAdaptiveCheckIn } from "./symptomContext";
import { beginAdaptiveResponse, finishAdaptiveResponse } from "../recovery-memory/recoveryMemoryEngine";
import { broadcastShieldProfile } from "./shieldBridge";
import { applyPlainLanguage, restorePlainLanguage, stopReadingAloud } from "./focusReadingTools";
import type {
  AdaptiveCheckIn, AdaptiveProfile, FaceSignalSample, FocusMonitorSnapshot, FocusMonitorStatus,
  NeuroAdaptiveSessionSummary, NeuroAdaptiveSettings, PersonalizationModel, SignalWindow, StrainEstimate,
} from "./neuroAdaptiveTypes";

const CALIBRATION_MS = 12_000;
const VISUAL_WINDOW_MS = 5_000;
const INTERACTION_WINDOW_MS = 20_000;
const QUALITY_WINDOW_MS = 10_000;
const SAMPLE_INTERVAL_MS = 250;
const PROMPT_COOLDOWN_MS = 90_000;
const ROUTE_GRACE_MS = 4_000;
const ACTIVE_START_GRACE_MS = 1_500;
const TAB_RESUME_GRACE_MS = 3_000;
const UNDO_REARM_GRACE_MS = 5_000;
const BREAK_SECONDS = 120;
const DEFAULT_CHECK_IN: AdaptiveCheckIn = { lightSensitivity: 1, visualMotionDiscomfort: 1, mentalFatigue: 1 };

const ZERO_WINDOW: SignalWindow = {
  blinkRateBpm: 0,
  browTension: 0,
  faceScale: 0,
  headMotion: 0,
  gazeDeviation: 0,
  scrollReversalsPerMinute: 0,
  idleRatio: 0,
};

interface ContextValue extends FocusMonitorSnapshot {
  settings: NeuroAdaptiveSettings;
  setSettings: (settings: NeuroAdaptiveSettings) => void;
  applyProfile: (profile: AdaptiveProfile, enabled?: boolean) => void;
  disable: () => void;
  startMonitoring: (checkIn?: AdaptiveCheckIn, baseSettings?: NeuroAdaptiveSettings) => Promise<void>;
  stopMonitoring: () => void;
  turnOffFocus: () => void;
  applyPromptAdaptation: () => void;
  beginPromptBreak: () => void;
  continueWithoutChange: () => void;
  resumeFromBreak: () => void;
  submitPromptFeedback: (confirmed: boolean) => void;
  latestFeedback: boolean | null;
  adaptationActive: boolean;
  adaptationReasons: string[];
  adaptationChanges: string[];
  adaptationRecommendBreak: boolean;
  adaptationSource: "symptoms" | "live" | null;
  revertLastAdaptation: () => void;
}

const Context = createContext<ContextValue | null>(null);

function applyToDocument(settings: NeuroAdaptiveSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("neuro-adaptive-active", settings.enabled);
  root.classList.toggle("reduce-motion", settings.enabled && settings.reduceMotion);
  root.classList.toggle("neuro-soft-contrast", settings.enabled && settings.softContrast);
  root.classList.toggle("neuro-audio-first", settings.enabled && settings.textToSpeechPreferred);
  root.classList.toggle("neuro-plain-language", settings.enabled && settings.plainLanguage);
  root.classList.toggle("neuro-low-density", settings.enabled && settings.reduceDensity);
  root.classList.toggle("neuro-reading-layout", settings.enabled && settings.focusReadingLayout);
  root.classList.toggle("neuro-calm-media", settings.enabled && settings.calmMedia);
  root.classList.toggle("neuro-stable-viewport", settings.enabled && settings.stabilizeViewport);
  root.classList.toggle("neuro-emphasize-structure", settings.enabled && settings.emphasizeStructure);
  root.classList.toggle("neuro-photophobia", settings.enabled && settings.photophobiaMode);
  root.classList.toggle("neuro-reading-spotlight", settings.enabled && settings.readingSpotlight);
  root.classList.toggle("neuro-pause-media", settings.enabled && settings.pauseMedia);
  root.style.setProperty("--adaptive-text-scale", settings.enabled ? String(settings.textScale) : "1");
  root.style.setProperty("--adaptive-line-spacing", settings.enabled ? String(settings.lineSpacing) : "1");
  root.dataset.neuroAdaptiveProfile = settings.enabled ? settings.profile : "off";
}

function signalFamilies(estimate: StrainEstimate) {
  const families = new Set<string>();
  for (const reason of estimate.reasons) {
    if (reason.key === "blinkRateBpm" || reason.key === "gazeDeviation") families.add("eyes");
    else if (reason.key === "faceScale" || reason.key === "headMotion") families.add("posture");
    else if (reason.key === "browTension") families.add("tension");
    else families.add("interaction");
  }
  return families.size;
}

export function NeuroAdaptiveProvider({ children }: { children: ReactNode }) {
  const { mode, userId } = useAppMode();
  const [settings, setState] = useState<NeuroAdaptiveSettings>(DEFAULT_ADAPTIVE_SETTINGS);
  const [status, setStatusState] = useState<FocusMonitorStatus>("off");
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [trackingQualityPercent, setTrackingQualityPercent] = useState(0);
  const [estimate, setEstimate] = useState<StrainEstimate | null>(null);
  const [promptVisible, setPromptVisibleState] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(BREAK_SECONDS);
  const [error, setError] = useState("");
  const [latestFeedback, setLatestFeedback] = useState<boolean | null>(null);
  const [labeledExampleCount, setLabeledExampleCount] = useState(0);
  const [tensorflowReady, setTensorflowReady] = useState(false);
  const [adaptationActive, setAdaptationActive] = useState(false);
  const [adaptationReasons, setAdaptationReasons] = useState<string[]>([]);
  const [adaptationChanges, setAdaptationChanges] = useState<string[]>([]);
  const [adaptationRecommendBreak, setAdaptationRecommendBreak] = useState(false);
  const [adaptationSource, setAdaptationSource] = useState<"symptoms" | "live" | null>(null);

  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarkerLike | null>(null);
  const animationRef = useRef<number | null>(null);
  const statusRef = useRef<FocusMonitorStatus>("off");
  const promptVisibleRef = useRef(false);
  const calibrationSamplesRef = useRef<FaceSignalSample[]>([]);
  const activeSamplesRef = useRef<FaceSignalSample[]>([]);
  const qualityEventsRef = useRef<Array<{ time: number; detected: boolean }>>([]);
  const referenceRef = useRef<SignalWindow>(ZERO_WINDOW);
  const calibrationStartedRef = useRef(0);
  const monitorStartedRef = useRef(0);
  const lastSampleRef = useRef(0);
  const lastInteractionRef = useRef(Date.now());
  const reversalTimesRef = useRef<number[]>([]);
  const lastPathRef = useRef("");
  const graceUntilRef = useRef(0);
  const elevatedHistoryRef = useRef<boolean[]>([]);
  const lastPromptAtRef = useRef(-PROMPT_COOLDOWN_MS);
  const promptCountRef = useRef(0);
  const latestEstimateRef = useRef<StrainEstimate | null>(null);
  const monitorCheckInRef = useRef<AdaptiveCheckIn>(DEFAULT_CHECK_IN);
  const personalizationRef = useRef<PersonalizationModel>(loadPersonalizationModel());
  const sessionsRef = useRef<NeuroAdaptiveSessionSummary[]>(loadAdaptiveSessions());
  const tfBusyRef = useRef(false);
  const lastTfAtRef = useRef(0);
  const trackingQualityRef = useRef(0);
  const inferenceFailuresRef = useRef(0);
  const previousSettingsRef = useRef<NeuroAdaptiveSettings | null>(null);
  const responseTimerRef = useRef<number | null>(null);
  const pendingResponseRef = useRef<{ id: string; beforeScore: number | null } | null>(null);
  const pausedFromRef = useRef<"active" | "calibrating" | null>(null);
  const resumeTimerRef = useRef<number | null>(null);

  const setStatus = useCallback((next: FocusMonitorStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const setPromptVisible = useCallback((visible: boolean) => {
    promptVisibleRef.current = visible;
    setPromptVisibleState(visible);
  }, []);

  useEffect(() => {
    const loaded = mode === "signed-out" ? DEFAULT_ADAPTIVE_SETTINGS : loadAdaptiveSettings();
    setState(loaded);
    applyToDocument(loaded);
    broadcastShieldProfile(loaded);
    sessionsRef.current = mode === "signed-out" ? [] : loadAdaptiveSessions();
    personalizationRef.current = mode === "signed-out" ? loadPersonalizationModel() : loadPersonalizationModel();
    const training = getTensorFlowTrainingStatus(sessionsRef.current);
    setLabeledExampleCount(training.exampleCount);
    setTensorflowReady(training.canTrain);
    previousSettingsRef.current = null;
    setAdaptationActive(false);
    setAdaptationReasons([]);
    setAdaptationChanges([]);
    setAdaptationRecommendBreak(false);
    setAdaptationSource(null);
  }, [mode, userId]);


  useEffect(() => applyToDocument(settings), [settings]);

  useEffect(() => {
    if (!settings.enabled || !settings.plainLanguage) {
      restorePlainLanguage();
      return;
    }
    applyPlainLanguage();
    const content = document.querySelector(".app-content");
    if (!content) return;
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        applyPlainLanguage(content);
      });
    });
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [settings.enabled, settings.plainLanguage]);

  // Pause only media that was actually playing when Focus requested sensory reduction.
  // Navigation and controls remain untouched; disabling the support restores prior playback.
  useEffect(() => {
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(".app-content video"));
    if (settings.enabled && settings.pauseMedia) {
      for (const video of videos) {
        if (!video.paused) video.dataset.focusWasPlaying = "true";
        video.dataset.focusPaused = "true";
        try { video.pause(); } catch { /* keep the page usable if a media element rejects pause */ }
      }
      return;
    }
    for (const video of videos) {
      const shouldResume = video.dataset.focusWasPlaying === "true";
      delete video.dataset.focusPaused;
      delete video.dataset.focusWasPlaying;
      if (shouldResume) void video.play().catch(() => undefined);
    }
  }, [settings.enabled, settings.pauseMedia]);

  useEffect(() => () => {
    document.querySelectorAll<HTMLVideoElement>('video[data-focus-paused="true"]').forEach((video) => {
      const shouldResume = video.dataset.focusWasPlaying === "true";
      delete video.dataset.focusPaused;
      delete video.dataset.focusWasPlaying;
      if (shouldResume) void video.play().catch(() => undefined);
    });
  }, []);

  // Reading Spotlight is a manual accessibility aid. It uses pointer/focus/viewport context
  // rather than claiming eye tracking. Long paragraphs receive a smaller line-window spotlight,
  // transitions use hysteresis to avoid flicker, and safety/orientation content remains readable.
  useEffect(() => {
    const OVERLAY_ID = "somatosync-focus-reading-spotlight";
    const ACTIVE_ATTR = "data-focus-anchor-current";
    const SAFETY_SELECTOR = '[data-focus-preserve-text="true"], [data-focus-safety="true"], [role="alert"], [aria-live="assertive"]';
    const BLOCK_SELECTOR = '.app-content p, .app-content li, .app-content blockquote, .app-content [data-focus-reading-block="true"]';
    const SWITCH_MARGIN_PX = 72;
    const POINTER_PREFERENCE_MS = 1_200;
    const KEYBOARD_PREFERENCE_MS = 2_500;
    const LONG_BLOCK_LINE_THRESHOLD = 6;
    const LONG_BLOCK_WINDOW_LINES = 3;

    let pointerTarget: HTMLElement | null = null;
    let pointerY: number | null = null;
    let pointerPreferredUntil = 0;
    let focusTarget: HTMLElement | null = null;
    let keyboardTarget: HTMLElement | null = null;
    let keyboardPreferredUntil = 0;
    let activeTarget: HTMLElement | null = null;

    const clearActiveTarget = () => {
      document.querySelectorAll(`[${ACTIVE_ATTR}]`).forEach((node) => node.removeAttribute(ACTIVE_ATTR));
      activeTarget = null;
    };
    const clear = () => {
      document.getElementById(OVERLAY_ID)?.remove();
      clearActiveTarget();
    };
    if (!settings.enabled || !settings.readingSpotlight) {
      clear();
      return;
    }

    clear();
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("aria-hidden", "true");
    Object.assign(overlay.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "24" });

    const paneBackground = settings.photophobiaMode ? "rgba(8,16,18,.42)" : "rgba(16,25,27,.30)";
    const panes = ["top", "bottom", "left", "right"].map((name) => {
      const pane = document.createElement("div");
      pane.dataset.pane = name;
      Object.assign(pane.style, {
        position: "fixed",
        pointerEvents: "none",
        background: paneBackground,
        transition: "top .18s ease-out,left .18s ease-out,width .18s ease-out,height .18s ease-out,background .18s ease-out",
      });
      overlay.appendChild(pane);
      return pane;
    });

    const frame = document.createElement("div");
    frame.dataset.focusSpotlightFrame = "true";
    Object.assign(frame.style, {
      position: "fixed",
      pointerEvents: "none",
      borderRadius: "12px",
      border: "1px solid color-mix(in srgb, var(--color-border) 74%, transparent)",
      boxShadow: "0 7px 24px rgba(0,0,0,.08)",
      transition: "top .18s ease-out,left .18s ease-out,width .18s ease-out,height .18s ease-out,opacity .12s linear",
      opacity: "0",
    });
    overlay.appendChild(frame);
    document.body.appendChild(overlay);

    let raf = 0;
    const eligibleBlock = (node: Element | null): HTMLElement | null => {
      if (!(node instanceof HTMLElement)) return null;
      const block = node.closest<HTMLElement>(BLOCK_SELECTOR);
      if (!block || block.closest(SAFETY_SELECTOR)) return null;
      if ((block.textContent?.trim().length ?? 0) < 20) return null;
      return block;
    };

    const visibleRatio = (node: HTMLElement) => {
      const rect = node.getBoundingClientRect();
      const viewportTop = 72;
      const viewportBottom = window.innerHeight - 40;
      const visible = Math.max(0, Math.min(rect.bottom, viewportBottom) - Math.max(rect.top, viewportTop));
      return rect.height > 0 ? Math.min(1, visible / rect.height) : 0;
    };

    const mergedLineRects = (node: HTMLElement) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const fragments = Array.from(range.getClientRects())
        .filter((rect) => rect.width > 4 && rect.height > 8)
        .sort((a, b) => a.top - b.top || a.left - b.left);
      range.detach();
      const lines: Array<{ top: number; bottom: number; left: number; right: number }> = [];
      for (const rect of fragments) {
        const line = lines.find((candidate) => Math.abs(candidate.top - rect.top) <= 3);
        if (line) {
          line.top = Math.min(line.top, rect.top);
          line.bottom = Math.max(line.bottom, rect.bottom);
          line.left = Math.min(line.left, rect.left);
          line.right = Math.max(line.right, rect.right);
        } else {
          lines.push({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
        }
      }
      return lines;
    };

    const spotlightRect = (target: HTMLElement, preferredY: number | null) => {
      const blockRect = target.getBoundingClientRect();
      const lines = mergedLineRects(target);
      if (lines.length < LONG_BLOCK_LINE_THRESHOLD) return blockRect;

      const anchorY = preferredY != null && preferredY >= blockRect.top && preferredY <= blockRect.bottom
        ? preferredY
        : Math.min(blockRect.bottom, Math.max(blockRect.top, window.innerHeight * 0.48));
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      lines.forEach((line, index) => {
        const distance = Math.abs((line.top + line.bottom) / 2 - anchorY);
        if (distance < nearestDistance) {
          nearestIndex = index;
          nearestDistance = distance;
        }
      });
      const maxStart = Math.max(0, lines.length - LONG_BLOCK_WINDOW_LINES);
      const start = Math.min(maxStart, Math.max(0, nearestIndex - 1));
      const selected = lines.slice(start, start + LONG_BLOCK_WINDOW_LINES);
      return {
        left: blockRect.left,
        right: blockRect.right,
        top: selected[0]?.top ?? blockRect.top,
        bottom: selected[selected.length - 1]?.bottom ?? blockRect.bottom,
        width: blockRect.width,
        height: Math.max(1, (selected[selected.length - 1]?.bottom ?? blockRect.bottom) - (selected[0]?.top ?? blockRect.top)),
        x: blockRect.x,
        y: selected[0]?.top ?? blockRect.y,
        toJSON: () => ({}),
      } as DOMRect;
    };

    const chooseTarget = (blocks: HTMLElement[]) => {
      const now = performance.now();
      if (focusTarget && blocks.includes(focusTarget)) return focusTarget;
      if (keyboardTarget && now < keyboardPreferredUntil && blocks.includes(keyboardTarget)) return keyboardTarget;
      if (pointerTarget && now < pointerPreferredUntil && blocks.includes(pointerTarget)) return pointerTarget;

      const center = window.innerHeight * 0.48;
      const candidate = blocks.reduce((best, node) => {
        const rect = node.getBoundingClientRect();
        const distance = Math.abs((rect.top + rect.bottom) / 2 - center);
        return distance < best.distance ? { node, distance } : best;
      }, { node: blocks[0], distance: Number.POSITIVE_INFINITY });

      if (activeTarget && blocks.includes(activeTarget) && visibleRatio(activeTarget) >= 0.32) {
        const activeRect = activeTarget.getBoundingClientRect();
        const activeDistance = Math.abs((activeRect.top + activeRect.bottom) / 2 - center);
        // Hysteresis: keep the current block until the next block is clearly more central.
        if (candidate.distance + SWITCH_MARGIN_PX >= activeDistance) return activeTarget;
      }
      return candidate.node;
    };

    const hideOverlay = () => {
      overlay.style.opacity = "0";
      frame.style.opacity = "0";
      clearActiveTarget();
    };

    const update = () => {
      raf = 0;
      const blocks = Array.from(document.querySelectorAll<HTMLElement>(BLOCK_SELECTOR))
        .filter((node) => !node.closest(SAFETY_SELECTOR))
        .filter((node) => (node.textContent?.trim().length ?? 0) >= 20)
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.bottom > 72 && rect.top < window.innerHeight - 40;
        });
      if (!blocks.length) {
        hideOverlay();
        return;
      }

      const target = chooseTarget(blocks);
      if (activeTarget !== target) {
        document.querySelectorAll(`[${ACTIVE_ATTR}]`).forEach((node) => node.removeAttribute(ACTIVE_ATTR));
        target.setAttribute(ACTIVE_ATTR, "true");
        activeTarget = target;
      }

      const preferredY = focusTarget === target
        ? target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2
        : pointerTarget === target && performance.now() < pointerPreferredUntil
          ? pointerY
          : null;
      const rect = spotlightRect(target, preferredY);
      const contentRect = document.querySelector<HTMLElement>(".app-content")?.getBoundingClientRect() ?? { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
      const padX = 16;
      const padY = 10;
      const surfaceLeft = Math.max(0, contentRect.left);
      const surfaceRight = Math.min(window.innerWidth, contentRect.right);
      const surfaceTop = Math.max(0, contentRect.top);
      const surfaceBottom = Math.min(window.innerHeight, contentRect.bottom);
      const left = Math.max(surfaceLeft, rect.left - padX);
      const right = Math.min(surfaceRight, rect.right + padX);
      const top = Math.max(surfaceTop, rect.top - padY);
      const bottom = Math.min(surfaceBottom, rect.bottom + padY);
      const [topPane, bottomPane, leftPane, rightPane] = panes;
      Object.assign(topPane.style, { left: `${surfaceLeft}px`, top: `${surfaceTop}px`, width: `${Math.max(0, surfaceRight - surfaceLeft)}px`, height: `${Math.max(0, top - surfaceTop)}px` });
      Object.assign(bottomPane.style, { left: `${surfaceLeft}px`, top: `${bottom}px`, width: `${Math.max(0, surfaceRight - surfaceLeft)}px`, height: `${Math.max(0, surfaceBottom - bottom)}px` });
      Object.assign(leftPane.style, { left: `${surfaceLeft}px`, top: `${top}px`, width: `${Math.max(0, left - surfaceLeft)}px`, height: `${Math.max(0, bottom - top)}px` });
      Object.assign(rightPane.style, { left: `${right}px`, top: `${top}px`, width: `${Math.max(0, surfaceRight - right)}px`, height: `${Math.max(0, bottom - top)}px` });
      Object.assign(frame.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${Math.max(0, right - left)}px`,
        height: `${Math.max(0, bottom - top)}px`,
        opacity: "1",
      });
      overlay.style.opacity = "1";
    };

    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onPointerMove = (event: PointerEvent) => {
      const next = eligibleBlock(document.elementFromPoint(event.clientX, event.clientY));
      if (!next) return;
      pointerTarget = next;
      pointerY = event.clientY;
      pointerPreferredUntil = performance.now() + POINTER_PREFERENCE_MS;
      schedule();
    };
    const onFocusIn = (event: FocusEvent) => {
      const next = eligibleBlock(event.target as Element | null);
      focusTarget = next;
      if (next) schedule();
    };
    const onFocusOut = () => {
      focusTarget = null;
      schedule();
    };
    const isEditableTarget = (node: EventTarget | null) => {
      if (!(node instanceof HTMLElement)) return false;
      return node.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(node.tagName);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // Optional keyboard reading navigation without hijacking ordinary arrow-key scrolling.
      if (!event.altKey || (event.key !== "ArrowDown" && event.key !== "ArrowUp") || isEditableTarget(event.target)) return;
      const blocks = Array.from(document.querySelectorAll<HTMLElement>(BLOCK_SELECTOR))
        .filter((node) => !node.closest(SAFETY_SELECTOR))
        .filter((node) => (node.textContent?.trim().length ?? 0) >= 20);
      if (!blocks.length) return;
      const current = activeTarget && blocks.includes(activeTarget) ? activeTarget : blocks[0];
      const index = Math.max(0, blocks.indexOf(current));
      const nextIndex = event.key === "ArrowDown" ? Math.min(blocks.length - 1, index + 1) : Math.max(0, index - 1);
      const next = blocks[nextIndex];
      if (!next || next === current) return;
      event.preventDefault();
      keyboardTarget = next;
      keyboardPreferredUntil = performance.now() + KEYBOARD_PREFERENCE_MS;
      next.scrollIntoView({ block: "center", behavior: document.documentElement.classList.contains("reduce-motion") ? "auto" : "smooth" });
      schedule();
    };

    const content = document.querySelector(".app-content");
    const observer = content ? new MutationObserver(schedule) : null;
    observer?.observe(content!, { childList: true, subtree: true, characterData: true });

    update();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("keydown", onKeyDown);
      clear();
    };
  }, [settings.enabled, settings.photophobiaMode, settings.readingSpotlight]);

  useEffect(() => {
    const onShieldReady = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as { source?: string; type?: string } | null;
      if (data?.source === "somatosync-shield-extension" && data.type === "SOMATOSYNC_SHIELD_READY") {
        broadcastShieldProfile(settings);
      }
    };
    window.addEventListener("message", onShieldReady);
    return () => window.removeEventListener("message", onShieldReady);
  }, [settings]);

  const setSettings = useCallback((next: NeuroAdaptiveSettings) => {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    setState(stamped);
    applyToDocument(stamped);
    broadcastShieldProfile(stamped);
    if (mode !== "signed-out") saveAdaptiveSettings(stamped);
  }, [mode]);

  const applyProfile = useCallback((profile: AdaptiveProfile, enabled = true) => {
    setSettings({
      ...settings,
      ...profileSettings(profile),
      enabled,
      profile,
      updatedAt: new Date().toISOString(),
    });
  }, [setSettings, settings]);

  const applyAdaptiveIntervention = useCallback(() => {
    const symptomContext = getCurrentAdaptiveCheckIn() ?? monitorCheckInRef.current;
    monitorCheckInRef.current = symptomContext;
    const plan = planAdaptiveIntervention(latestEstimateRef.current, symptomContext);
    if (plan.changes.length === 0) return false;
    previousSettingsRef.current = settings;
    setAdaptationReasons(plan.reasons);
    setAdaptationChanges(plan.changes);
    setAdaptationRecommendBreak(plan.recommendBreak);
    setAdaptationSource("live");
    setAdaptationActive(true);
    setSettings({
      ...settings,
      enabled: true,
      profile: settings.profile === "audio-first" || plan.profile === "audio-first" ? "audio-first" : plan.profile,
      textScale: Math.max(settings.textScale, plan.textScale),
      lineSpacing: Math.max(settings.lineSpacing, plan.lineSpacing),
      reduceMotion: settings.reduceMotion || plan.reduceMotion,
      softContrast: settings.softContrast || plan.softContrast,
      textToSpeechPreferred: settings.textToSpeechPreferred || plan.textToSpeechPreferred,
      plainLanguage: settings.plainLanguage,
      reduceDensity: settings.reduceDensity || plan.reduceDensity,
      focusReadingLayout: settings.focusReadingLayout || plan.focusReadingLayout,
      calmMedia: settings.calmMedia || plan.calmMedia,
      stabilizeViewport: settings.stabilizeViewport || plan.stabilizeViewport,
      emphasizeStructure: settings.emphasizeStructure || plan.emphasizeStructure,
      photophobiaMode: settings.photophobiaMode || plan.photophobiaMode,
      readingSpotlight: settings.readingSpotlight || plan.readingSpotlight,
      pauseMedia: settings.pauseMedia || plan.pauseMedia,
      updatedAt: new Date().toISOString(),
    });

    if (responseTimerRef.current != null) window.clearTimeout(responseTimerRef.current);
    if (pendingResponseRef.current) {
      const pending = pendingResponseRef.current;
      finishAdaptiveResponse(pending.id, pending.beforeScore, latestEstimateRef.current?.score ?? null);
    }
    const responseEvent = beginAdaptiveResponse({
      checkIn: symptomContext,
      triggerReasons: plan.reasons,
      changes: plan.changes,
      beforeStrainScore: latestEstimateRef.current?.score ?? null,
      source: "site-wide",
    });
    pendingResponseRef.current = { id: responseEvent.id, beforeScore: responseEvent.beforeStrainScore };
    responseTimerRef.current = window.setTimeout(() => {
      const pending = pendingResponseRef.current;
      if (!pending || pending.id !== responseEvent.id) return;
      finishAdaptiveResponse(pending.id, pending.beforeScore, latestEstimateRef.current?.score ?? null);
      pendingResponseRef.current = null;
      responseTimerRef.current = null;
    }, 12_000);

    return true;
  }, [setSettings, settings]);

  const revertLastAdaptation = useCallback(() => {
    const previous = previousSettingsRef.current;
    if (previous) setSettings({ ...previous, updatedAt: new Date().toISOString() });
    if (responseTimerRef.current != null) window.clearTimeout(responseTimerRef.current);
    responseTimerRef.current = null;
    if (pendingResponseRef.current) {
      finishAdaptiveResponse(pendingResponseRef.current.id, pendingResponseRef.current.beforeScore, latestEstimateRef.current?.score ?? null, "reverted");
      pendingResponseRef.current = null;
    }

    // Undo only restores the most recent interface change. It does NOT stop Focus monitoring.
    // Clear the old trigger window so the exact same buffered samples cannot instantly reapply
    // the change, then re-arm after a short grace period. A new sustained multi-signal pattern
    // can therefore adapt the UI again without waiting for the normal 90-second prompt cooldown.
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    activeSamplesRef.current = [];
    elevatedHistoryRef.current = [];
    latestEstimateRef.current = null;
    graceUntilRef.current = now + UNDO_REARM_GRACE_MS;
    lastPromptAtRef.current = now - PROMPT_COOLDOWN_MS;
    setEstimate(null);
    setPromptVisible(false);
    setLatestFeedback(null);

    previousSettingsRef.current = null;
    setAdaptationActive(false);
    setAdaptationReasons([]);
    setAdaptationChanges([]);
    setAdaptationRecommendBreak(false);
    setAdaptationSource(null);
  }, [setPromptVisible, setSettings]);

  const disable = useCallback(() => {
    setSettings({ ...settings, enabled: false, updatedAt: new Date().toISOString() });
  }, [setSettings, settings]);

  const stopMonitoring = useCallback(() => {
    if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    if (resumeTimerRef.current != null) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = null;
    pausedFromRef.current = null;
    animationRef.current = null;
    if (responseTimerRef.current != null) window.clearTimeout(responseTimerRef.current);
    responseTimerRef.current = null;
    if (pendingResponseRef.current) {
      finishAdaptiveResponse(pendingResponseRef.current.id, pendingResponseRef.current.beforeScore, latestEstimateRef.current?.score ?? null);
      pendingResponseRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (hiddenVideoRef.current) hiddenVideoRef.current.srcObject = null;
    setStatus("off");
    setPromptVisible(false);
    setCalibrationProgress(0);
    setTrackingQualityPercent(0);
    trackingQualityRef.current = 0;
    setEstimate(null);
    latestEstimateRef.current = null;
    setBreakSeconds(BREAK_SECONDS);
    elevatedHistoryRef.current = [];
  }, [setPromptVisible, setStatus]);

  const turnOffFocus = useCallback(() => {
    stopReadingAloud();
    restorePlainLanguage();
    stopMonitoring();
    previousSettingsRef.current = null;
    setAdaptationActive(false);
    setAdaptationReasons([]);
    setAdaptationChanges([]);
    setAdaptationRecommendBreak(false);
    setAdaptationSource(null);
    setSettings({
      ...DEFAULT_ADAPTIVE_SETTINGS,
      autoAdapt: settings.autoAdapt,
      updatedAt: new Date().toISOString(),
    });
  }, [setSettings, settings.autoAdapt, stopMonitoring]);

  useEffect(() => {
    if (mode === "signed-out") stopMonitoring();
  }, [mode, stopMonitoring]);

  useEffect(() => stopMonitoring, [stopMonitoring]);

  const processMonitorFrame = useCallback((now: number) => {
    animationRef.current = null;
    const activeStatus = statusRef.current;
    if (activeStatus !== "calibrating" && activeStatus !== "active") return;

    if (!document.hidden && now - lastSampleRef.current >= SAMPLE_INTERVAL_MS) {
      lastSampleRef.current = now;
      const video = hiddenVideoRef.current;
      const landmarker = landmarkerRef.current;
      let detected = false;
      if (video && landmarker && video.readyState >= 2) {
        try {
          const result = detectFaceSignal(landmarker, video, now, now);
          if (result) {
            detected = true;
            inferenceFailuresRef.current = 0;
            if (activeStatus === "calibrating") calibrationSamplesRef.current.push(result.sample);
            else activeSamplesRef.current.push(result.sample);
          }
        } catch {
          inferenceFailuresRef.current += 1;
        }
      }

      qualityEventsRef.current.push({ time: now, detected });
      qualityEventsRef.current = qualityEventsRef.current.filter((event) => now - event.time <= QUALITY_WINDOW_MS);
      const quality = qualityEventsRef.current.length
        ? Math.round((qualityEventsRef.current.filter((event) => event.detected).length / qualityEventsRef.current.length) * 100)
        : 0;
      trackingQualityRef.current = quality;
      setTrackingQualityPercent(quality);
    }

    if (activeStatus === "calibrating") {
      const elapsed = now - calibrationStartedRef.current;
      setCalibrationProgress(Math.min(100, Math.round((elapsed / CALIBRATION_MS) * 100)));
      if (elapsed >= CALIBRATION_MS) {
        const quality = trackingQualityRef.current;
        if (calibrationSamplesRef.current.length < 24 || quality < 65) {
          setError("The session reference was not stable enough. Improve lighting, keep your face centered, and try again.");
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setStatus("error");
          return;
        }
        referenceRef.current = summarizeSignalWindow(calibrationSamplesRef.current, CALIBRATION_MS, 0, 0);
        activeSamplesRef.current = [];
        qualityEventsRef.current = [];
        elevatedHistoryRef.current = [];
        graceUntilRef.current = performance.now() + ACTIVE_START_GRACE_MS;
        setCalibrationProgress(100);
        setStatus("active");
      }
    } else {
      activeSamplesRef.current = activeSamplesRef.current.filter((sample) => now - sample.timeMs <= INTERACTION_WINDOW_MS + 5_000);
    }

    if (inferenceFailuresRef.current >= 8) {
      setError("Face-landmark inference paused after repeated browser errors. Focus Mode has been stopped safely.");
      stopMonitoring();
      setStatus("error");
      return;
    }
    animationRef.current = requestAnimationFrame(processMonitorFrame);
  }, [setStatus, stopMonitoring]);

  const startMonitoring = useCallback(async (checkIn?: AdaptiveCheckIn, baseSettings?: NeuroAdaptiveSettings) => {
    stopMonitoring();
    setError("");
    setLatestFeedback(null);
    setStatus("starting");
    const symptomContext = checkIn ?? getCurrentAdaptiveCheckIn() ?? DEFAULT_CHECK_IN;
    monitorCheckInRef.current = symptomContext;

    // Seed Focus from the unified, user-confirmed symptom record before camera inference starts.
    // Live MediaPipe/TensorFlow signals can then refine this baseline rather than replacing it.
    const seedPlan = planAdaptiveIntervention(null, symptomContext);
    const startingSettings = baseSettings ?? settings;
    if (seedPlan.changes.length > 0) {
      previousSettingsRef.current = startingSettings;
      setAdaptationReasons(seedPlan.reasons);
      setAdaptationChanges(seedPlan.changes);
      setAdaptationRecommendBreak(seedPlan.recommendBreak);
      setAdaptationSource("symptoms");
      setAdaptationActive(true);
      setSettings({
        ...startingSettings,
        enabled: true,
        profile: seedPlan.profile,
        // Recompute symptom-driven presentation at the start of each session. This prevents
        // a stale high-intensity mode from a prior session from leaking into a new symptom state.
        textScale: seedPlan.textScale,
        lineSpacing: seedPlan.lineSpacing,
        reduceMotion: seedPlan.reduceMotion,
        softContrast: seedPlan.softContrast,
        textToSpeechPreferred: seedPlan.textToSpeechPreferred,
        plainLanguage: startingSettings.plainLanguage,
        reduceDensity: seedPlan.reduceDensity,
        focusReadingLayout: seedPlan.focusReadingLayout,
        calmMedia: seedPlan.calmMedia,
        stabilizeViewport: seedPlan.stabilizeViewport,
        emphasizeStructure: seedPlan.emphasizeStructure,
        photophobiaMode: seedPlan.photophobiaMode,
        readingSpotlight: seedPlan.readingSpotlight,
        pauseMedia: seedPlan.pauseMedia,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Focus remains useful without a camera. Manual accessibility tools and the standard
      // Focus layer can run even when no symptom-specific seed is currently suggested.
      setSettings({ ...startingSettings, enabled: true, updatedAt: new Date().toISOString() });
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser does not provide camera access.");
      const [landmarker, stream] = await Promise.all([
        loadFaceLandmarker(),
        navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } }),
      ]);
      const video = hiddenVideoRef.current;
      if (!video) throw new Error("The local camera surface was unavailable.");
      landmarkerRef.current = landmarker;
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();

      calibrationSamplesRef.current = [];
      activeSamplesRef.current = [];
      qualityEventsRef.current = [];
      reversalTimesRef.current = [];
      lastInteractionRef.current = Date.now();
      calibrationStartedRef.current = performance.now();
      monitorStartedRef.current = performance.now();
      lastSampleRef.current = 0;
      lastPromptAtRef.current = -PROMPT_COOLDOWN_MS;
      promptCountRef.current = 0;
      inferenceFailuresRef.current = 0;
      lastPathRef.current = window.location.pathname + window.location.search;
      setCalibrationProgress(0);
      setTrackingQualityPercent(0);
      setStatus("calibrating");
      animationRef.current = requestAnimationFrame(processMonitorFrame);
    } catch (caught) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      // Camera sensing is optional. Keep the symptom/manual Focus layer active rather than
      // failing the entire accessibility experience when permission is denied or unavailable.
      const reason = caught instanceof Error ? caught.message : "Camera monitoring is unavailable.";
      setError(`${reason} Symptom-based and manual Focus supports remain available.`);
      setStatus("active");
    }
  }, [processMonitorFrame, setSettings, setStatus, settings, stopMonitoring]);

  useEffect(() => {
    if (status === "active" && animationRef.current == null && landmarkerRef.current && streamRef.current) {
      animationRef.current = requestAnimationFrame(processMonitorFrame);
    }
  }, [processMonitorFrame, status]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const current = statusRef.current;
      if (document.hidden) {
        if (resumeTimerRef.current != null) window.clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
        if (current === "paused") return;
        if (current !== "active" && current !== "calibrating") return;
        pausedFromRef.current = current;
        if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = false; });
        elevatedHistoryRef.current = [];
        activeSamplesRef.current = [];
        qualityEventsRef.current = [];
        reversalTimesRef.current = [];
        setPromptVisible(false);
        setStatus("paused");
        return;
      }

      if (current !== "paused" || !pausedFromRef.current) return;
      streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = true; });
      const pausedFrom = pausedFromRef.current;
      if (pausedFrom === "calibrating") {
        calibrationSamplesRef.current = [];
        qualityEventsRef.current = [];
        trackingQualityRef.current = 0;
        setTrackingQualityPercent(0);
        setCalibrationProgress(0);
        calibrationStartedRef.current = performance.now();
        pausedFromRef.current = null;
        setStatus("calibrating");
        animationRef.current = requestAnimationFrame(processMonitorFrame);
        return;
      }

      // Keep monitoring paused briefly after returning so a tab switch cannot create
      // an immediate false strain event. The overlay explains this settling period.
      graceUntilRef.current = performance.now() + TAB_RESUME_GRACE_MS;
      lastInteractionRef.current = Date.now();
      resumeTimerRef.current = window.setTimeout(() => {
        resumeTimerRef.current = null;
        if (document.hidden || statusRef.current !== "paused") return;
        pausedFromRef.current = null;
        setStatus("active");
      }, TAB_RESUME_GRACE_MS);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [processMonitorFrame, setPromptVisible, setStatus]);

  useEffect(() => {
    if (status !== "active") return;
    const scrollState = new WeakMap<object, { top: number; direction: number }>();
    const interaction = () => { lastInteractionRef.current = Date.now(); };
    const onScroll = (event: Event) => {
      interaction();
      const objectTarget = event.target && typeof event.target === "object" ? event.target as object : document;
      const element = event.target instanceof Element ? event.target : document.documentElement;
      const top = element instanceof HTMLElement ? element.scrollTop : window.scrollY;
      const previous = scrollState.get(objectTarget) ?? { top, direction: 0 };
      const difference = top - previous.top;
      const direction = difference === 0 ? previous.direction : Math.sign(difference);
      if (previous.direction !== 0 && direction !== previous.direction && Math.abs(difference) > 3) {
        reversalTimesRef.current.push(performance.now());
      }
      scrollState.set(objectTarget, { top, direction });
    };
    document.addEventListener("scroll", onScroll, true);
    document.addEventListener("pointerdown", interaction, true);
    document.addEventListener("keydown", interaction, true);
    document.addEventListener("focusin", interaction, true);
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("pointerdown", interaction, true);
      document.removeEventListener("keydown", interaction, true);
      document.removeEventListener("focusin", interaction, true);
    };
  }, [status]);

  useEffect(() => {
    if (status !== "active") return;
    const timer = window.setInterval(() => {
      const now = performance.now();
      const route = window.location.pathname + window.location.search;
      if (route !== lastPathRef.current) {
        lastPathRef.current = route;
        graceUntilRef.current = now + ROUTE_GRACE_MS;
        elevatedHistoryRef.current = [];
        activeSamplesRef.current = [];
        reversalTimesRef.current = [];
        return;
      }
      if (document.hidden || trackingQualityRef.current < 65 || activeSamplesRef.current.length < 10) {
        elevatedHistoryRef.current = [];
        return;
      }

      const recentVisualSamples = activeSamplesRef.current.filter((sample) => now - sample.timeMs <= VISUAL_WINDOW_MS);
      const recentInteractionSamples = activeSamplesRef.current.filter((sample) => now - sample.timeMs <= INTERACTION_WINDOW_MS);
      if (recentVisualSamples.length < 10) {
        elevatedHistoryRef.current = [];
        return;
      }
      reversalTimesRef.current = reversalTimesRef.current.filter((time) => now - time <= INTERACTION_WINDOW_MS);
      const idleBeyondGrace = Math.max(0, Date.now() - lastInteractionRef.current - 35_000);
      const visualWindow = summarizeSignalWindow(recentVisualSamples, VISUAL_WINDOW_MS, 0, 0);
      const interactionWindow = summarizeSignalWindow(
        recentInteractionSamples,
        INTERACTION_WINDOW_MS,
        reversalTimesRef.current.length,
        Math.min(INTERACTION_WINDOW_MS, idleBeyondGrace),
      );
      const current: SignalWindow = {
        ...visualWindow,
        scrollReversalsPerMinute: interactionWindow.scrollReversalsPerMinute,
        idleRatio: interactionWindow.idleRatio,
      };
      const latestSymptoms = getCurrentAdaptiveCheckIn();
      if (latestSymptoms) monitorCheckInRef.current = latestSymptoms;
      let next = estimateStrain(referenceRef.current, current, personalizationRef.current, monitorCheckInRef.current);
      latestEstimateRef.current = next;
      setEstimate(next);

      if (next.featureVector && now - lastTfAtRef.current >= 5_000 && !tfBusyRef.current) {
        tfBusyRef.current = true;
        lastTfAtRef.current = now;
        void predictConfirmedStrain(sessionsRef.current, next.featureVector).then((prediction) => {
          setLabeledExampleCount(prediction.exampleCount);
          setTensorflowReady(prediction.trained);
          if (prediction.probability != null && latestEstimateRef.current) {
            const blended = blendTensorFlowProbability(latestEstimateRef.current, personalizationRef.current, prediction.probability);
            latestEstimateRef.current = blended;
            setEstimate(blended);
          }
        }).finally(() => { tfBusyRef.current = false; });
      }

      const familyCount = signalFamilies(next);
      const qualifies = next.band === "elevated" && next.enoughSignals && familyCount >= 2;
      elevatedHistoryRef.current.push(qualifies);
      elevatedHistoryRef.current = elevatedHistoryRef.current.slice(-3);
      const sustained = elevatedHistoryRef.current.filter(Boolean).length >= 2;
      const outsideGrace = now >= graceUntilRef.current;
      const outsideCooldown = now - lastPromptAtRef.current >= PROMPT_COOLDOWN_MS;

      if (sustained && outsideGrace && outsideCooldown && !promptVisibleRef.current) {
        lastPromptAtRef.current = now;
        promptCountRef.current += 1;
        setLatestFeedback(null);
        if (settings.autoAdapt) {
          setPromptVisible(false);
          applyAdaptiveIntervention();
        } else {
          setPromptVisible(true);
        }
      }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [applyAdaptiveIntervention, setPromptVisible, settings.autoAdapt, status]);

  useEffect(() => {
    if (status !== "break") return;
    const timer = window.setInterval(() => {
      setBreakSeconds((current) => {
        if (current <= 1) {
          setStatus("active");
          return BREAK_SECONDS;
        }
        return current - 1;
      });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [setStatus, status]);

  const applyPromptAdaptation = useCallback(() => {
    applyAdaptiveIntervention();
    setPromptVisible(false);
  }, [applyAdaptiveIntervention, setPromptVisible]);

  const beginPromptBreak = useCallback(() => {
    setPromptVisible(false);
    setBreakSeconds(BREAK_SECONDS);
    setStatus("break");
  }, [setPromptVisible, setStatus]);

  const continueWithoutChange = useCallback(() => setPromptVisible(false), [setPromptVisible]);
  const resumeFromBreak = useCallback(() => {
    setBreakSeconds(BREAK_SECONDS);
    setStatus("active");
    graceUntilRef.current = performance.now() + ROUTE_GRACE_MS;
  }, [setStatus]);

  const submitPromptFeedback = useCallback((confirmed: boolean) => {
    const current = latestEstimateRef.current;
    if (!current?.featureVector) return;
    setLatestFeedback(confirmed);
    const updatedModel = updateModelFromConfirmation(personalizationRef.current, current, confirmed);
    personalizationRef.current = updatedModel;
    savePersonalizationModel(updatedModel);

    const session: NeuroAdaptiveSessionSummary = {
      id: crypto.randomUUID?.() ?? `${Date.now()}`,
      completedAt: new Date().toISOString(),
      durationSeconds: Math.max(1, Math.round((performance.now() - monitorStartedRef.current) / 1000)),
      cameraUsed: true,
      trackingQualityPercent: trackingQualityRef.current,
      maxStrainScore: current.score,
      promptCount: promptCountRef.current,
      adaptationsApplied: settings.enabled ? [settings.profile] : [],
      userConfirmedPrompt: confirmed,
      checkIn: monitorCheckInRef.current,
      featureVector: current.featureVector,
      mlProbability: current.mlProbability ?? null,
      source: "site-wide",
    };
    saveAdaptiveSession(session);
    sessionsRef.current = [session, ...sessionsRef.current].slice(0, 30);
    const training = getTensorFlowTrainingStatus(sessionsRef.current);
    setLabeledExampleCount(training.exampleCount);
    setTensorflowReady(training.canTrain);
  }, [settings.enabled, settings.profile]);

  const value = useMemo<ContextValue>(() => ({
    settings,
    setSettings,
    applyProfile,
    disable,
    status,
    calibrationProgress,
    trackingQualityPercent,
    estimate,
    promptVisible,
    breakSeconds,
    error,
    labeledExampleCount,
    tensorflowReady,
    startMonitoring,
    stopMonitoring,
    turnOffFocus,
    applyPromptAdaptation,
    beginPromptBreak,
    continueWithoutChange,
    resumeFromBreak,
    submitPromptFeedback,
    latestFeedback,
    adaptationActive,
    adaptationReasons,
    adaptationChanges,
    adaptationRecommendBreak,
    adaptationSource,
    revertLastAdaptation,
  }), [
    settings, setSettings, applyProfile, disable, status, calibrationProgress, trackingQualityPercent,
    estimate, promptVisible, breakSeconds, error, labeledExampleCount, tensorflowReady, startMonitoring,
    stopMonitoring, turnOffFocus, applyPromptAdaptation, beginPromptBreak, continueWithoutChange, resumeFromBreak,
    submitPromptFeedback, latestFeedback, adaptationActive, adaptationReasons, adaptationChanges, adaptationRecommendBreak, adaptationSource, revertLastAdaptation,
  ]);

  return (
    <Context.Provider value={value}>
      {children}
      <video ref={hiddenVideoRef} muted playsInline aria-hidden="true" className="fixed h-px w-px -translate-x-[9999px] opacity-0" />
    </Context.Provider>
  );
}

export function useNeuroAdaptive() {
  const value = useContext(Context);
  if (!value) throw new Error("useNeuroAdaptive must be used inside NeuroAdaptiveProvider");
  return value;
}
