import type { FaceSignalSample } from "./neuroAdaptiveTypes";

export interface FaceLandmark { x: number; y: number; z?: number; }
interface Category { categoryName?: string; displayName?: string; score?: number; }
interface FaceResultLike {
  faceLandmarks?: FaceLandmark[][];
  faceBlendshapes?: Array<{ categories?: Category[] }>;
}
export interface FaceLandmarkerLike {
  detectForVideo(video: HTMLVideoElement, timestampMs: number): FaceResultLike;
  close?: () => void;
}

const MODULE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/+esm";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
let promise: Promise<FaceLandmarkerLike> | null = null;

export async function loadFaceLandmarker(): Promise<FaceLandmarkerLike> {
  if (!promise) promise = create().catch((error) => { promise = null; throw error; });
  return promise;
}

async function create(): Promise<FaceLandmarkerLike> {
  const module = await import(/* @vite-ignore */ MODULE_URL) as {
    FilesetResolver?: { forVisionTasks: (root: string) => Promise<unknown> };
    FaceLandmarker?: { createFromOptions: (vision: unknown, options: Record<string, unknown>) => Promise<FaceLandmarkerLike> };
  };
  if (!module.FilesetResolver || !module.FaceLandmarker) throw new Error("MediaPipe Face Landmarker could not be loaded.");
  const vision = await module.FilesetResolver.forVisionTasks(WASM_URL);
  const options = {
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
    minFaceDetectionConfidence: 0.55,
    minFacePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55,
  };
  try {
    return await module.FaceLandmarker.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" } });
  } catch {
    return module.FaceLandmarker.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: MODEL_URL } });
  }
}

function score(categories: Category[], name: string) {
  return categories.find((category) => (category.categoryName ?? category.displayName) === name)?.score ?? 0;
}

export function detectFaceSignal(
  landmarker: FaceLandmarkerLike,
  video: HTMLVideoElement,
  timestampMs: number,
  timeMs: number,
): { sample: FaceSignalSample; landmarks: FaceLandmark[] } | null {
  const result = landmarker.detectForVideo(video, timestampMs);
  const landmarks = result.faceLandmarks?.[0];
  const categories = result.faceBlendshapes?.[0]?.categories ?? [];
  if (!landmarks || landmarks.length < 455) return null;
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const nose = landmarks[1] ?? landmarks[4];
  const faceScale = Math.hypot(leftCheek.x - rightCheek.x, leftCheek.y - rightCheek.y);
  const blinkScore = (score(categories, "eyeBlinkLeft") + score(categories, "eyeBlinkRight")) / 2;
  const browTension = (
    score(categories, "browDownLeft") + score(categories, "browDownRight") +
    0.6 * score(categories, "eyeSquintLeft") + 0.6 * score(categories, "eyeSquintRight")
  ) / 3.2;
  const gazeNames = ["eyeLookDownLeft", "eyeLookDownRight", "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft", "eyeLookOutRight", "eyeLookUpLeft", "eyeLookUpRight"];
  const gazeDeviation = Math.max(...gazeNames.map((name) => score(categories, name)), 0);
  return {
    sample: { timeMs, blinkScore, browTension, faceScale, headX: nose.x, headY: nose.y, gazeDeviation },
    landmarks,
  };
}

export function drawFaceOverlay(canvas: HTMLCanvasElement, landmarks: FaceLandmark[]) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(83, 205, 185, 0.88)";
  const points = [1, 33, 133, 263, 362, 70, 105, 334, 300, 234, 454, 152];
  for (const index of points) {
    const point = landmarks[index];
    if (!point) continue;
    context.beginPath();
    context.arc((1 - point.x) * canvas.width, point.y * canvas.height, Math.max(2, canvas.width / 180), 0, Math.PI * 2);
    context.fill();
  }
}

export interface VisualGazeSignal {
  gazeX: number;
  gazeY: number;
  faceScale: number;
  headX: number;
  headY: number;
  confidence: number;
}

/**
 * Extracts a coarse, non-diagnostic gaze-direction proxy from MediaPipe face
 * blendshapes. This is suitable only for within-session target-following
 * comparisons; it is not clinical eye tracking and is never used to diagnose.
 */
export function detectVisualGazeSignal(
  landmarker: FaceLandmarkerLike,
  video: HTMLVideoElement,
  timestampMs: number,
): VisualGazeSignal | null {
  const result = landmarker.detectForVideo(video, timestampMs);
  const landmarks = result.faceLandmarks?.[0];
  const categories = result.faceBlendshapes?.[0]?.categories ?? [];
  if (!landmarks || landmarks.length < 455) return null;

  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const nose = landmarks[1] ?? landmarks[4];
  const faceScale = Math.hypot(leftCheek.x - rightCheek.x, leftCheek.y - rightCheek.y);

  const lookRight = (score(categories, "eyeLookInLeft") + score(categories, "eyeLookOutRight")) / 2;
  const lookLeft = (score(categories, "eyeLookOutLeft") + score(categories, "eyeLookInRight")) / 2;
  const lookDown = (score(categories, "eyeLookDownLeft") + score(categories, "eyeLookDownRight")) / 2;
  const lookUp = (score(categories, "eyeLookUpLeft") + score(categories, "eyeLookUpRight")) / 2;
  const blink = (score(categories, "eyeBlinkLeft") + score(categories, "eyeBlinkRight")) / 2;

  return {
    gazeX: lookRight - lookLeft,
    gazeY: lookDown - lookUp,
    faceScale,
    headX: nose.x,
    headY: nose.y,
    confidence: Math.max(0, Math.min(1, 1 - blink * 0.7)),
  };
}
