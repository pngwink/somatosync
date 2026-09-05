import { useEffect, useReducer, useRef } from "react";
import type {
  ReactionPhase,
  ReactionTrialKind,
  ReactionTrialResult,
  SymptomRatings,
} from "./reactionTypes";
import {
  PRACTICE_TRIAL_COUNT,
  SCORED_TRIAL_COUNT,
  MIN_STIMULUS_DELAY_MS,
  MAX_STIMULUS_DELAY_MS,
  RESPONSE_TIMEOUT_MS,
  EMPTY_SYMPTOM_RATINGS,
} from "./reactionTypes";
import type { ReactionAssessmentResult } from "./reactionTypes";
import { randomStimulusDelay, classifyResponse, buildTrial } from "./reactionEngine";
import { computeTrialStats, compareToReference } from "./reactionCalculations";
import { evaluateReactionQuality } from "./reactionQuality";
import {
  saveReactionResult,
  getReactionBaseline,
  getPreviousReactionMedianBeforeSaving,
} from "./reactionStorage";
import { detectDeviceType } from "../shared/assessmentTypes";

interface PreCheckInput {
  symptoms: SymptomRatings;
  sleepHours: number | null;
  recentCaffeine: boolean | null;
  feelsAbleToTest: boolean | null;
}

interface EngineState {
  phase: ReactionPhase;
  sessionId: string;
  sessionStartedAt: string | null;
  trialKind: ReactionTrialKind;
  trialNumber: number;
  practiceTrials: ReactionTrialResult[];
  scoredTrials: ReactionTrialResult[];
  lastTrial: ReactionTrialResult | null;
  preSymptoms: SymptomRatings | null;
  postSymptoms: SymptomRatings | null;
  sleepHours: number | null;
  recentCaffeine: boolean | null;
  feelsAbleToTest: boolean | null;
  result: ReactionAssessmentResult | null;
  abandoned: boolean;
}

type Action =
  | { type: "BEGIN" }
  | { type: "SUBMIT_PRE_CHECK"; payload: PreCheckInput }
  | { type: "ARM_TRIAL"; kind: ReactionTrialKind; trialNumber: number }
  | { type: "SHOW_STIMULUS" }
  | { type: "FINALIZE_TRIAL"; trial: ReactionTrialResult }
  | { type: "GO_TO_SCORED_READY" }
  | { type: "GO_TO_POST_CHECK" }
  | { type: "COMPLETE"; postSymptoms: SymptomRatings; result: ReactionAssessmentResult }
  | { type: "RESTART"; sessionId: string };

function makeInitialState(sessionId: string): EngineState {
  return {
    phase: "instructions",
    sessionId,
    sessionStartedAt: null,
    trialKind: "practice",
    trialNumber: 0,
    practiceTrials: [],
    scoredTrials: [],
    lastTrial: null,
    preSymptoms: null,
    postSymptoms: null,
    sleepHours: null,
    recentCaffeine: null,
    feelsAbleToTest: null,
    result: null,
    abandoned: false,
  };
}

function reducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {
    case "BEGIN":
      return { ...state, phase: "preCheck", sessionStartedAt: new Date().toISOString() };
    case "SUBMIT_PRE_CHECK":
      return {
        ...state,
        phase: "practiceReady",
        preSymptoms: action.payload.symptoms,
        sleepHours: action.payload.sleepHours,
        recentCaffeine: action.payload.recentCaffeine,
        feelsAbleToTest: action.payload.feelsAbleToTest,
      };
    case "ARM_TRIAL":
      return { ...state, phase: "waiting", trialKind: action.kind, trialNumber: action.trialNumber };
    case "SHOW_STIMULUS":
      return { ...state, phase: "stimulus" };
    case "FINALIZE_TRIAL": {
      const trials =
        action.trial.phase === "practice"
          ? { practiceTrials: [...state.practiceTrials, action.trial], scoredTrials: state.scoredTrials }
          : { practiceTrials: state.practiceTrials, scoredTrials: [...state.scoredTrials, action.trial] };
      return { ...state, phase: "trialFeedback", lastTrial: action.trial, ...trials };
    }
    case "GO_TO_SCORED_READY":
      return { ...state, phase: "scoredReady" };
    case "GO_TO_POST_CHECK":
      return { ...state, phase: "postCheck" };
    case "COMPLETE":
      return { ...state, phase: "results", postSymptoms: action.postSymptoms, result: action.result };
    case "RESTART":
      return makeInitialState(action.sessionId);
    default:
      return state;
  }
}

export interface ReactionAssessmentApi {
  phase: ReactionPhase;
  trialKind: ReactionTrialKind;
  trialNumber: number;
  totalForKind: number;
  practiceTrials: ReactionTrialResult[];
  scoredTrials: ReactionTrialResult[];
  lastTrial: ReactionTrialResult | null;
  result: ReactionAssessmentResult | null;
  begin: () => void;
  submitPreCheck: (input: PreCheckInput) => void;
  startPracticeBlock: () => void;
  startScoredBlock: () => void;
  submitPostCheck: (symptoms: SymptomRatings) => void;
  restart: () => void;
  respond: () => void;
}

