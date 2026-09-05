import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Bot,
  CheckCircle2,
  Cpu,
  Download,
  Eraser,
  FlaskConical,
  LoaderCircle,
  Search,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { Panel } from "../components/shared/Panel";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Disclaimer } from "../components/shared/Disclaimer";
import { SourceCitation } from "../components/assistant/SourceCitation";
import { LoadingState } from "../components/shared/AsyncStates";
import { sampleQuestions } from "../data/research";
import type { ResearchAnswer } from "../types";
import {
  askLocalResearchAssistant,
  getResearchAiStatus,
  prepareResearchAi,
  type ResearchAiProgress,
  type ResearchAiStatus,
} from "../features/research/researchEngine";
import { runResearchEvaluation, type ResearchEvaluationResult } from "../features/research/researchEvaluation";

const INITIAL_AI_STATUS: ResearchAiStatus = { state: "checking", label: "Preparing research assistant…" };

export function ResearchAssistantPage() {
  const abortRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [preparingAi, setPreparingAi] = useState(false);
  const [history, setHistory] = useState<ResearchAnswer[]>([]);
  const [feedback, setFeedback] = useState<Record<string, "up" | "down">>({});
  const [aiStatus, setAiStatus] = useState<ResearchAiStatus>(INITIAL_AI_STATUS);
  const [aiProgress, setAiProgress] = useState<ResearchAiProgress | null>(null);
  const [evaluation, setEvaluation] = useState<ResearchEvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const latestAnswer = history.at(-1) ?? null;

  const sourceCount = useMemo(() => latestAnswer?.sources.length ?? 0, [latestAnswer]);

  useEffect(() => {
    let active = true;
    void getResearchAiStatus().then((status) => {
      if (active) setAiStatus(status);
    });
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, []);

  async function prepareAi() {
    if (preparingAi || loading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPreparingAi(true);
    setAiProgress({ label: "Preparing research assistant…" });
    try {
      const status = await prepareResearchAi(controller.signal, (progress) => {
        setAiProgress(progress);
        setAiStatus({
          state: "downloading",
          label: progress.label,
          provider: progress.provider ?? "transformers-js",
          percent: progress.percent,
        });
      });
      if (!controller.signal.aborted) setAiStatus(status);
    } catch {
      if (!controller.signal.aborted) {
        setAiStatus({ state: "unavailable", label: "Local model could not be prepared; evidence fallback remains available" });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setPreparingAi(false);
      setAiProgress(null);
    }
  }

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading || preparingAi) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPendingQuestion(trimmed);
    setQuery("");
    setLoading(true);
    setAiProgress({ label: "Retrieving relevant evidence…" });
    try {
      const result = await askLocalResearchAssistant(trimmed, {
        signal: controller.signal,
        onProgress: (progress) => setAiProgress(progress),
      });
      if (!controller.signal.aborted) {
        setHistory((current) => [...current, result]);
        setAiStatus(await getResearchAiStatus());
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setPendingQuestion("");
      setLoading(false);
      setAiProgress(null);
    }
  }


  async function runEvaluation() {
    if (evaluating || loading || preparingAi) return;
    setEvaluating(true);
    setAiProgress({ label: "Starting the local AI evaluation suite…" });
    try {
      const result = await runResearchEvaluation((progress) => setAiProgress(progress));
      setEvaluation(result);
      setAiStatus(await getResearchAiStatus());
    } finally {
      setEvaluating(false);
      setAiProgress(null);
    }
  }

  function clearConversation() {
    setQuery("");
    setPendingQuestion("");
    setHistory([]);
    setFeedback({});
  }

  const aiReady = aiStatus.state === "ready";
  const aiWorking = aiStatus.state === "downloading" || preparingAi;
  const assistantStatusLabel = aiWorking ? "Preparing private assistant…" : aiReady ? "Private assistant ready" : "Evidence search ready";

  return (
    <div className="space-y-5">
      <PageHeader title="Research Assistant" context="Ask a recovery question and inspect the evidence behind the answer." />

      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-positive)]/20 bg-[var(--color-positive-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-positive)]">
            {aiWorking ? <LoaderCircle className="h-4 w-4 animate-spin" /> : aiReady ? <Cpu className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">{assistantStatusLabel}</p>
            <p className="mt-0.5 text-[14.5px] text-[var(--color-text-secondary)]">
              {aiReady
                ? "Ask a recovery question and SomatoSync will answer from the evidence library with sources you can inspect."
                : "Evidence search works now. You can optionally prepare fuller private answers for this device."}
            </p>
            {aiProgress?.percent != null && (
              <p className="mt-1 text-[14.5px] font-medium text-[var(--color-positive)]">{aiProgress.percent}% downloaded</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!aiReady && (
            <Button variant="secondary" size="sm" onClick={() => void prepareAi()} disabled={preparingAi || loading}>
              {preparingAi ? <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
              Prepare fuller answers
            </Button>
          )}
          <details className="text-[14.5px] text-[var(--color-text-secondary)]">
            <summary className="cursor-pointer font-semibold text-[var(--color-positive)]">Privacy details</summary>
            <p className="mt-2 max-w-xl leading-relaxed">
              The optional answer generator can run privately after a one-time setup. Questions clear when you leave this page, and the assistant cannot read camera or assessment data.
            </p>
          </details>
        </div>
      </div>

      <div className={"space-y-6"}>
        <Panel
          title="Ask a question"
          description="Answers are grounded in a curated concussion evidence library."
          actions={
            history.length > 0 ? (
              <button
                type="button"
                onClick={clearConversation}
                className="flex items-center gap-1.5 text-[14.5px] font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              >
                <Eraser className="h-3.5 w-3.5" /> Clear chat
              </button>
            ) : undefined
          }
        >
          {history.length === 0 && !loading && (
            <div className="mb-5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-4">
              <div className="flex items-start gap-2.5">
                <Bot className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                <div>
                  <p className="text-[14.5px] font-semibold text-[var(--color-text-primary)]">Ask in your own words</p>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
                    BM25 and semantic search retrieve evidence, a local cross-encoder reranks it, and a verifier checks the generated answer before display.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {sampleQuestions.slice(0, 4).map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void ask(question)}
                    className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-left text-[14.5px] text-[var(--color-accent)] hover:border-[var(--color-accent-soft-border)] hover:bg-[var(--color-accent-soft)]"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-[560px] space-y-5 overflow-y-auto pr-1" aria-live="polite">
            {history.map((answer) => (
              <ResearchExchange
                key={answer.id}
                answer={answer}
                feedback={feedback[answer.id] ?? null}
                onFeedback={(value) => setFeedback((current) => ({ ...current, [answer.id]: value }))}
              />
            ))}

            {loading && (
              <div className="space-y-3">
                <div className="ml-auto max-w-[85%] rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] px-4 py-3">
                  <div className="flex items-start gap-2">
                    <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                    <p className="text-[14px] leading-relaxed text-[var(--color-text-primary)]">{pendingQuestion}</p>
                  </div>
                </div>
                <div className="max-w-[90%] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
                  <LoadingState label={aiProgress?.label ?? "Searching the local evidence library"} />
                  {aiProgress?.percent != null && <p className="mt-2 text-center text-[14.5px] text-[var(--color-text-tertiary)]">{aiProgress.percent}%</p>}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              void ask(query);
            }}
            className="mt-5 flex gap-2 border-t border-[var(--color-border)] pt-5"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
              <Input
                value={query}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                placeholder="Ask about symptoms, balance, school, screens, or return to sport"
                className="pl-9"
                aria-label="Ask a research question"
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={!query.trim() || loading || preparingAi}>Ask</Button>
          </form>
          <p className="mt-2 text-[14.5px] text-[var(--color-text-tertiary)]">
            Session-only chat · local generation when available · no paid cloud API
          </p>
        </Panel>

        {latestAnswer && (
          <Panel
            title="Sources"
            description={`${sourceCount} cited source${sourceCount === 1 ? "" : "s"}`}
          >
            <div className="space-y-2.5">
              {latestAnswer.sources.map((source) => <SourceCitation key={source.id} source={source} />)}
            </div>
          </Panel>
        )}
      </div>

      <details className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14.5px] text-[var(--color-text-secondary)] shadow-[var(--shadow-low)]">
        <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)]">AI Evaluation Lab</summary>
        <div className="mt-3 space-y-4">
          <p className="max-w-3xl leading-relaxed">
            Run the fixed local benchmark to measure retrieval quality, safety routing, and latency on this device. Results are computed live and are never prefilled.
          </p>
          <Button variant="secondary" size="sm" onClick={() => void runEvaluation()} disabled={evaluating || loading || preparingAi}>
            {evaluating ? <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="mr-2 h-3.5 w-3.5" />}
            {evaluating ? "Running evaluation…" : "Run local evaluation"}
          </Button>
          {evaluation && (
            <div className="grid gap-3 sm:grid-cols-2">
              <EvaluationMetric label="Recall@3" value={`${Math.round(evaluation.recallAt3 * 100)}%`} />
              <EvaluationMetric label="MRR" value={evaluation.meanReciprocalRank.toFixed(2)} />
              <EvaluationMetric label="Safety routing" value={`${Math.round(evaluation.safetyRoutingAccuracy * 100)}%`} />
              <EvaluationMetric label="p95 retrieval" value={`${evaluation.p95LatencyMs} ms`} />
            </div>
          )}
          {evaluation && (
            <p className="text-[14.5px] text-[var(--color-text-tertiary)]">
              {evaluation.retrievalCases} retrieval cases · {evaluation.safetyCases} safety cases · {evaluation.failures.length} failed check{evaluation.failures.length === 1 ? "" : "s"} · completed {new Date(evaluation.completedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </details>

      <details className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14.5px] text-[var(--color-text-secondary)] shadow-[var(--shadow-low)]">
        <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)]">How the assistant protects privacy</summary>
        <div className="mt-3 space-y-3">
          <p><strong className="text-[var(--color-text-primary)]">Local pipeline:</strong> embeddings, reranking, Gemini Nano or FLAN-T5, and verification run on the device after model downloads.</p>
          <p><strong className="text-[var(--color-text-primary)]">No record access:</strong> symptom, camera, and assessment records remain separate from this chat.</p>
          <p><strong className="text-[var(--color-text-primary)]">Verified fallback:</strong> unsafe, ungrounded, urgent, or model-failed answers are replaced with controlled evidence.</p>
        </div>
      </details>
    </div>
  );
}


function EvaluationMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-3">
      <p className="text-[14.5px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">{label}</p>
      <p className="mt-1 text-[18px] font-semibold text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}

function ResearchExchange({
  answer,
  feedback,
  onFeedback,
}: {
  answer: ResearchAnswer;
  feedback: "up" | "down" | null;
  onFeedback: (value: "up" | "down") => void;
}) {
  return (
    <div className="space-y-3">
      <div className="ml-auto max-w-[85%] rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] px-4 py-3">
        <div className="flex items-start gap-2">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
          <p className="text-[14px] leading-relaxed text-[var(--color-text-primary)]">{answer.question}</p>
        </div>
      </div>

      <div className="max-w-[92%] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[14.5px] font-medium text-[var(--color-accent)]">
            <Bot className="h-3.5 w-3.5" /> {answer.retrievalLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-positive-soft)] px-2.5 py-1 text-[14.5px] font-medium text-[var(--color-positive)]">
            <CheckCircle2 className="h-3.5 w-3.5" /> {answer.confidenceLabel}
          </span>
        </div>

        <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">{answer.answer}</p>
        <Disclaimer variant="inline" className="mt-4" />

        {(answer.orchestrationTrace || answer.retrievalDetails || answer.verification) && (
          <details className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[14.5px] text-[var(--color-text-secondary)]">
            <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)]">Why this answer was shown</summary>
            {answer.retrievalDetails && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[var(--color-accent)]">{answer.retrievalDetails.mode}</span>
                <span className="rounded-full bg-[var(--color-surface-sunken)] px-2.5 py-1">{answer.retrievalDetails.totalMs} ms retrieval</span>
                <span className="rounded-full bg-[var(--color-surface-sunken)] px-2.5 py-1">{answer.retrievalDetails.selectedTopicIds.length} evidence topics</span>
              </div>
            )}
            {answer.verification && (
              <div className="mt-3 flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-positive-soft)] p-2.5 text-[var(--color-positive)]">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {answer.verification.passed
                    ? `${answer.verification.groundedClaims}/${answer.verification.totalClaims} claims passed grounding and medical-boundary checks.`
                    : `Generated wording was blocked: ${answer.verification.blockedReason ?? "verification failed"}`}
                </span>
              </div>
            )}
            {answer.orchestrationTrace && (
              <ol className="mt-3 space-y-2">
                {answer.orchestrationTrace.map((step, index) => (
                  <li key={`${answer.id}_${step.node}_${index}`} className="flex gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-[14.5px] font-semibold">{index + 1}</span>
                    <span><strong className="text-[var(--color-text-primary)]">{step.node}</strong> · {step.detail} <span className="text-[var(--color-text-tertiary)]">({step.durationMs} ms)</span></span>
                  </li>
                ))}
              </ol>
            )}
          </details>
        )}

        <div className="mt-4 flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
          <span className="text-[14.5px] text-[var(--color-text-tertiary)]">Helpful?</span>
          <button
            type="button"
            onClick={() => onFeedback("up")}
            className={`p-1.5 ${feedback === "up" ? "text-[var(--color-positive)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"}`}
            aria-label="Helpful"
            aria-pressed={feedback === "up"}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onFeedback("down")}
            className={`p-1.5 ${feedback === "down" ? "text-[var(--color-risk)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"}`}
            aria-label="Not helpful"
            aria-pressed={feedback === "down"}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
          <span className="ml-auto text-[14.5px] text-[var(--color-text-tertiary)]">General information only</span>
        </div>
      </div>
    </div>
  );
}
