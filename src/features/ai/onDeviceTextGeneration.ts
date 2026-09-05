export type OnDeviceProvider = "chrome-gemini-nano" | "transformers-js";
export type ChromeAvailability = "available" | "downloadable" | "downloading" | "unavailable" | "unsupported";
export type LocalModelStatus =
  | { state: "checking"; label: string }
  | { state: "ready"; label: string; provider: OnDeviceProvider }
  | { state: "downloadable"; label: string; provider: OnDeviceProvider }
  | { state: "downloading"; label: string; provider: OnDeviceProvider; percent?: number }
  | { state: "unavailable"; label: string };

export interface GenerationProgress {
  label: string;
  percent?: number;
  provider?: OnDeviceProvider;
}

export interface GeneratedText {
  text: string;
  provider: OnDeviceProvider;
  model: string;
}

interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy?: () => void;
}

interface LanguageModelApi {
  availability(options?: LanguageModelOptions): Promise<"available" | "downloadable" | "downloading" | "unavailable">;
  create(options?: LanguageModelOptions): Promise<LanguageModelSession>;
}

interface LanguageModelOptions {
  expectedInputs?: Array<{ type: "text"; languages: string[] }>;
  expectedOutputs?: Array<{ type: "text"; languages: string[] }>;
  monitor?: (monitor: { addEventListener(type: "downloadprogress", listener: (event: { loaded: number }) => void): void }) => void;
}

interface TransformersModule {
  pipeline(
    task: "text2text-generation",
    model: string,
    options?: { progress_callback?: (progress: Record<string, unknown>) => void }
  ): Promise<Text2TextGenerator>;
}

type Text2TextGenerator = (
  input: string,
  options?: { max_new_tokens?: number; do_sample?: boolean; temperature?: number }
) => Promise<Array<{ generated_text?: string }>>;

const LANGUAGE_MODEL_OPTIONS: LanguageModelOptions = {
  expectedInputs: [{ type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

const TRANSFORMERS_MODULE_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
const TRANSFORMERS_MODEL = "Xenova/flan-t5-small";

let chromeSessionPromise: Promise<LanguageModelSession> | null = null;
let transformersPipelinePromise: Promise<Text2TextGenerator> | null = null;
let transformersReady = false;

function getLanguageModelApi(): LanguageModelApi | null {
  const candidate = (globalThis as typeof globalThis & { LanguageModel?: LanguageModelApi }).LanguageModel;
  return candidate ?? null;
}

function cleanGeneratedText(value: string, maxLength = 1800): string {
  return value
    .replace(/^\s*(answer|summary|recovery explanation)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("On-device AI timed out.")), timeoutMs);
    const onAbort = () => reject(new DOMException("The request was cancelled.", "AbortError"));
    signal?.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => {
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    });
  });
}

export async function getChromeAiAvailability(): Promise<ChromeAvailability> {
  const api = getLanguageModelApi();
  if (!api) return "unsupported";
  try {
    return await api.availability(LANGUAGE_MODEL_OPTIONS);
  } catch {
    return "unavailable";
  }
}

async function getChromeSession(
  signal?: AbortSignal,
  onProgress?: (progress: GenerationProgress) => void
): Promise<LanguageModelSession | null> {
  const api = getLanguageModelApi();
  if (!api) return null;

  const availability = await getChromeAiAvailability();
  // Do not make a user wait inside a question while Chrome downloads a large model.
  // The reliable cross-browser path is Transformers.js unless Gemini Nano is already ready.
  if (availability !== "available") return null;

  if (!chromeSessionPromise) {
    chromeSessionPromise = api.create({
      ...LANGUAGE_MODEL_OPTIONS,
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", (event) => {
          const percent = Math.max(0, Math.min(100, Math.round(event.loaded * 100)));
          onProgress?.({
            label: "Downloading Chrome's local Gemini Nano model…",
            percent,
            provider: "chrome-gemini-nano",
          });
        });
      },
    }).catch((error) => {
      chromeSessionPromise = null;
      throw error;
    });
  }

  try {
    return await withTimeout(chromeSessionPromise, 150_000, signal);
  } catch {
    return null;
  }
}

