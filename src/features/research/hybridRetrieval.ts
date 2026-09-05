import { researchTopics, type ResearchTopic } from "../../data/research";
import type { GenerationProgress } from "../ai/onDeviceTextGeneration";
import { STOP_WORDS, normalizeResearchText, researchTokens, topicDocument } from "./researchShared";

export interface RetrievalCandidate {
  topic: ResearchTopic;
  bm25Score: number;
  denseScore: number;
  fusionScore: number;
  rerankScore: number | null;
  finalScore: number;
}

export interface HybridRetrievalResult {
  candidates: RetrievalCandidate[];
  mode: "bm25" | "hybrid" | "hybrid-reranked";
  lexicalMs: number;
  denseMs: number;
  rerankMs: number;
  totalMs: number;
}

interface TensorLike {
  data?: Float32Array | number[];
  dims?: number[];
  tolist?: () => unknown;
}

interface FeatureExtractor {
  (input: string | string[], options?: { pooling?: "mean"; normalize?: boolean }): Promise<TensorLike>;
}

interface ClassificationResult {
  label?: string;
  score?: number;
}

interface CrossEncoder {
  (input: Array<{ text: string; text_pair: string }>): Promise<ClassificationResult[]>;
}

interface BatchTokenizer {
  (
    text: string[],
    options: { text_pair: string[]; padding: boolean; truncation: boolean }
  ): Record<string, unknown>;
}

interface SequenceClassifierOutput {
  logits?: TensorLike;
}

interface SequenceClassifier {
  (features: Record<string, unknown>): Promise<SequenceClassifierOutput>;
}

interface TransformersModule {
  pipeline(
    task: "feature-extraction",
    model: string,
    options?: Record<string, unknown>
  ): Promise<FeatureExtractor>;
  AutoTokenizer: {
    from_pretrained(model: string, options?: Record<string, unknown>): Promise<BatchTokenizer>;
  };
  AutoModelForSequenceClassification: {
    from_pretrained(model: string, options?: Record<string, unknown>): Promise<SequenceClassifier>;
  };
}

const TRANSFORMERS_MODULE_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const RERANKER_MODEL = "Xenova/ms-marco-MiniLM-L-6-v2";
const EMBEDDING_CACHE_KEY = "somatosync:research-embeddings:v2";
const RRF_K = 60;

let transformersModulePromise: Promise<TransformersModule> | null = null;
let embeddingPipelinePromise: Promise<FeatureExtractor> | null = null;
let rerankerPipelinePromise: Promise<CrossEncoder> | null = null;
let cachedCorpusEmbeddings: number[][] | null = null;
let denseReady = false;
let rerankerReady = false;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

async function loadTransformersModule(): Promise<TransformersModule> {
  if (!transformersModulePromise) {
    const moduleUrl: string = TRANSFORMERS_MODULE_URL;
    transformersModulePromise = import(/* @vite-ignore */ moduleUrl) as Promise<TransformersModule>;
  }
  return transformersModulePromise;
}

function progressOptions(
  onProgress?: (progress: GenerationProgress) => void,
  stage = "Loading local search model",
  allowWebGpu = true
) {
  return {
    dtype: "q8",
    ...(allowWebGpu && typeof navigator !== "undefined" && "gpu" in navigator ? { device: "webgpu" } : {}),
    progress_callback(progress: Record<string, unknown>) {
      const rawProgress = typeof progress.progress === "number" ? progress.progress : undefined;
      const percent = rawProgress == null
        ? undefined
        : Math.max(0, Math.min(100, Math.round(rawProgress <= 1 ? rawProgress * 100 : rawProgress)));
      onProgress?.({
        label: `${stage}${typeof progress.file === "string" ? ` · ${progress.file}` : ""}`,
        percent,
        provider: "transformers-js",
      });
    },
  };
}

