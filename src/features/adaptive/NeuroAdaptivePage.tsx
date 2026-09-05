import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import {
  BrainCircuit, Camera, CheckCircle2, Pause, Play, RefreshCw,
  Sparkles, Volume2, XCircle,
} from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Disclaimer } from "../../components/shared/Disclaimer";
import { useToast } from "../../components/shared/Toast";
import { useNeuroAdaptive } from "./NeuroAdaptiveContext";
import { SomatoSyncShieldPanel } from "./SomatoSyncShieldPanel";
import { detectFaceSignal, drawFaceOverlay, loadFaceLandmarker, type FaceLandmarkerLike } from "./faceLandmarker";
import {
  estimateStrain, planAdaptiveIntervention, summarizeSignalWindow, updateModelFromConfirmation,
} from "./neuroAdaptiveEngine";
import {
  loadAdaptiveSessions, loadPersonalizationModel, saveAdaptiveSession, savePersonalizationModel,
} from "./neuroAdaptiveStorage";
import type {
  AdaptiveCheckIn, FaceSignalSample, SignalWindow, StrainEstimate,
} from "./neuroAdaptiveTypes";

const CALIBRATION_SECONDS = 12;
const VISUAL_WINDOW_MS = 5_000;
const INTERACTION_WINDOW_MS = 20_000;
const SAMPLE_INTERVAL_MS = 200;
const BREAK_SECONDS = 120;

const READING_TEXT = [
  "Concussion recovery is usually supported by a gradual return to everyday activities rather than prolonged complete rest. The amount of schoolwork, reading, screen use, movement, and social activity that a person tolerates can change from day to day.",
  "Pacing means alternating demanding and easier activities, scheduling breaks before symptoms become overwhelming, and noticing which tasks tend to increase headache, fatigue, dizziness, or difficulty concentrating. A mild and brief symptom increase can occur during recovery, but a larger or prolonged increase is a reason to reduce the task and discuss the response with a care team.",
  "Visual symptoms can include light sensitivity, blurred vision, difficulty reading, headache, and fatigue in busy environments. Helpful accommodations may include shorter reading blocks, larger text, reduced animation, additional spacing, audio versions of material, and a quiet place for breaks.",
  "No camera signal can prove neurological fatigue. SomatoSync therefore combines optional face-landmark patterns with the user’s own symptom check-in and reading behavior. The system explains each signal and lets the user confirm whether a prompt matched how they actually felt.",
];

type Phase = "intro" | "checkin" | "loading" | "calibrating" | "reading" | "break" | "result" | "error";

const zeroWindow: SignalWindow = {
  blinkRateBpm: 0, browTension: 0, faceScale: 0, headMotion: 0,
  gazeDeviation: 0, scrollReversalsPerMinute: 0, idleRatio: 0,
};

