import { getMostRecentPcssResult } from "../assessments/pcss/pcssStorage";
import type { PcssAssessmentResult } from "../assessments/pcss/pcssTypes";
import { getMostRecentReactionResult } from "../assessments/reaction/reactionStorage";
import { getMostRecentMemoryResult } from "../assessments/memory/memoryStorage";
import { getMostRecentBalanceResult } from "../assessments/balance/balanceStorage";
import type { AdaptiveCheckIn } from "./neuroAdaptiveTypes";

const clip = (value: number) => Math.max(0, Math.min(5, Number(value) || 0));
const ZERO_CONTEXT: AdaptiveCheckIn = {
  lightSensitivity: 0,
  visualMotionDiscomfort: 0,
  mentalFatigue: 0,
  headache: 0,
  noiseSensitivity: 0,
  visualProblems: 0,
  overallSymptomBurden: 0,
};

/**
 * Converts a user-confirmed PCSS-format record into the compact symptom context used
 * by Focus. Manual and Voice Check-In both save to this same history.
 */
export function adaptiveCheckInFromPcss(result: PcssAssessmentResult): AdaptiveCheckIn {
  const ratings = result.ratings;
  const relevant = [
    ratings.headache,
    ratings.sensitivityToLight,
    ratings.sensitivityToNoise,
    ratings.visualProblems,
    ratings.dizziness,
    ratings.balanceProblems,
    ratings.nausea,
    ratings.fatigue,
    ratings.drowsiness,
    ratings.slowedDown,
    ratings.mentallyFoggy,
    ratings.difficultyConcentrating,
    ratings.memoryProblems,
  ].map(clip);

  return {
    lightSensitivity: clip(ratings.sensitivityToLight),
    noiseSensitivity: clip(ratings.sensitivityToNoise),
    headache: clip(ratings.headache),
    visualProblems: clip(ratings.visualProblems),
    visualMotionDiscomfort: clip(Math.max(
      ratings.visualProblems,
      ratings.dizziness,
      ratings.balanceProblems,
      ratings.nausea,
    )),
    mentalFatigue: clip(Math.max(
      ratings.fatigue,
      ratings.drowsiness,
      ratings.slowedDown,
      ratings.mentallyFoggy,
      ratings.difficultyConcentrating,
      ratings.memoryProblems,
    )),
    overallSymptomBurden: relevant.length
      ? clip(relevant.reduce((sum, value) => sum + value, 0) / relevant.length)
      : 0,
  };
}

type PartialSymptomEvent = {
  completedAt: string;
  patch: Partial<AdaptiveCheckIn>;
};

function newestTaskSymptomEvent(): PartialSymptomEvent | null {
  const events: PartialSymptomEvent[] = [];

  const reaction = getMostRecentReactionResult();
  if (reaction?.postSymptoms) {
    events.push({
      completedAt: reaction.completedAt,
      patch: {
        headache: clip(reaction.postSymptoms.headache),
        lightSensitivity: clip(reaction.postSymptoms.lightSensitivity),
        visualMotionDiscomfort: clip(Math.max(reaction.postSymptoms.dizziness, reaction.postSymptoms.nausea)),
        mentalFatigue: clip(Math.max(reaction.postSymptoms.concentrationDifficulty, reaction.postSymptoms.fatigue)),
      },
    });
  }

  const memory = getMostRecentMemoryResult();
  if (memory?.postTolerance) {
    events.push({
      completedAt: memory.completedAt,
      patch: {
        headache: clip(memory.postTolerance.headache),
        visualMotionDiscomfort: clip(memory.postTolerance.dizziness),
        mentalFatigue: clip(Math.max(memory.postTolerance.concentrationDifficulty, memory.postTolerance.fatigue)),
      },
    });
  }

  const balance = getMostRecentBalanceResult();
  if (balance?.postTolerance) {
    events.push({
      completedAt: balance.completedAt,
      patch: {
        headache: clip(balance.postTolerance.headache),
        visualMotionDiscomfort: clip(balance.postTolerance.dizziness),
        mentalFatigue: clip(Math.max(balance.postTolerance.concentrationDifficulty, balance.postTolerance.fatigue)),
      },
    });
  }

  return events.sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1))[0] ?? null;
}

/**
 * Unified current symptom state. The full PCSS record is the base; if a more recent
 * assessment collected user-confirmed post-task symptoms, only the symptoms that task
 * actually asked about are refreshed. Performance scores never directly drive UI changes.
 */
export function getCurrentAdaptiveCheckIn(): AdaptiveCheckIn | null {
  const pcss = getMostRecentPcssResult();
  const taskEvent = newestTaskSymptomEvent();
  if (!pcss && !taskEvent) return null;

  const base = pcss ? adaptiveCheckInFromPcss(pcss) : { ...ZERO_CONTEXT };
  if (!taskEvent || (pcss && taskEvent.completedAt <= pcss.completedAt)) return base;

  return {
    ...base,
    ...taskEvent.patch,
    overallSymptomBurden: base.overallSymptomBurden,
  };
}