async function getEmbeddingPipeline(onProgress?: (progress: GenerationProgress) => void): Promise<FeatureExtractor> {
  if (!embeddingPipelinePromise) {
    embeddingPipelinePromise = (async () => {
      const transformers = await loadTransformersModule();
      try {
        return await transformers.pipeline(
          "feature-extraction",
          EMBEDDING_MODEL,
          progressOptions(onProgress, "Downloading MiniLM semantic search")
        );
      } catch {
        return transformers.pipeline("feature-extraction", EMBEDDING_MODEL, {
          ...progressOptions(onProgress, "Downloading MiniLM semantic search", false),
        });
      }
    })().then((pipeline) => {
      denseReady = true;
      return pipeline;
    }).catch((error) => {
      embeddingPipelinePromise = null;
      denseReady = false;
      throw error;
    });
  }
  return embeddingPipelinePromise;
}

async function getRerankerPipeline(onProgress?: (progress: GenerationProgress) => void): Promise<CrossEncoder> {
  if (!rerankerPipelinePromise) {
    rerankerPipelinePromise = (async () => {
      const transformers = await loadTransformersModule();
      const tokenizer = await transformers.AutoTokenizer.from_pretrained(
        RERANKER_MODEL,
        progressOptions(onProgress, "Downloading neural reranker tokenizer", false)
      );

      let model: SequenceClassifier;
      try {
        model = await transformers.AutoModelForSequenceClassification.from_pretrained(
          RERANKER_MODEL,
          progressOptions(onProgress, "Downloading neural reranker")
        );
      } catch {
        model = await transformers.AutoModelForSequenceClassification.from_pretrained(
          RERANKER_MODEL,
          progressOptions(onProgress, "Downloading neural reranker", false)
        );
      }

      const encoder: CrossEncoder = async (pairs) => {
        const features = tokenizer(
          pairs.map((pair) => pair.text),
          {
            text_pair: pairs.map((pair) => pair.text_pair),
            padding: true,
            truncation: true,
          }
        );
        const output = await model(features);
        const matrix = tensorToMatrix(output.logits ?? {}, pairs.length);
        return pairs.map((_pair, index) => {
          const raw = matrix[index]?.[0] ?? 0;
          const score = 1 / (1 + Math.exp(-raw));
          return { label: "RELEVANCE", score };
        });
      };
      return encoder;
    })().then((pipeline) => {
      rerankerReady = true;
      return pipeline;
    }).catch((error) => {
      rerankerPipelinePromise = null;
      rerankerReady = false;
      throw error;
    });
  }
  return rerankerPipelinePromise;
}

function tensorToMatrix(tensor: TensorLike, expectedRows: number): number[][] {
  if (tensor.tolist) {
    const listed = tensor.tolist();
    if (Array.isArray(listed) && Array.isArray(listed[0])) {
      return (listed as unknown[][]).map((row) => row.map((value) => Number(value)));
    }
    if (Array.isArray(listed)) return [(listed as unknown[]).map((value) => Number(value))];
  }

  const flat = tensor.data ? Array.from(tensor.data, Number) : [];
  if (!flat.length) return [];
  const rows = tensor.dims?.[0] ?? expectedRows;
  const columns = Math.max(1, Math.floor(flat.length / rows));
  return Array.from({ length: rows }, (_, rowIndex) => flat.slice(rowIndex * columns, (rowIndex + 1) * columns));
}

function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude > 0 ? vector.map((value) => value / magnitude) : vector;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    aNorm += a[index] * a[index];
    bNorm += b[index] * b[index];
  }
  const denominator = Math.sqrt(aNorm) * Math.sqrt(bNorm);
  return denominator > 0 ? dot / denominator : 0;
}

function readEmbeddingCache(): number[][] | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(EMBEDDING_CACHE_KEY) ?? "null") as {
      model?: string;
      topicIds?: string[];
      vectors?: number[][];
    } | null;
    const topicIds = researchTopics.map((topic) => topic.id);
    if (
      parsed?.model === EMBEDDING_MODEL
      && JSON.stringify(parsed.topicIds) === JSON.stringify(topicIds)
      && Array.isArray(parsed.vectors)
      && parsed.vectors.length === researchTopics.length
    ) {
      return parsed.vectors;
    }
  } catch {
    // A corrupt or unavailable local cache is safe to ignore.
  }
  return null;
}

