import { researchSources, researchTopics, type ResearchTopic } from "../../data/research";
import type { ResearchSource } from "../../types";

export const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "because", "but", "can", "could", "did", "do", "does", "for", "from", "had", "has", "have", "how", "i", "if", "in", "is", "it", "me", "my", "of", "on", "or", "should", "that", "the", "this", "to", "was", "what", "when", "where", "why", "with", "would", "you", "your",
]);

export const SYNONYMS: Record<string, string[]> = {
  dizzy: ["balance", "vestibular", "unstable"],
  dizziness: ["balance", "vestibular", "unstable"],
  class: ["school", "learning"],
  homework: ["school", "learning"],
  exam: ["school", "test", "learning"],
  practice: ["sport", "exercise"],
  game: ["sport", "play"],
  phone: ["screen", "visual"],
  computer: ["screen", "visual"],
  laptop: ["screen", "computer", "visual"],
  tablet: ["screen", "visual"],
  ready: ["readiness", "clearance"],
  score: ["metrics", "assessment"],
  tired: ["fatigue", "rest"],
  job: ["work", "workplace"],
  emergency: ["danger", "urgent"],
};

export function normalizeResearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s.%'-]/g, " ").replace(/\s+/g, " ").trim();
}

export function researchTokens(value: string, expandSynonyms = true): string[] {
  const base = normalizeResearchText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  const expanded = expandSynonyms ? base.flatMap((token) => [token, ...(SYNONYMS[token] ?? [])]) : base;
  return [...new Set(expanded)];
}

export function topicDocument(topic: ResearchTopic): string {
  return `${topic.title}. ${topic.answer} Keywords: ${topic.keywords.join(", ")}. Common questions: ${topic.questionPatterns.join("; ")}.`;
}

export function topicsByIds(ids: string[]): ResearchTopic[] {
  return ids
    .map((id) => researchTopics.find((topic) => topic.id === id))
    .filter((topic): topic is ResearchTopic => Boolean(topic));
}

export function sourcesForTopics(topics: ResearchTopic[], limit = 5): ResearchSource[] {
  const ids = [...new Set(topics.flatMap((topic) => topic.sourceIds))];
  return ids
    .map((id) => researchSources.find((source) => source.id === id))
    .filter((source): source is ResearchSource => Boolean(source))
    .slice(0, limit);
}
