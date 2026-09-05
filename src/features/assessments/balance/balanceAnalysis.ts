import type { BalanceAssessmentResult, BalanceFrameSample, BalanceMovementBand } from "./balanceTypes";

export const BALANCE_FRAME_WIDTH = 160;
export const BALANCE_FRAME_HEIGHT = 120;
export const BALANCE_TEST_SECONDS = 15;
export const BALANCE_SAMPLE_INTERVAL_MS = 100;

function rms(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squared = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(squared);
}

function range(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

function path(values: number[]): number {
  let total = 0;
  for (let index = 1; index < values.length; index += 1) {
    total += Math.abs(values[index] - values[index - 1]);
  }
  return total;
}

function movementBand(lateralRmsPercent: number, trackingQualityPercent: number): BalanceMovementBand {
  if (trackingQualityPercent < 60) return "insufficient";
  if (lateralRmsPercent < 0.65) return "lower";
  if (lateralRmsPercent < 1.5) return "moderate";
  return "higher";
}

export function summarizeBalanceSamples(
  samples: BalanceFrameSample[],
  expectedSamples: number,
  durationSeconds = BALANCE_TEST_SECONDS
): BalanceAssessmentResult {
  const bodyX = samples.map((sample) => sample.bodyX);
  const headX = samples.map((sample) => sample.headX);
  const lateralRmsPercent = (rms(bodyX) / BALANCE_FRAME_WIDTH) * 100;
  const lateralRangePercent = (range(bodyX) / BALANCE_FRAME_WIDTH) * 100;
  const swayPathPercent = (path(bodyX) / BALANCE_FRAME_WIDTH) * 100;
  const headRmsPercent = (rms(headX) / BALANCE_FRAME_WIDTH) * 100;
  const trackingQualityPercent = Math.min(100, (samples.length / Math.max(1, expectedSamples)) * 100);

  return {
    id: `balance_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    assessmentType: "balance",
    completedAt: new Date().toISOString(),
    durationSeconds,
    sampleCount: samples.length,
    trackingQualityPercent: Math.round(trackingQualityPercent),
    lateralRmsPercent: Number(lateralRmsPercent.toFixed(2)),
    lateralRangePercent: Number(lateralRangePercent.toFixed(2)),
    swayPathPercent: Number(swayPathPercent.toFixed(2)),
    headRmsPercent: Number(headRmsPercent.toFixed(2)),
    movementBand: movementBand(lateralRmsPercent, trackingQualityPercent),
  };
}