export function NeuroAdaptivePage() {
  const { show } = useToast();
  const { settings, applyProfile, setSettings, status: siteWideStatus, startMonitoring, stopMonitoring } = useNeuroAdaptive();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const readingRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarkerLike | null>(null);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("intro");
  const samplesRef = useRef<FaceSignalSample[]>([]);
  const calibrationRef = useRef<FaceSignalSample[]>([]);
  const detectedFramesRef = useRef(0);
  const expectedFramesRef = useRef(0);
  const startRef = useRef(0);
  const lastSampleRef = useRef(0);
  const lastInteractionRef = useRef(Date.now());
  const idleMsRef = useRef(0);
  const scrollDirectionRef = useRef(0);
  const lastScrollTopRef = useRef(0);
  const scrollReversalsRef = useRef(0);
  const promptCountRef = useRef(0);
  const lastPromptAtRef = useRef(-60_000);
  const adaptationsRef = useRef<string[]>([]);
  const latestEstimateRef = useRef<StrainEstimate | null>(null);
  const elevatedHistoryRef = useRef<boolean[]>([]);
  const tabPausedRef = useRef(false);
  const pausedPhaseRef = useRef<"calibrating" | "reading" | null>(null);
  const pauseStartedRef = useRef(0);
  const resumeIntervalRef = useRef<number | null>(null);
  const lastPreAdaptSettingsRef = useRef<typeof settings | null>(null);

  const [phase, setPhaseState] = useState<Phase>("intro");
  const [checkIn, setCheckIn] = useState<AdaptiveCheckIn>({ lightSensitivity: 1, visualMotionDiscomfort: 1, mentalFatigue: 1 });
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [autoAdapt, setAutoAdapt] = useState(false);
  const [seconds, setSeconds] = useState(CALIBRATION_SECONDS);
  const [breakSeconds, setBreakSeconds] = useState(BREAK_SECONDS);
  const [reference, setReference] = useState<SignalWindow>(zeroWindow);
  const [estimate, setEstimate] = useState<StrainEstimate | null>(null);
  const [promptVisible, setPromptVisible] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [trackingQuality, setTrackingQuality] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [speechActive, setSpeechActive] = useState(false);
  const [tabPaused, setTabPaused] = useState(false);
  const [resumeGraceSeconds, setResumeGraceSeconds] = useState(0);
  const [autoAdaptNotice, setAutoAdaptNotice] = useState(false);
  const [model] = useState(loadPersonalizationModel);
  const [priorSessions] = useState(loadAdaptiveSessions);

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const startingPlan = useMemo(() => planAdaptiveIntervention(null, checkIn), [checkIn]);

  const stopCamera = useCallback(() => {
    if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    if (resumeIntervalRef.current != null) window.clearInterval(resumeIntervalRef.current);
    resumeIntervalRef.current = null;
    tabPausedRef.current = false;
    pausedPhaseRef.current = null;
    setTabPaused(false);
    setResumeGraceSeconds(0);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    window.speechSynthesis?.cancel();
    setSpeechActive(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    const onVisibilityChange = () => {
      const currentPhase = phaseRef.current;
      if (document.hidden) {
        if (resumeIntervalRef.current != null) window.clearInterval(resumeIntervalRef.current);
        resumeIntervalRef.current = null;
        if (tabPausedRef.current) return;
        if (currentPhase !== "calibrating" && currentPhase !== "reading") return;
        pausedPhaseRef.current = currentPhase;
        pauseStartedRef.current = performance.now();
        tabPausedRef.current = true;
        setTabPaused(true);
        setResumeGraceSeconds(0);
        if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = false; });
        elevatedHistoryRef.current = [];
        samplesRef.current = [];
        setPromptVisible(false);
        return;
      }

      if (!tabPausedRef.current || !pausedPhaseRef.current) return;
      streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = true; });
      const pausedPhase = pausedPhaseRef.current;
      const now = performance.now();

      if (pausedPhase === "calibrating") {
        calibrationRef.current = [];
        detectedFramesRef.current = 0;
        expectedFramesRef.current = 0;
        startRef.current = now;
        lastSampleRef.current = 0;
        setSeconds(CALIBRATION_SECONDS);
        tabPausedRef.current = false;
        pausedPhaseRef.current = null;
        setTabPaused(false);
        setResumeGraceSeconds(0);
        show({ title: "Calibration restarted", description: "Focus paused while the tab was inactive, so the comfortable reading reference is being measured again.", tone: "success" });
        if (cameraEnabled && landmarkerRef.current) animationRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // Exclude time spent in another tab from the guided reading duration and
      // wait three seconds before resuming monitoring to avoid a return-to-tab spike.
      lastInteractionRef.current = Date.now();
      elevatedHistoryRef.current = [];
      samplesRef.current = [];
      setResumeGraceSeconds(3);
      let remaining = 3;
      resumeIntervalRef.current = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (resumeIntervalRef.current != null) window.clearInterval(resumeIntervalRef.current);
          resumeIntervalRef.current = null;
          startRef.current += Math.max(0, performance.now() - pauseStartedRef.current);
          tabPausedRef.current = false;
          pausedPhaseRef.current = null;
          setResumeGraceSeconds(0);
          setTabPaused(false);
          if (!document.hidden && phaseRef.current === "reading" && cameraEnabled && landmarkerRef.current) {
            animationRef.current = requestAnimationFrame(processFrame);
          }
          return;
        }
        setResumeGraceSeconds(remaining);
      }, 1_000);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [cameraEnabled, show]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || !["loading", "calibrating", "reading"].includes(phase)) return;
    if (video.srcObject !== stream) video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [phase]);

  function updateCheckIn(key: keyof AdaptiveCheckIn, value: number) {
    setCheckIn((current) => ({ ...current, [key]: value }));
  }

  function applyRecommendedProfile() {
    setSettings({
      ...settings,
      enabled: startingPlan.changes.length > 0,
      profile: startingPlan.profile,
      textScale: startingPlan.textScale,
      lineSpacing: startingPlan.lineSpacing,
      reduceMotion: startingPlan.reduceMotion,
      softContrast: startingPlan.softContrast,
      textToSpeechPreferred: startingPlan.textToSpeechPreferred,
      reduceDensity: startingPlan.reduceDensity,
      focusReadingLayout: startingPlan.focusReadingLayout,
      calmMedia: startingPlan.calmMedia,
      stabilizeViewport: startingPlan.stabilizeViewport,
      emphasizeStructure: startingPlan.emphasizeStructure,
      updatedAt: new Date().toISOString(),
    });
    adaptationsRef.current.push(...startingPlan.changes);
    show({ title: startingPlan.changes.length ? "Reading environment matched" : "Standard reading view", description: startingPlan.changes.length ? "Only supports matched to your current symptoms were applied." : "No starting display changes were needed.", tone: "success" });
  }

  async function beginSession() {
    if (siteWideStatus !== "off" && siteWideStatus !== "error") stopMonitoring();
    applyRecommendedProfile();
    if (!cameraEnabled) {
      startReading(zeroWindow);
      return;
    }
    setPhase("loading");
    setError("");
    try {
      const [landmarker, stream] = await Promise.all([
        loadFaceLandmarker(),
        navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 540 } } }),
      ]);
      landmarkerRef.current = landmarker;
      streamRef.current = stream;
      if (!videoRef.current) throw new Error("Camera preview was unavailable.");
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      calibrationRef.current = [];
      samplesRef.current = [];
      detectedFramesRef.current = 0;
      expectedFramesRef.current = 0;
      startRef.current = performance.now();
      lastSampleRef.current = 0;
      setSeconds(CALIBRATION_SECONDS);
      setPhase("calibrating");
      animationRef.current = requestAnimationFrame(processFrame);
    } catch (caught) {
      stopCamera();
      setError(caught instanceof Error ? caught.message : "The camera or face model could not start.");
      setPhase("error");
    }
  }

  function processFrame(now: number) {
    const activePhase = phaseRef.current;
    if (document.hidden || tabPausedRef.current) return;
    if (activePhase !== "calibrating" && activePhase !== "reading") return;
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (video && landmarker && video.readyState >= 2 && now - lastSampleRef.current >= SAMPLE_INTERVAL_MS) {
      lastSampleRef.current = now;
      expectedFramesRef.current += 1;
      const detected = detectFaceSignal(landmarker, video, now, now - startRef.current);
      if (detected) {
        detectedFramesRef.current += 1;
        setCameraVisible(true);
        if (overlayRef.current) drawFaceOverlay(overlayRef.current, detected.landmarks);
        if (activePhase === "calibrating") calibrationRef.current.push(detected.sample);
        else samplesRef.current.push(detected.sample);
      } else {
        setCameraVisible(false);
        overlayRef.current?.getContext("2d")?.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      }
      setTrackingQuality(Math.round((detectedFramesRef.current / Math.max(1, expectedFramesRef.current)) * 100));
    }

    if (activePhase === "calibrating") {
      const elapsed = now - startRef.current;
      setSeconds(Math.max(0, Math.ceil(CALIBRATION_SECONDS - elapsed / 1000)));
      if (elapsed >= CALIBRATION_SECONDS * 1000) {
        const ref = summarizeSignalWindow(calibrationRef.current, elapsed, 0, 0);
        setReference(ref);
        startReading(ref);
        return;
      }
    }
    animationRef.current = requestAnimationFrame(processFrame);
  }

  function startReading(ref: SignalWindow) {
    startRef.current = performance.now();
    samplesRef.current = [];
    scrollReversalsRef.current = 0;
    elevatedHistoryRef.current = [];
    idleMsRef.current = 0;
    lastInteractionRef.current = Date.now();
    detectedFramesRef.current = 0;
    expectedFramesRef.current = 0;
    setReference(ref);
    setElapsedSeconds(0);
    setPhase("reading");
    if (cameraEnabled && landmarkerRef.current) animationRef.current = requestAnimationFrame(processFrame);
  }

  useEffect(() => {
    if (phase !== "reading" || tabPaused) return;
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - startRef.current;
      setElapsedSeconds(Math.floor(elapsed / 1000));
      const recentVisual = samplesRef.current.filter((sample) => elapsed - sample.timeMs <= VISUAL_WINDOW_MS);
      const recentInteraction = samplesRef.current.filter((sample) => elapsed - sample.timeMs <= INTERACTION_WINDOW_MS);
      if (Date.now() - lastInteractionRef.current > 35_000) idleMsRef.current += 1000;
      if (cameraEnabled && recentVisual.length < 10) return;
      const visualWindow = summarizeSignalWindow(
        recentVisual,
        Math.min(VISUAL_WINDOW_MS, Math.max(elapsed, 1000)),
        0,
        0,
      );
      const interactionWindow = summarizeSignalWindow(
        recentInteraction,
        Math.min(INTERACTION_WINDOW_MS, Math.max(elapsed, 1000)),
        scrollReversalsRef.current,
        idleMsRef.current,
      );
      const combinedWindow: SignalWindow = {
        ...visualWindow,
        scrollReversalsPerMinute: interactionWindow.scrollReversalsPerMinute,
        idleRatio: interactionWindow.idleRatio,
      };
      const nextEstimate = estimateStrain(reference, combinedWindow, model, checkIn);
      latestEstimateRef.current = nextEstimate;
      setEstimate(nextEstimate);
      const qualifies = nextEstimate.band === "elevated" && nextEstimate.enoughSignals;
      elevatedHistoryRef.current.push(qualifies);
      elevatedHistoryRef.current = elevatedHistoryRef.current.slice(-3);
      const sustained = elevatedHistoryRef.current.filter(Boolean).length >= 2;
      if (sustained && !promptVisible && elapsed > 3_000 && elapsed - lastPromptAtRef.current > 30_000) {
        lastPromptAtRef.current = elapsed;
        promptCountRef.current += 1;
        if (autoAdapt) {
          setPromptVisible(false);
          applyAdaptiveChanges(true);
        } else {
          setPromptVisible(true);
        }
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [autoAdapt, checkIn, model, phase, promptVisible, reference, tabPaused]);

  function onReadingScroll() {
    const element = readingRef.current;
    if (!element) return;
    const difference = element.scrollTop - lastScrollTopRef.current;
    const direction = difference === 0 ? scrollDirectionRef.current : Math.sign(difference);
    if (scrollDirectionRef.current !== 0 && direction !== scrollDirectionRef.current) scrollReversalsRef.current += 1;
    scrollDirectionRef.current = direction;
    lastScrollTopRef.current = element.scrollTop;
    lastInteractionRef.current = Date.now();
  }

  function applyAdaptiveChanges(autoApplied = false) {
    const plan = planAdaptiveIntervention(latestEstimateRef.current, checkIn);
    if (plan.changes.length === 0) {
      show({ title: "No display change suggested", description: "A short break may be more useful for this pattern.", tone: "success" });
      setPromptVisible(false);
      return;
    }
    lastPreAdaptSettingsRef.current = settings;
    setSettings({
      ...settings,
      enabled: true,
      profile: plan.profile,
      textScale: plan.textScale,
      lineSpacing: plan.lineSpacing,
      reduceMotion: plan.reduceMotion,
      softContrast: plan.softContrast,
      textToSpeechPreferred: plan.textToSpeechPreferred,
      reduceDensity: plan.reduceDensity,
      focusReadingLayout: plan.focusReadingLayout,
      calmMedia: plan.calmMedia,
      stabilizeViewport: plan.stabilizeViewport,
      emphasizeStructure: plan.emphasizeStructure,
      updatedAt: new Date().toISOString(),
    });
    adaptationsRef.current.push(...plan.changes);
    setPromptVisible(false);
    setAutoAdaptNotice(autoApplied);
    if (autoApplied) show({ title: "Reading environment adjusted", description: "Auto-adapt applied the matched reading support. You can undo it immediately.", tone: "success" });
  }

  function undoGuidedAutoAdapt() {
    const previous = lastPreAdaptSettingsRef.current;
    if (previous) setSettings({ ...previous, updatedAt: new Date().toISOString() });
    lastPreAdaptSettingsRef.current = null;
    setAutoAdaptNotice(false);
    show({ title: "Automatic changes undone", tone: "success" });
  }

  function startBreak() {
    setPromptVisible(false);
    setBreakSeconds(BREAK_SECONDS);
    setPhase("break");
  }

  function resumeReading() {
    setPhase("reading");
    startRef.current = performance.now() - elapsedSeconds * 1000;
    if (cameraEnabled && landmarkerRef.current) animationRef.current = requestAnimationFrame(processFrame);
  }

  useEffect(() => {
    if (phase !== "break") return;
    const timer = window.setInterval(() => setBreakSeconds((value) => {
      if (value <= 1) {
        window.clearInterval(timer);
        resumeReading();
        return BREAK_SECONDS;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [elapsedSeconds, phase]);

  function toggleSpeech() {
    if (!("speechSynthesis" in window)) return;
    if (speechActive) {
      window.speechSynthesis.cancel();
      setSpeechActive(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(READING_TEXT.join(" "));
    utterance.rate = 0.9;
    utterance.onend = () => setSpeechActive(false);
    window.speechSynthesis.speak(utterance);
    setSpeechActive(true);
    adaptationsRef.current.push("Used text-to-speech");
  }

  function finishSession() {
    stopCamera();
    setPhase("result");
  }

  function submitFeedback(confirmed: boolean) {
    setFeedback(confirmed);
    const currentEstimate = latestEstimateRef.current;
    if (currentEstimate) savePersonalizationModel(updateModelFromConfirmation(model, currentEstimate, confirmed));
    saveAdaptiveSession({
      id: crypto.randomUUID?.() ?? `${Date.now()}`,
      completedAt: new Date().toISOString(),
      durationSeconds: elapsedSeconds,
      cameraUsed: cameraEnabled,
      trackingQualityPercent: trackingQuality,
      maxStrainScore: estimate?.score ?? 0,
      promptCount: promptCountRef.current,
      adaptationsApplied: Array.from(new Set<string>(adaptationsRef.current)),
      userConfirmedPrompt: confirmed,
      checkIn,
      featureVector: estimate?.featureVector,
      mlProbability: estimate?.mlProbability ?? null,
      source: "guided-session",
    });
    show({ title: "Local personalization updated", description: "Only aggregate settings and this session summary were saved.", tone: "success" });
  }

  function reset() {
    stopCamera();
    setPhase("intro");
    setEstimate(null);
    setPromptVisible(false);
    setFeedback(null);
    setAutoAdaptNotice(false);
    lastPreAdaptSettingsRef.current = null;
    adaptationsRef.current = [];
    promptCountRef.current = 0;
    elevatedHistoryRef.current = [];
    lastPromptAtRef.current = -60_000;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Adaptive reading"
        title="Focus"
        context="Let SomatoSync adapt during normal use, or run an optional controlled reading check to calibrate and test your setup."
        actions={settings.enabled ? <Button variant="secondary" size="sm" onClick={() => setSettings({ ...settings, enabled: false, updatedAt: new Date().toISOString() })}>Reset display</Button> : undefined}
      />

      {phase === "intro" && (
        <>
          <Card className="overflow-hidden border-0 bg-[var(--color-accent-soft)] p-0">
            <div className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="rounded-[16px] bg-[var(--color-surface)] p-3"><BrainCircuit className="h-6 w-6 text-[var(--color-accent)]" /></div>
                <div className="max-w-3xl">
                  <p className="text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">Adaptive Focus</p>
                  <h2 className="mt-2 text-[25px] font-semibold tracking-tight">Use SomatoSync normally. Focus starts from your current symptoms, then refines the interface only when a sustained pattern appears.</h2>
                  <p className="mt-3 text-[16px] leading-7 text-[var(--color-text-secondary)]">Light or visual sensitivity can start a low-glare view, cognitive fatigue can simplify information density, and motion-related symptoms can stabilize the page. Local face-landmark signals can then refine reading layout, media intensity, motion, spacing, and hierarchy during use.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <FocusStep number="1" title="Start from symptoms" text="Uses the latest confirmed symptom record, regardless of whether it came from voice, the form, or task-tolerance checks." />
                <FocusStep number="2" title="Watch locally" text="MediaPipe compares sustained blink, squint, viewing-distance, head, gaze, and interaction changes with this session’s reference." />
                <FocusStep number="3" title="Refine the interface" text="Applies only matched, reversible changes instead of zooming the entire page." />
              </div>
              {siteWideStatus === "off" || siteWideStatus === "error" ? <Button className="mt-6" onClick={() => void startMonitoring()}><Camera />Turn on adaptive Focus</Button> : <Button className="mt-6" variant="secondary" onClick={stopMonitoring}>Turn off adaptive Focus</Button>}
            </div>
          </Card>

          <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">Optional controlled reading check</p><p className="mt-1 max-w-2xl text-[16px] leading-6 text-[var(--color-text-secondary)]">Use the guided session when you want to recalibrate, test the detector in a controlled reading task, or compare which setup feels easiest.</p></div>
            <Button variant="secondary" size="sm" onClick={() => setPhase("checkin")}>Open guided check</Button>
          </Card>
          <section aria-label="SomatoSync Shield" className="pt-1">
            <div className="mb-3">
              <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">Carry your setup to other websites</h2>
              <p className="mt-1 max-w-3xl text-[16px] leading-6 text-[var(--color-text-secondary)]">Shield belongs with Focus Mode: it takes the reading supports you choose or learn here and applies them to reading-heavy sites such as Wikipedia.</p>
            </div>
            <SomatoSyncShieldPanel />
          </section>

          {priorSessions.length > 0 && (
            <details className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <summary className="cursor-pointer text-[16px] font-semibold text-[var(--color-text-primary)]">Recent sessions</summary>
              <div className="mt-4 divide-y divide-[var(--color-border)]">
                {priorSessions.slice(0, 3).map((session) => (
                  <div key={session.id} className="py-3 text-[16px] text-[var(--color-text-secondary)]">
                    <p className="font-medium text-[var(--color-text-primary)]">{new Date(session.completedAt).toLocaleDateString()}</p>
                    <p className="mt-1">{session.durationSeconds}s · {session.promptCount} prompt{session.promptCount === 1 ? "" : "s"}</p>
                    <p>{session.cameraUsed ? "Camera-assisted session" : "Behavior-only session"}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {phase === "checkin" && (
        <Card className="mx-auto max-w-3xl p-6">
          <h2 className="text-[22px] font-bold tracking-tight">How does the screen feel?</h2>
          <p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">Choose how the screen feels right now.</p>
          <div className="mt-5 space-y-5">
            <RatingRow label="Light sensitivity" value={checkIn.lightSensitivity} onChange={(value) => updateCheckIn("lightSensitivity", value)} />
            <RatingRow label="Scrolling or visual-motion discomfort" value={checkIn.visualMotionDiscomfort} onChange={(value) => updateCheckIn("visualMotionDiscomfort", value)} />
            <RatingRow label="Mental fatigue" value={checkIn.mentalFatigue} onChange={(value) => updateCheckIn("mentalFatigue", value)} />
          </div>
          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-accent-soft-border)] bg-[var(--color-accent-soft)] p-4">
            <p className="text-[16px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">Matched reading environment</p>
            {startingPlan.changes.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {startingPlan.changes.map((change) => <span key={change} className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-[16px] font-medium text-[var(--color-text-primary)]">{change}</span>)}
              </div>
            ) : <p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">No display change is suggested from the current symptom ratings.</p>}
            <p className="mt-2 text-[16px] text-[var(--color-text-secondary)]">More support can appear if a pattern lasts.</p>
          </div>
          <div className="mt-5 space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
            <Toggle label="Use camera-based face landmarks" detail="Optional; frames are processed in memory and immediately discarded." checked={cameraEnabled} onCheckedChange={setCameraEnabled} />
            <Toggle label="Automatically apply adaptations after a strong multi-signal prompt" detail="When a strong sustained pattern appears, SomatoSync applies the matched reversible support immediately and shows an Undo option." checked={autoAdapt} onCheckedChange={setAutoAdapt} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2"><Button onClick={beginSession}>Begin session</Button><Button variant="secondary" onClick={() => setPhase("intro")}>Cancel</Button></div>
        </Card>
      )}

      {(phase === "loading" || phase === "calibrating") && (
        <Card className="mx-auto max-w-3xl p-6">
          <h2 className="text-[17px] font-semibold">{phase === "loading" ? "Starting reading support…" : `Comfortable reading reference · ${seconds}s`}</h2>
          <p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">Sit comfortably and read normally.</p>
          <CameraPanel videoRef={videoRef} overlayRef={overlayRef} visible={cameraVisible} />
          <p className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-4 text-[16px] leading-relaxed">A gradual return to everyday thinking and reading tasks can be paced according to symptom tolerance.</p>
        </Card>
      )}

      {phase === "reading" && (
        <div className="space-y-5">
          {tabPaused && !document.hidden && (
            <Card className="border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-4">
              <div className="flex items-start gap-3"><Pause className="mt-0.5 h-5 w-5 text-[var(--color-accent)]" /><div><p className="text-[16px] font-semibold">Focus session paused while you were away</p><p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">Monitoring resumes {resumeGraceSeconds || 3} seconds after you return.</p></div></div>
            </Card>
          )}
          {autoAdaptNotice && (
            <Card className="border-[var(--color-positive)]/35 bg-[var(--color-positive-soft)]/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[16px] font-semibold">Reading environment adjusted automatically</p><p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">Support applied.</p></div><Button size="sm" variant="secondary" onClick={undoGuidedAutoAdapt}>Undo</Button></div>
            </Card>
          )}
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-[22px] font-bold tracking-tight">Read naturally</h2><p className="mt-0.5 text-[16px] text-[var(--color-text-secondary)]">{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, "0")} elapsed</p></div>
                <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={toggleSpeech}>{speechActive ? <Pause /> : <Volume2 />}{speechActive ? "Stop audio" : "Read aloud"}</Button><Button size="sm" onClick={finishSession}>Finish & see result</Button></div>
              </div>
            </div>
            <div
              ref={readingRef}
              data-focus-reading-surface="true"
              onScroll={onReadingScroll}
              onPointerMove={() => { lastInteractionRef.current = Date.now(); }}
              className="max-h-[560px] overflow-y-auto p-6 sm:p-8"
              style={{ lineHeight: `calc(1.65 * var(--adaptive-line-spacing, 1))` }}
            >
              <h3 className="text-[28px] font-bold tracking-tight">Pacing cognitive activity during recovery</h3>
              {READING_TEXT.map((paragraph) => <p key={paragraph.slice(0, 25)} className="mt-6 text-[17px] leading-8 text-[var(--color-text-secondary)]">{paragraph}</p>)}
              <div className="h-40" />
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[16px] font-medium text-[var(--color-text-tertiary)]">Reading status</p>
                <p className={`mt-1 text-[18px] font-semibold ${estimate?.band === "elevated" ? "text-[var(--color-caution)]" : "text-[var(--color-text-primary)]"}`}>{estimate?.band === "elevated" ? "Sustained reading difficulty noticed" : estimate?.band === "possible" ? "A few small changes noticed" : "Reading looks steady"}</p>
              </div>
              {cameraEnabled && <span className="text-[16px] text-[var(--color-text-secondary)]">Camera tracking {trackingQuality >= 65 ? "ready" : "limited"}</span>}
            </div>
            <details className="mt-4 border-t border-[var(--color-border)] pt-4">
              <summary className="cursor-pointer text-[16px] font-semibold text-[var(--color-accent)]">Why this status changed</summary>
              <div className="mt-3 flex flex-wrap gap-2">{estimate?.reasons.length ? estimate.reasons.map((reason) => <div key={reason.key}><p className="text-[16px] font-medium text-[var(--color-text-primary)]">{reason.label}</p><p className="mt-0.5 text-[16px] leading-6 text-[var(--color-text-secondary)]">{reason.detail}</p></div>) : <p className="text-[16px] text-[var(--color-text-secondary)]">No sustained multi-signal change detected yet.</p>}</div>
              {cameraEnabled && <div className="mt-4"><CameraPanel videoRef={videoRef} overlayRef={overlayRef} visible={cameraVisible} compact /></div>}
            </details>
          </Card>

          {promptVisible && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
              <Card className="w-full max-w-lg p-6 shadow-[var(--shadow-med)]">
                <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-6 w-6 text-[var(--color-caution)]" /><div><h2 className="text-[17px] font-semibold">Possible increasing strain</h2><p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">Several session signals changed.</p></div></div>
                <div className="mt-4 space-y-2">{estimate?.reasons.slice(0, 3).map((reason) => <p key={reason.key} className="rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-3 text-[16px]">{reason.label}</p>)}</div>
                <div className="mt-5 grid gap-2 sm:grid-cols-3"><Button onClick={applyAdaptiveChanges}>Adapt interface</Button><Button variant="secondary" onClick={startBreak}><Pause />Take 2-min break</Button><Button variant="ghost" onClick={() => setPromptVisible(false)}>Continue</Button></div>
              </Card>
            </div>
          )}
        </div>
      )}

      {phase === "break" && (
        <Card className="mx-auto max-w-2xl p-8 text-center"><Pause className="mx-auto h-9 w-9 text-[var(--color-accent)]" /><h2 className="mt-4 text-[20px] font-semibold">Quiet break</h2><p className="mt-2 text-[16px] text-[var(--color-text-secondary)]">Look away from the screen, relax your shoulders, and breathe normally. Resume when comfortable.</p><p className="mt-5 text-[36px] font-semibold tabular-nums">{Math.floor(breakSeconds / 60)}:{String(breakSeconds % 60).padStart(2, "0")}</p><Button className="mt-5" variant="secondary" onClick={resumeReading}><Play />Resume early</Button></Card>
      )}

      {phase === "result" && (
        <div className="mx-auto max-w-3xl space-y-5">
          <Card className={`border-0 p-6 sm:p-7 ${promptCountRef.current > 0 ? "bg-[var(--color-accent-soft)]" : "bg-[var(--color-positive-soft)]"}`}>
            <div className="flex items-start gap-4"><CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-[var(--color-positive)]" /><div><p className="text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">Session result</p><h2 className="mt-2 text-[24px] font-semibold tracking-tight">{promptCountRef.current > 0 ? "A sustained reading change appeared" : "Reading stayed steady in this session"}</h2><p className="mt-2 text-[16px] leading-7 text-[var(--color-text-secondary)]">{promptCountRef.current > 0 ? "SomatoSync noticed a sustained change and offered support." : "No support was needed during this session."}</p></div></div>
          </Card>

          <Card className="p-6 sm:p-7">
            <p className="text-[16px] font-bold uppercase tracking-[0.14em] text-[var(--color-accent)]">For your next reading session</p>
            <h3 className="mt-2 text-[21px] font-semibold tracking-tight text-[var(--color-text-primary)]">Next time</h3>
            <div className="mt-4 space-y-3">{focusSessionTips(checkIn, promptCountRef.current, adaptationsRef.current).map((tip) => <div key={tip.title} className="rounded-[15px] bg-[var(--color-surface-sunken)] p-4"><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{tip.title}</p><p className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">{tip.detail}</p></div>)}</div>
          </Card>

          {promptCountRef.current > 0 && <Card className="p-5 sm:p-6"><h3 className="text-[16px] font-semibold">Did the latest prompt match how strained you felt?</h3><p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">This helps tune future prompts.</p><div className="mt-3 flex flex-wrap gap-2"><Button variant={feedback === true ? "primary" : "secondary"} onClick={() => submitFeedback(true)} disabled={feedback !== null}><CheckCircle2 />Yes, it matched</Button><Button variant={feedback === false ? "primary" : "secondary"} onClick={() => submitFeedback(false)} disabled={feedback !== null}><XCircle />No, it did not</Button></div></Card>}

          <details className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <summary className="cursor-pointer text-[16px] font-semibold text-[var(--color-text-primary)]">Session details</summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-3"><ResultMetric label="Duration" value={`${elapsedSeconds}s`} /><ResultMetric label="Prompts" value={`${promptCountRef.current}`} /><ResultMetric label="Tracking" value={cameraEnabled ? (trackingQuality >= 65 ? "Ready" : "Limited") : "Off"} /></div>
            {adaptationsRef.current.length > 0 && <div className="mt-5"><h3 className="text-[16px] font-semibold">Adaptations used</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-[16px] text-[var(--color-text-secondary)]">{[...new Set(adaptationsRef.current)].map((item) => <li key={item}>{item}</li>)}</ul></div>}
            <p className="mt-4 text-[16px] leading-6 text-[var(--color-text-tertiary)]"></p>
          </details>

          <div className="flex flex-wrap gap-2"><Button onClick={reset}><RefreshCw />New session</Button><Button variant="secondary" onClick={() => applyProfile("standard", true)}>Return to standard interface</Button></div>
        </div>
      )}

      {phase === "error" && (
        <Card className="mx-auto max-w-2xl p-6"><XCircle className="h-8 w-8 text-[var(--color-risk)]" /><h2 className="mt-3 text-[17px] font-semibold">Camera monitoring could not start</h2><p className="mt-2 text-[16px] text-[var(--color-text-secondary)]">{error}</p><div className="mt-4 flex gap-2"><Button onClick={() => { setCameraEnabled(false); startReading(zeroWindow); }}>Continue without camera</Button><Button variant="secondary" onClick={() => setPhase("checkin")}>Back</Button></div></Card>
      )}

      <details className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
        <summary className="cursor-pointer text-[16px] font-semibold text-[var(--color-text-primary)]">Scientific and accessibility basis</summary>
        <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
          The interface adaptations reflect guidance supporting cognitive pacing, scheduled breaks, symptom-limited return to learning, and accommodations for reading difficulty, fatigue, and visual sensitivity. The camera-derived patterns themselves are experimental and non-diagnostic.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[16px] font-medium text-[var(--color-accent)]">
          <a href="https://bjsm.bmj.com/content/57/11/695" target="_blank" rel="noreferrer" className="hover:underline">Amsterdam concussion consensus</a>
          <a href="https://concussionsontario.org/concussion/guideline-section/fatigue" target="_blank" rel="noreferrer" className="hover:underline">Ontario fatigue and pacing guidance</a>
          <a href="https://pedsconcussion.com/template-for-concussion-teams-letter-to-the-child-adolescents-school/" target="_blank" rel="noreferrer" className="hover:underline">Pediatric school accommodations</a>
        </div>
      </details>

      <Disclaimer variant="block">
        Neuro-Adaptive Mode is an experimental accessibility aid. Blink, gaze, facial movement, viewing distance, and interaction patterns are non-specific and can change because of lighting, dry eyes, stress, glasses, posture, or task difficulty. It does not diagnose fatigue, vision dysfunction, concussion, or readiness.
      </Disclaimer>
    </div>
  );
}

function focusSessionTips(checkIn: AdaptiveCheckIn, promptCount: number, adaptations: string[]) {
  const tips: Array<{ title: string; detail: string }> = [];
  const used = [...new Set(adaptations)];
  if (used.length > 0) tips.push({ title: "Keep the supports that were used", detail: `${used.slice(0, 4).join(" · ")}. You can undo them at any time.` });
  if (checkIn.lightSensitivity >= 3) tips.push({ title: "Keep calmer visuals available", detail: "Your check-in reported meaningful light sensitivity, so the warmer lower-intensity palette and calmer media remain relevant even if no strain prompt appeared." });
  if (checkIn.visualMotionDiscomfort >= 3) tips.push({ title: "Reduce motion on reading-heavy pages", detail: "Keep reduced animation and non-sticky reading surfaces available when scrolling or visual motion feels uncomfortable." });
  if (checkIn.mentalFatigue >= 3) tips.push({ title: "Lower the reading load", detail: "Use shorter blocks, simplified page structure, or read-aloud when mental fatigue is already elevated before you start." });
  if (promptCount === 0) tips.push({ title: "No extra change was needed right now", detail: "The short session stayed below the sustained-change threshold. Continue with the current setup and reassess only if the task or symptoms change." });
  if (tips.length === 0) tips.push({ title: "Standard reading setup looks reasonable", detail: "No symptom-matched support or sustained reading change stood out in this session. Keep the normal view and use Focus again when the task is more demanding." });
  return tips.slice(0, 3);
}

function FocusStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="rounded-[16px] bg-[var(--color-surface)]/85 p-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[16px] font-bold text-white">{number}</span><p className="mt-3 text-[16px] font-semibold text-[var(--color-text-primary)]">{title}</p><p className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">{text}</p></div>;
}

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div><div className="flex items-center justify-between"><label className="text-[16px] font-medium">{label}</label><span className="text-[16px] font-semibold tabular-nums">{value}/5</span></div><input className="mt-2 w-full accent-[var(--color-accent)]" type="range" min={0} max={5} value={value} onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value))} /><div className="flex justify-between text-[16px] text-[var(--color-text-tertiary)]"><span>None</span><span>Severe</span></div></div>;
}

function Toggle({ label, detail, checked, onCheckedChange }: { label: string; detail: string; checked: boolean; onCheckedChange: (value: boolean) => void }) {
  return <div className="flex items-start justify-between gap-4"><div><p className="text-[16px] font-medium">{label}</p><p className="mt-0.5 text-[16px] text-[var(--color-text-tertiary)]">{detail}</p></div><Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} /></div>;
}

function CameraPanel({ videoRef, overlayRef, visible, compact = false }: { videoRef: RefObject<HTMLVideoElement | null>; overlayRef: RefObject<HTMLCanvasElement | null>; visible: boolean; compact?: boolean }) {
  return <div className={`relative mt-4 overflow-hidden rounded-[var(--radius-md)] bg-slate-950 ${compact ? "aspect-[4/3]" : "aspect-video"}`}><video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" /><canvas ref={overlayRef} width={720} height={540} className="pointer-events-none absolute inset-0 h-full w-full" /><div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-[16px] font-medium text-white"><Camera className="mr-1 inline h-3 w-3" />{visible ? "Face landmarks local" : "Position face in view"}</div></div>;
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-3"><p className="text-[16px] font-medium text-[var(--color-text-tertiary)]">{label}</p><p className="mt-1 text-[18px] font-semibold tabular-nums">{value}</p></div>;
}