export function useReactionAssessment(): ReactionAssessmentApi {
  const [state, dispatch] = useReducer(reducer, undefined, () => makeInitialState(crypto.randomUUID()));

  // Refs drive the actual timing/response logic so global event listeners
  // never see a stale phase from a React re-render that hasn't landed yet.
  const stimulusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeStageRef = useRef<"waiting" | "stimulus" | null>(null);
  const respondedRef = useRef(false);
  const focusLostRef = useRef(false);
  const stimulusShownAtRef = useRef<number | null>(null);
  const trialMetaRef = useRef<{ kind: ReactionTrialKind; trialNumber: number; scheduledDelayMs: number; startedAt: string } | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  function clearAllTimers() {
    if (stimulusTimerRef.current) clearTimeout(stimulusTimerRef.current);
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    stimulusTimerRef.current = null;
    timeoutTimerRef.current = null;
    advanceTimerRef.current = null;
  }

  // Unmount cleanup -- never leave a dangling timer running after the user
  // navigates away mid-assessment.
  useEffect(() => clearAllTimers, []);

  // Warn on tab close/refresh while a session is genuinely in progress.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (state.phase !== "instructions" && state.phase !== "results") {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [state.phase]);

  function finalize(trial: ReactionTrialResult) {
    activeStageRef.current = null;
    dispatch({ type: "FINALIZE_TRIAL", trial });
    const pauseMs = trial.status === "valid" ? 900 : 1500;
    advanceTimerRef.current = setTimeout(() => advanceAfterFeedback(trial), pauseMs);
  }

  function advanceAfterFeedback(trial: ReactionTrialResult) {
    if (trial.phase === "practice") {
      if (trial.trialNumber < PRACTICE_TRIAL_COUNT) {
        armTrial("practice", trial.trialNumber + 1);
      } else {
        dispatch({ type: "GO_TO_SCORED_READY" });
      }
    } else {
      if (trial.trialNumber < SCORED_TRIAL_COUNT) {
        armTrial("scored", trial.trialNumber + 1);
      } else {
        dispatch({ type: "GO_TO_POST_CHECK" });
      }
    }
  }

  function armTrial(kind: ReactionTrialKind, trialNumber: number) {
    clearAllTimers();
    respondedRef.current = false;
    focusLostRef.current = false;
    stimulusShownAtRef.current = null;
    activeStageRef.current = "waiting";

    const scheduledDelayMs = randomStimulusDelay(MIN_STIMULUS_DELAY_MS, MAX_STIMULUS_DELAY_MS);
    const startedAt = new Date().toISOString();
    trialMetaRef.current = { kind, trialNumber, scheduledDelayMs, startedAt };

    dispatch({ type: "ARM_TRIAL", kind, trialNumber });

    stimulusTimerRef.current = setTimeout(() => {
      stimulusShownAtRef.current = performance.now();
      activeStageRef.current = "stimulus";
      dispatch({ type: "SHOW_STIMULUS" });

      timeoutTimerRef.current = setTimeout(() => {
        if (respondedRef.current) return;
        respondedRef.current = true;
        activeStageRef.current = null;
        const meta = trialMetaRef.current!;
        finalize(
          buildTrial({
            trialNumber: meta.trialNumber,
            kind: meta.kind,
            scheduledDelayMs: meta.scheduledDelayMs,
            startedAt: meta.startedAt,
            status: focusLostRef.current ? "focus-interrupted" : "missed",
            reactionTimeMs: null,
            stimulusShownAt: stimulusShownAtRef.current,
            respondedAt: null,
            focusLost: focusLostRef.current,
          })
        );
      }, RESPONSE_TIMEOUT_MS);
    }, scheduledDelayMs);
  }

  function respond() {
    const stage = activeStageRef.current;
    if (stage == null || respondedRef.current) return;
    respondedRef.current = true;
    activeStageRef.current = null;
    const now = performance.now();
    const meta = trialMetaRef.current;
    if (!meta) return;

    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }

    if (stage === "waiting") {
      if (stimulusTimerRef.current) {
        clearTimeout(stimulusTimerRef.current);
        stimulusTimerRef.current = null;
      }
      finalize(
        buildTrial({
          trialNumber: meta.trialNumber,
          kind: meta.kind,
          scheduledDelayMs: meta.scheduledDelayMs,
          startedAt: meta.startedAt,
          status: "false-start",
          reactionTimeMs: null,
          stimulusShownAt: null,
          respondedAt: now,
          focusLost: focusLostRef.current,
        })
      );
      return;
    }

    // stage === "stimulus"
    const shownAt = stimulusShownAtRef.current!;
    const reactionTimeMs = now - shownAt;
    finalize(
      buildTrial({
        trialNumber: meta.trialNumber,
        kind: meta.kind,
        scheduledDelayMs: meta.scheduledDelayMs,
        startedAt: meta.startedAt,
        status: classifyResponse(reactionTimeMs),
        reactionTimeMs,
        stimulusShownAt: shownAt,
        respondedAt: now,
        focusLost: focusLostRef.current,
      })
    );
  }

  // Global input handling: spacebar and Enter, deduplicated, no key-repeat,
  // scroll suppressed only while a trial is actually active.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.code !== "Space" && e.code !== "Enter" && e.key !== " " && e.key !== "Enter") return;
      if (activeStageRef.current == null) return;
      e.preventDefault();
      respond();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Browser-focus / tab-visibility integrity tracking.
  useEffect(() => {
    function flagFocusLoss() {
      if (activeStageRef.current != null) focusLostRef.current = true;
    }
    function onVisibility() {
      if (document.hidden) flagFocusLoss();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", flagFocusLoss);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", flagFocusLoss);
    };
  }, []);

  function begin() {
    dispatch({ type: "BEGIN" });
  }

  function submitPreCheck(input: PreCheckInput) {
    dispatch({ type: "SUBMIT_PRE_CHECK", payload: input });
  }

  function startPracticeBlock() {
    armTrial("practice", 1);
  }

  function startScoredBlock() {
    armTrial("scored", 1);
  }

  function submitPostCheck(postSymptoms: SymptomRatings) {
    const current = stateRef.current;
    const stats = computeTrialStats(current.scoredTrials);
    const { quality, reasons } = evaluateReactionQuality({
      validTrialCount: stats.validReactionTimesMs.length,
      falseStarts: stats.falseStarts,
      focusLossCount: stats.focusLossCount,
      coefficientOfVariation: stats.coefficientOfVariation,
      abandoned: false,
    });

    const baseline = getReactionBaseline();
    const baselineComparison = compareToReference(stats.medianMs, baseline.baselineMs);
    const previousMedian = getPreviousReactionMedianBeforeSaving();
    const previousComparison = compareToReference(stats.medianMs, previousMedian);

    const completedAt = new Date().toISOString();
    const startedAt = current.sessionStartedAt ?? completedAt;
    const durationMs = Date.parse(completedAt) - Date.parse(startedAt);

    const result: ReactionAssessmentResult = {
      id: current.sessionId,
      assessmentType: "reaction-time",
      schemaVersion: 1,
      startedAt,
      completedAt,
      durationMs,
      deviceType: detectDeviceType(),
      preSymptoms: current.preSymptoms ?? EMPTY_SYMPTOM_RATINGS,
      postSymptoms,
      sleepHours: current.sleepHours,
      recentCaffeine: current.recentCaffeine,
      feelsAbleToTest: current.feelsAbleToTest,
      trials: current.scoredTrials,
      validReactionTimesMs: stats.validReactionTimesMs,
      medianMs: stats.medianMs,
      meanMs: stats.meanMs,
      standardDeviationMs: stats.standardDeviationMs,
      fastestMs: stats.fastestMs,
      slowestMs: stats.slowestMs,
      interquartileRangeMs: stats.interquartileRangeMs,
      coefficientOfVariation: stats.coefficientOfVariation,
      baselineMs: baseline.baselineMs,
      baselineSource: baseline.source,
      baselineDifferenceMs: baselineComparison.differenceMs,
      baselineDifferencePercent: baselineComparison.differencePercent,
      previousAssessmentDifferencePercent: previousComparison.differencePercent,
      falseStarts: stats.falseStarts,
      invalidTrials: stats.invalidTrials,
      missedTrials: stats.missedTrials,
      focusLossCount: stats.focusLossCount,
      quality,
      qualityReasons: reasons,
    };

    saveReactionResult(result);
    dispatch({ type: "COMPLETE", postSymptoms, result });
  }

  function restart() {
    clearAllTimers();
    respondedRef.current = false;
    focusLostRef.current = false;
    activeStageRef.current = null;
    stimulusShownAtRef.current = null;
    trialMetaRef.current = null;
    dispatch({ type: "RESTART", sessionId: crypto.randomUUID() });
  }

  const totalForKind = state.trialKind === "practice" ? PRACTICE_TRIAL_COUNT : SCORED_TRIAL_COUNT;

  return {
    phase: state.phase,
    trialKind: state.trialKind,
    trialNumber: state.trialNumber,
    totalForKind,
    practiceTrials: state.practiceTrials,
    scoredTrials: state.scoredTrials,
    lastTrial: state.lastTrial,
    result: state.result,
    begin,
    submitPreCheck,
    startPracticeBlock,
    startScoredBlock,
    submitPostCheck,
    restart,
    respond,
  };
}