function writeEmbeddingCache(vectors: number[][]): void {
  try {
    localStorage.setItem(EMBEDDING_CACHE_KEY, JSON.stringify({
      model: EMBEDDING_MODEL,
      topicIds: researchTopics.map((topic) => topic.id),
      vectors,
    }));
  } catch {
    // Private browsing or storage quotas may prevent caching; retrieval still works.
  }
}

async function getCorpusEmbeddings(onProgress?: (progress: GenerationProgress) => void): Promise<number[][]> {
  if (cachedCorpusEmbeddings) return cachedCorpusEmbeddings;
  const fromStorage = readEmbeddingCache();
  if (fromStorage) {
    cachedCorpusEmbeddings = fromStorage;
    denseReady = true;
    return fromStorage;
  }

  const extractor = await getEmbeddingPipeline(onProgress);
  onProgress?.({ label: "Indexing the local concussion evidence library…", provider: "transformers-js" });
  const documents = researchTopics.map(topicDocument);
  const tensor = await extractor(documents, { pooling: "mean", normalize: true });
  const vectors = tensorToMatrix(tensor, documents.length).map(normalizeVector);
  if (vectors.length !== documents.length) throw new Error("The local embedding index returned an unexpected shape.");
  cachedCorpusEmbeddings = vectors;
  writeEmbeddingCache(vectors);
  return vectors;
}

interface Bm25Stats {
  termFrequencies: Map<string, number>[];
  documentLengths: number[];
  documentFrequency: Map<string, number>;
  averageDocumentLength: number;
}

function lexicalTokenSequence(value: string): string[] {
  return normalizeResearchText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function buildBm25Stats(): Bm25Stats {
  const documentTokens = researchTopics.map((topic) => lexicalTokenSequence(topicDocument(topic)));
  const termFrequencies = documentTokens.map((values) => {
    const frequencies = new Map<string, number>();
    values.forEach((value) => frequencies.set(value, (frequencies.get(value) ?? 0) + 1));
    return frequencies;
  });
  const documentFrequency = new Map<string, number>();
  termFrequencies.forEach((frequencies) => {
    frequencies.forEach((_count, term) => documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1));
  });
  const documentLengths = documentTokens.map((values) => values.length);
  const averageDocumentLength = documentLengths.reduce((sum, length) => sum + length, 0) / Math.max(1, documentLengths.length);
  return { termFrequencies, documentLengths, documentFrequency, averageDocumentLength };
}

const BM25_STATS = buildBm25Stats();

function bm25Scores(query: string): number[] {
  const queryTerms = researchTokens(query);
  const documentCount = researchTopics.length;
  const k1 = 1.5;
  const b = 0.75;

  return researchTopics.map((_topic, documentIndex) => {
    const frequencies = BM25_STATS.termFrequencies[documentIndex];
    const documentLength = BM25_STATS.documentLengths[documentIndex];
    return queryTerms.reduce((score, term) => {
      const frequency = frequencies.get(term) ?? 0;
      if (!frequency) return score;
      const documentsWithTerm = BM25_STATS.documentFrequency.get(term) ?? 0;
      const idf = Math.log(1 + (documentCount - documentsWithTerm + 0.5) / (documentsWithTerm + 0.5));
      const numerator = frequency * (k1 + 1);
      const denominator = frequency + k1 * (1 - b + b * documentLength / Math.max(1, BM25_STATS.averageDocumentLength));
      return score + idf * numerator / denominator;
    }, 0);
  });
}

function rankPositions(scores: number[]): number[] {
  const sorted = scores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score);
  const positions = Array<number>(scores.length).fill(scores.length);
  sorted.forEach((entry, rank) => { positions[entry.index] = rank + 1; });
  return positions;
}

async function denseScores(
  query: string,
  onProgress?: (progress: GenerationProgress) => void
): Promise<number[]> {
  const extractor = await getEmbeddingPipeline(onProgress);
  const corpus = await getCorpusEmbeddings(onProgress);
  const tensor = await extractor(query, { pooling: "mean", normalize: true });
  const queryVector = normalizeVector(tensorToMatrix(tensor, 1)[0] ?? []);
  return corpus.map((vector) => cosineSimilarity(queryVector, vector));
}