async function loadTransformersPipeline(
  signal?: AbortSignal,
  onProgress?: (progress: GenerationProgress) => void
): Promise<Text2TextGenerator> {
  if (!transformersPipelinePromise) {
    transformersPipelinePromise = (async () => {
      onProgress?.({ label: "Loading the free Transformers.js runtime…", provider: "transformers-js" });
      const moduleUrl: string = TRANSFORMERS_MODULE_URL;
      const transformers = await import(/* @vite-ignore */ moduleUrl) as unknown as TransformersModule;
      const pipeline = await transformers.pipeline("text2text-generation", TRANSFORMERS_MODEL, {
        progress_callback(progress) {
          const rawProgress = typeof progress.progress === "number" ? progress.progress : undefined;
          const percent = rawProgress == null
            ? undefined
            : Math.max(0, Math.min(100, Math.round(rawProgress <= 1 ? rawProgress * 100 : rawProgress)));
          const status = typeof progress.status === "string" ? progress.status : "loading";
          onProgress?.({
            label: status === "ready" ? "Free local model ready." : "Downloading the free local language model…",
            percent,
            provider: "transformers-js",
          });
        },
      });
      transformersReady = true;
      return pipeline;
    })().catch((error) => {
      transformersPipelinePromise = null;
      transformersReady = false;
      throw error;
    });
  }
  return withTimeout(transformersPipelinePromise, 300_000, signal);
}

export async function getLocalModelStatus(): Promise<LocalModelStatus> {
  const chrome = await getChromeAiAvailability();
  if (chrome === "available") {
    return { state: "ready", label: "Gemini Nano is ready on this device", provider: "chrome-gemini-nano" };
  }
  if (chrome === "downloadable" || chrome === "downloading") {
    return {
      state: "downloadable",
      label: "Chrome AI is not ready; prepare the free Transformers.js model",
      provider: "transformers-js",
    };
  }
  if (transformersReady) {
    return { state: "ready", label: "Transformers.js local model is ready", provider: "transformers-js" };
  }
  return {
    state: "downloadable",
    label: "A free Transformers.js model can be downloaded",
    provider: "transformers-js",
  };
}

export async function prepareLocalAi(
  signal?: AbortSignal,
  onProgress?: (progress: GenerationProgress) => void
): Promise<LocalModelStatus> {
  const chrome = await getChromeAiAvailability();
  if (chrome === "available") {
    onProgress?.({ label: "Preparing Gemini Nano…", provider: "chrome-gemini-nano" });
    const session = await getChromeSession(signal, onProgress);
    if (session) return { state: "ready", label: "Gemini Nano is ready on this device", provider: "chrome-gemini-nano" };
  }

  await loadTransformersPipeline(signal, onProgress);
  return { state: "ready", label: "Transformers.js local model is ready", provider: "transformers-js" };
}

async function tryChrome(
  prompt: string,
  signal?: AbortSignal,
  onProgress?: (progress: GenerationProgress) => void,
  maxLength = 1800
): Promise<GeneratedText | null> {
  const session = await getChromeSession(signal, onProgress);
  if (!session) return null;
  try {
    onProgress?.({ label: "Generating privately with Gemini Nano…", provider: "chrome-gemini-nano" });
    const raw = await withTimeout(session.prompt(prompt), 60_000, signal);
    const text = cleanGeneratedText(raw, maxLength);
    if (!text) return null;
    return { text, provider: "chrome-gemini-nano", model: "Gemini Nano (Chrome built-in AI)" };
  } catch {
    return null;
  }
}

async function tryTransformers(
  prompt: string,
  signal?: AbortSignal,
  onProgress?: (progress: GenerationProgress) => void,
  maxLength = 1800,
  maxNewTokens = 180
): Promise<GeneratedText | null> {
  try {
    const generator = await loadTransformersPipeline(signal, onProgress);
    onProgress?.({ label: "Generating privately with Transformers.js…", provider: "transformers-js" });
    const output = await withTimeout(
      generator(prompt, { max_new_tokens: maxNewTokens, do_sample: false, temperature: 0.2 }),
      120_000,
      signal
    );
    const text = cleanGeneratedText(output[0]?.generated_text ?? "", maxLength);
    if (!text) return null;
    return { text, provider: "transformers-js", model: "FLAN-T5 Small via Transformers.js" };
  } catch {
    return null;
  }
}

export async function generateOnDeviceText(
  prompt: string,
  options?: {
    signal?: AbortSignal;
    onProgress?: (progress: GenerationProgress) => void;
    maxLength?: number;
    maxNewTokens?: number;
  }
): Promise<GeneratedText | null> {
  const generated = await tryChrome(
    prompt,
    options?.signal,
    options?.onProgress,
    options?.maxLength
  );
  if (generated) return generated;

  return tryTransformers(
    prompt,
    options?.signal,
    options?.onProgress,
    options?.maxLength,
    options?.maxNewTokens
  );
}
