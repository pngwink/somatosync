import type { NeuroAdaptiveSessionSummary, StrainFeatureVector } from "./neuroAdaptiveTypes";

const TFJS_URL = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/+esm";

interface TensorLike {
  data: () => Promise<Float32Array | Int32Array | Uint8Array>;
  dispose: () => void;
}

interface ModelLike {
  add: (layer: unknown) => void;
  compile: (config: Record<string, unknown>) => void;
  fit: (xs: TensorLike, ys: TensorLike, config: Record<string, unknown>) => Promise<unknown>;
  predict: (input: TensorLike) => TensorLike | TensorLike[];
  dispose: () => void;
}

interface TfLike {
  sequential: () => ModelLike;
  layers: { dense: (config: Record<string, unknown>) => unknown };
  train: { adam: (learningRate?: number) => unknown };
  tensor2d: (values: number[] | number[][], shape?: [number, number]) => TensorLike;
}

let tfPromise: Promise<TfLike> | null = null;
let cachedSignature = "";
let cachedModel: ModelLike | null = null;

async function loadTf(): Promise<TfLike> {
  if (!tfPromise) {
    tfPromise = import(/* @vite-ignore */ TFJS_URL)
      .then((module) => module as unknown as TfLike)
      .catch((error) => {
        tfPromise = null;
        throw error;
      });
  }
  return tfPromise;
}

function labeledExamples(sessions: NeuroAdaptiveSessionSummary[]) {
  return sessions
    .filter((session): session is NeuroAdaptiveSessionSummary & { featureVector: StrainFeatureVector; userConfirmedPrompt: boolean } =>
      Array.isArray(session.featureVector) && session.featureVector.length === 7 && typeof session.userConfirmedPrompt === "boolean")
    .slice(0, 40);
}

export function getTensorFlowTrainingStatus(sessions: NeuroAdaptiveSessionSummary[]) {
  const examples = labeledExamples(sessions);
  const positives = examples.filter((example) => example.userConfirmedPrompt).length;
  const negatives = examples.length - positives;
  return {
    exampleCount: examples.length,
    canTrain: examples.length >= 6 && positives >= 2 && negatives >= 2,
  };
}

function signatureFor(examples: ReturnType<typeof labeledExamples>) {
  return examples
    .map((example) => `${example.id}:${example.userConfirmedPrompt ? 1 : 0}:${example.featureVector.map((value) => value.toFixed(3)).join(",")}`)
    .join("|");
}

async function getOrTrainModel(tf: TfLike, examples: ReturnType<typeof labeledExamples>): Promise<ModelLike> {
  const signature = signatureFor(examples);
  if (cachedModel && cachedSignature === signature) return cachedModel;
  cachedModel?.dispose();

  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 1, inputShape: [7], activation: "sigmoid", kernelRegularizer: undefined }));
  model.compile({ optimizer: tf.train.adam(0.035), loss: "binaryCrossentropy" });

  const xs = tf.tensor2d(examples.map((example) => [...example.featureVector]));
  const ys = tf.tensor2d(examples.map((example) => [example.userConfirmedPrompt ? 1 : 0]));
  try {
    await model.fit(xs, ys, { epochs: 45, batchSize: Math.min(8, examples.length), shuffle: true, verbose: 0 });
  } finally {
    xs.dispose();
    ys.dispose();
  }
  cachedModel = model;
  cachedSignature = signature;
  return model;
}

export async function predictConfirmedStrain(
  sessions: NeuroAdaptiveSessionSummary[],
  features: StrainFeatureVector,
): Promise<{ probability: number | null; trained: boolean; exampleCount: number }> {
  const examples = labeledExamples(sessions);
  const status = getTensorFlowTrainingStatus(sessions);
  if (!status.canTrain) return { probability: null, trained: false, exampleCount: status.exampleCount };

  try {
    const tf = await loadTf();
    const model = await getOrTrainModel(tf, examples);
    const input = tf.tensor2d([[...features]], [1, 7]);
    try {
      const output = model.predict(input);
      const tensor = Array.isArray(output) ? output[0] : output;
      const values = await tensor.data();
      tensor.dispose();
      const probability = Number(values[0]);
      return { probability: Number.isFinite(probability) ? Math.max(0, Math.min(1, probability)) : null, trained: true, exampleCount: status.exampleCount };
    } finally {
      input.dispose();
    }
  } catch {
    return { probability: null, trained: false, exampleCount: status.exampleCount };
  }
}
