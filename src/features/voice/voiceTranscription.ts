export type VoiceModelState = "idle" | "loading" | "ready" | "error";

export interface VoiceModelProgress {
  label: string;
  percent?: number;
}

interface TransformersModule {
  pipeline(
    task: "automatic-speech-recognition",
    model: string,
    options?: {
      device?: "webgpu" | "wasm";
      progress_callback?: (progress: Record<string, unknown>) => void;
    },
  ): Promise<SpeechRecognizer>;
}

type SpeechRecognizer = (audio: Float32Array) => Promise<{ text?: string } | Array<{ text?: string }>>;

const TRANSFORMERS_MODULE_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
const WHISPER_MODEL = "onnx-community/whisper-tiny.en";
let recognizerPromise: Promise<SpeechRecognizer> | null = null;
let recognizerReady = false;
let activeDevice: "webgpu" | "wasm" | null = null;

function progressValue(progress: Record<string, unknown>): number | undefined {
  const raw = typeof progress.progress === "number" ? progress.progress : undefined;
  if (raw == null) return undefined;
  return Math.max(0, Math.min(100, Math.round(raw <= 1 ? raw * 100 : raw)));
}

async function createRecognizer(
  device: "webgpu" | "wasm",
  onProgress?: (progress: VoiceModelProgress) => void,
): Promise<SpeechRecognizer> {
  const moduleUrl: string = TRANSFORMERS_MODULE_URL;
  const transformers = await import(/* @vite-ignore */ moduleUrl) as unknown as TransformersModule;
  return transformers.pipeline("automatic-speech-recognition", WHISPER_MODEL, {
    device,
    progress_callback(progress) {
      const status = typeof progress.status === "string" ? progress.status : "loading";
      onProgress?.({
        label: status === "ready" ? "Voice recognition ready." : "Preparing voice recognition…",
        percent: progressValue(progress),
      });
    },
  });
}

export function isVoiceModelReady() {
  return recognizerReady;
}

export function getVoiceModelDevice() {
  return activeDevice;
}

export async function prepareVoiceModel(
  onProgress?: (progress: VoiceModelProgress) => void,
): Promise<{ device: "webgpu" | "wasm" }> {
  if (!recognizerPromise) {
    recognizerPromise = (async () => {
      onProgress?.({ label: "Loading the free local speech runtime…" });
      const supportsWebGpu = typeof navigator !== "undefined" && "gpu" in navigator;
      if (supportsWebGpu) {
        try {
          const recognizer = await createRecognizer("webgpu", onProgress);
          activeDevice = "webgpu";
          recognizerReady = true;
          return recognizer;
        } catch {
          onProgress?.({ label: "WebGPU was unavailable. Retrying with the browser CPU…" });
        }
      }
      const recognizer = await createRecognizer("wasm", onProgress);
      activeDevice = "wasm";
      recognizerReady = true;
      return recognizer;
    })().catch((error) => {
      recognizerPromise = null;
      recognizerReady = false;
      activeDevice = null;
      throw error;
    });
  }
  await recognizerPromise;
  return { device: activeDevice ?? "wasm" };
}

async function decodeAndResample(blob: Blob): Promise<Float32Array> {
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error("This browser cannot decode microphone audio.");
  const context = new AudioContextClass();
  try {
    const decoded = await context.decodeAudioData((await blob.arrayBuffer()).slice(0));
    const outputLength = Math.max(1, Math.ceil(decoded.duration * 16_000));
    const offline = new OfflineAudioContext(1, outputLength, 16_000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return new Float32Array(rendered.getChannelData(0));
  } finally {
    await context.close().catch(() => undefined);
  }
}

export async function transcribeVoiceBlob(
  blob: Blob,
  onProgress?: (progress: VoiceModelProgress) => void,
): Promise<string> {
  if (blob.size < 1_000) throw new Error("The recording was too short to transcribe.");
  await prepareVoiceModel(onProgress);
  const recognizer = await recognizerPromise;
  if (!recognizer) throw new Error("The private speech model is unavailable.");
  onProgress?.({ label: "Processing audio locally…" });
  const audio = await decodeAndResample(blob);
  onProgress?.({ label: "Transcribing privately on this device…" });
  const output = await recognizer(audio);
  const text = Array.isArray(output) ? output[0]?.text : output.text;
  const cleaned = (text ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) throw new Error("No speech was recognized. Try again closer to the microphone.");
  return cleaned;
}
