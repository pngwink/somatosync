import {
  BALANCE_FRAME_HEIGHT,
  BALANCE_FRAME_WIDTH,
} from "./balanceAnalysis";
import type { BalanceFrameSample } from "./balanceTypes";

export interface PoseLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
}

interface PoseLandmarkerResultLike {
  landmarks?: PoseLandmark[][];
}

export interface PoseLandmarkerLike {
  detectForVideo(video: HTMLVideoElement, timestampMs: number): PoseLandmarkerResultLike;
  close?: () => void;
}

export interface PoseSampleResult {
  sample: BalanceFrameSample;
  landmarks: PoseLandmark[];
  visibility: number;
  positioningReady: boolean;
}

const MODULE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/+esm";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

let poseLandmarkerPromise: Promise<PoseLandmarkerLike> | null = null;

export function getPoseModelAssets() {
  return { moduleUrl: MODULE_URL, wasmUrl: WASM_URL, modelUrl: MODEL_URL };
}

export async function loadPoseLandmarker(): Promise<PoseLandmarkerLike> {
  if (!poseLandmarkerPromise) {
    poseLandmarkerPromise = createPoseLandmarker().catch((error) => {
      poseLandmarkerPromise = null;
      throw error;
    });
  }
  return poseLandmarkerPromise;
}

async function createPoseLandmarker(): Promise<PoseLandmarkerLike> {
  const mediaPipeModule = await import(/* @vite-ignore */ MODULE_URL) as {
    FilesetResolver?: { forVisionTasks: (wasmRoot: string) => Promise<unknown> };
    PoseLandmarker?: {
      createFromOptions: (vision: unknown, options: Record<string, unknown>) => Promise<PoseLandmarkerLike>;
    };
  };

  if (!mediaPipeModule.FilesetResolver || !mediaPipeModule.PoseLandmarker) {
    throw new Error("MediaPipe Pose Landmarker could not be loaded.");
  }

  const vision = await mediaPipeModule.FilesetResolver.forVisionTasks(WASM_URL);
  const commonOptions = {
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.55,
    minPosePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
    outputSegmentationMasks: false,
  };

  try {
    return await mediaPipeModule.PoseLandmarker.createFromOptions(vision, {
      ...commonOptions,
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    });
  } catch {
    return mediaPipeModule.PoseLandmarker.createFromOptions(vision, {
      ...commonOptions,
      baseOptions: { modelAssetPath: MODEL_URL },
    });
  }
}

const INDEX = {
  nose: 0,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
} as const;

function usable(landmark: PoseLandmark | undefined, minimum = 0.45): landmark is PoseLandmark {
  if (!landmark || !Number.isFinite(landmark.x) || !Number.isFinite(landmark.y)) return false;
  const visibility = landmark.visibility ?? landmark.presence ?? 1;
  return visibility >= minimum;
}

function midpoint(first: PoseLandmark, second: PoseLandmark): PoseLandmark {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    visibility: ((first.visibility ?? 1) + (second.visibility ?? 1)) / 2,
  };
}

export function detectPoseSample(
  landmarker: PoseLandmarkerLike,
  video: HTMLVideoElement,
  timestampMs: number,
  timeMs: number
): PoseSampleResult | null {
  const result = landmarker.detectForVideo(video, timestampMs);
  const landmarks = result.landmarks?.[0];
  if (!landmarks || landmarks.length < 27) return null;

  const leftShoulder = landmarks[INDEX.leftShoulder];
  const rightShoulder = landmarks[INDEX.rightShoulder];
  const leftHip = landmarks[INDEX.leftHip];
  const rightHip = landmarks[INDEX.rightHip];
  if (![leftShoulder, rightShoulder, leftHip, rightHip].every((item) => usable(item))) return null;

  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const hipMid = midpoint(leftHip, rightHip);
  const bodyX = ((shoulderMid.x * 0.55) + (hipMid.x * 0.45)) * BALANCE_FRAME_WIDTH;
  const bodyY = ((shoulderMid.y * 0.45) + (hipMid.y * 0.55)) * BALANCE_FRAME_HEIGHT;

  const nose = landmarks[INDEX.nose];
  const leftEar = landmarks[INDEX.leftEar];
  const rightEar = landmarks[INDEX.rightEar];
  let head = usable(leftEar) && usable(rightEar) ? midpoint(leftEar, rightEar) : nose;
  if (!usable(head)) head = shoulderMid;

  const keyLandmarks = [nose, leftEar, rightEar, leftShoulder, rightShoulder, leftHip, rightHip]
    .filter((item): item is PoseLandmark => usable(item, 0));
  const visibility = keyLandmarks.length > 0
    ? keyLandmarks.reduce((sum, item) => sum + (item.visibility ?? item.presence ?? 1), 0) / keyLandmarks.length
    : 0;

  const positioningReady = [
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    landmarks[INDEX.leftKnee],
    landmarks[INDEX.rightKnee],
  ].every((item) => usable(item, 0.4));

  return {
    sample: {
      timeMs,
      bodyX,
      bodyY,
      headX: head.x * BALANCE_FRAME_WIDTH,
      headY: head.y * BALANCE_FRAME_HEIGHT,
      confidence: visibility,
    },
    landmarks,
    visibility,
    positioningReady,
  };
}

const CONNECTIONS: Array<[number, number]> = [
  [7, 8], [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

export function drawPoseOverlay(canvas: HTMLCanvasElement, landmarks: PoseLandmark[]) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);
  context.lineWidth = Math.max(2, width / 250);
  context.strokeStyle = "rgba(255,255,255,0.88)";
  context.fillStyle = "rgba(65,196,175,0.95)";

  for (const [startIndex, endIndex] of CONNECTIONS) {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];
    if (!usable(start, 0.35) || !usable(end, 0.35)) continue;
    context.beginPath();
    context.moveTo((1 - start.x) * width, start.y * height);
    context.lineTo((1 - end.x) * width, end.y * height);
    context.stroke();
  }

  for (const index of [0, 7, 8, 11, 12, 23, 24, 25, 26, 27, 28]) {
    const landmark = landmarks[index];
    if (!usable(landmark, 0.35)) continue;
    context.beginPath();
    context.arc((1 - landmark.x) * width, landmark.y * height, Math.max(3, width / 180), 0, Math.PI * 2);
    context.fill();
  }
}