async function rerank(
  query: string,
  candidates: RetrievalCandidate[],
  onProgress?: (progress: GenerationProgress) => void
): Promise<RetrievalCandidate[]> {
  const reranker = await getRerankerPipeline(onProgress);
  onProgress?.({ label: "Neurally reranking the strongest evidence passages…", provider: "transformers-js" });
  const inputs = candidates.map((candidate) => ({ text: query, text_pair: topicDocument(candidate.topic) }));
  const output = await reranker(inputs);
  return candidates.map((candidate, index) => ({
    ...candidate,
    rerankScore: Number.isFinite(output[index]?.score) ? Number(output[index]?.score) : 0,
    finalScore: Number.isFinite(output[index]?.score)
      ? 0.35 * candidate.fusionScore + 0.65 * Number(output[index]?.score)
      : candidate.fusionScore,
  })).sort((a, b) => b.finalScore - a.finalScore);
}

export async function prepareHybridRetrieval(
  onProgress?: (progress: GenerationProgress) => void
): Promise<void> {
  await getCorpusEmbeddings(onProgress);
  await getRerankerPipeline(onProgress);
  onProgress?.({ label: "Hybrid search and neural reranking are ready.", percent: 100, provider: "transformers-js" });
}

export function getHybridRetrievalStatus(): { denseReady: boolean; rerankerReady: boolean } {
  return { denseReady, rerankerReady };
}

export async function retrieveResearchEvidence(
  query: string,
  options?: {
    onProgress?: (progress: GenerationProgress) => void;
    useDense?: boolean;
    useReranker?: boolean;
    candidateLimit?: number;
    resultLimit?: number;
  }
): Promise<HybridRetrievalResult> {
  const started = now();
  const lexicalStarted = now();
  const lexical = bm25Scores(query);
  const lexicalMs = now() - lexicalStarted;

  let dense = Array<number>(researchTopics.length).fill(0);
  let denseMs = 0;
  let mode: HybridRetrievalResult["mode"] = "bm25";

  if (options?.useDense !== false) {
    const denseStarted = now();
    try {
      dense = await denseScores(query, options?.onProgress);
      denseMs = now() - denseStarted;
      mode = "hybrid";
    } catch {
      denseMs = now() - denseStarted;
    }
  }

  const lexicalRanks = rankPositions(lexical);
  const denseRanks = rankPositions(dense);
  const candidates = researchTopics.map((topic, index): RetrievalCandidate => {
    const lexicalRrf = 1 / (RRF_K + lexicalRanks[index]);
    const denseRrf = mode === "hybrid" ? 1 / (RRF_K + denseRanks[index]) : 0;
    const phraseBoost = topic.questionPatterns.some((pattern) => normalizeResearchText(query).includes(normalizeResearchText(pattern))) ? 0.025 : 0;
    const fusionScore = lexicalRrf + denseRrf + phraseBoost;
    return {
      topic,
      bm25Score: lexical[index],
      denseScore: dense[index],
      fusionScore,
      rerankScore: null,
      finalScore: fusionScore,
    };
  }).sort((a, b) => b.finalScore - a.finalScore);

  const candidateLimit = options?.candidateLimit ?? 8;
  const resultLimit = options?.resultLimit ?? 4;
  let selected = candidates.slice(0, candidateLimit);
  let rerankMs = 0;

  if (options?.useReranker !== false && mode === "hybrid") {
    const rerankStarted = now();
    try {
      selected = await rerank(query, selected, options?.onProgress);
      rerankMs = now() - rerankStarted;
      mode = "hybrid-reranked";
    } catch {
      rerankMs = now() - rerankStarted;
    }
  }

  return {
    candidates: selected.slice(0, resultLimit),
    mode,
    lexicalMs,
    denseMs,
    rerankMs,
    totalMs: now() - started,
  };
}
