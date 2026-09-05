import type { ResearchAnswer } from "../../types";
import {
  getLocalModelStatus,
  prepareLocalAi,
  type GenerationProgress,
  type LocalModelStatus,
} from "../ai/onDeviceTextGeneration";
import { getHybridRetrievalStatus, prepareHybridRetrieval } from "./hybridRetrieval";
import { runResearchOrchestrator } from "./researchOrchestrator";

export type ResearchAiStatus = LocalModelStatus;
export type ResearchAiProgress = GenerationProgress;

export async function getResearchAiStatus(): Promise<ResearchAiStatus> {
  const localModel = await getLocalModelStatus();
  const retrieval = getHybridRetrievalStatus();
  if (localModel.state === "ready" && retrieval.denseReady && retrieval.rerankerReady) {
    return {
      state: "ready",
      label: "Generation, semantic search, and neural reranking are ready",
      provider: localModel.provider,
    };
  }
  if (localModel.state === "ready") {
    return {
      state: "downloadable",
      label: "Local generation is ready; advanced retrieval can be prepared",
      provider: "transformers-js",
    };
  }
  return localModel;
}

export async function prepareResearchAi(
  signal?: AbortSignal,
  onProgress?: (progress: ResearchAiProgress) => void
): Promise<ResearchAiStatus> {
  onProgress?.({ label: "Preparing hybrid semantic retrieval…", provider: "transformers-js" });
  await prepareHybridRetrieval(onProgress);
  const localModel = await prepareLocalAi(signal, onProgress);
  return {
    state: "ready",
    label: "Advanced local AI is ready",
    provider: localModel.state === "ready" ? localModel.provider : "transformers-js",
  };
}

export async function askLocalResearchAssistant(
  question: string,
  options?: { signal?: AbortSignal; onProgress?: (progress: ResearchAiProgress) => void }
): Promise<ResearchAnswer> {
  return runResearchOrchestrator(question, options);
}
