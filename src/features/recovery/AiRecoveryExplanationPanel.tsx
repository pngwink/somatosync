import { useEffect, useMemo, useRef, useState } from "react";
import { BrainCircuit, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Panel } from "../../components/shared/Panel";
import { Disclaimer } from "../../components/shared/Disclaimer";
import type { SymptomGuidanceItem } from "../guidance/guidanceEngine";
import type { RecoveryOutlook } from "../outlook/recoveryOutlook";
import type { RecoveryEvidenceSummary } from "./evidenceSummary";
import {
  buildAiRecoveryPayload,
  buildLocalRecoveryExplanation,
  requestAiRecoveryExplanation,
  type AiGenerationProgress,
  type AiRecoveryExplanation,
} from "./aiRecoveryExplanation";

export function AiRecoveryExplanationPanel({
  evidence,
  outlook,
  guidance,
}: {
  evidence: RecoveryEvidenceSummary;
  outlook: RecoveryOutlook;
  guidance: SymptomGuidanceItem[];
}) {
  const payload = useMemo(() => buildAiRecoveryPayload(evidence, outlook, guidance), [evidence, outlook, guidance]);
  const abortRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "complete">("idle");
  const [explanation, setExplanation] = useState<AiRecoveryExplanation | null>(null);
  const [progress, setProgress] = useState<AiGenerationProgress | null>(null);

  useEffect(() => {
    const previous = abortRef.current;
    abortRef.current = null;
    previous?.abort();
    setExplanation(null);
    setStatus("idle");
    setProgress(null);
    return () => {
      const active = abortRef.current;
      abortRef.current = null;
      active?.abort();
    };
  }, [payload]);

  async function generate() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setProgress({ label: "Preparing recovery explanation…" });
    try {
      const result = await requestAiRecoveryExplanation(payload, controller.signal, setProgress);
      if (!controller.signal.aborted) setExplanation(result);
    } catch (error) {
      if (controller.signal.aborted && abortRef.current !== controller) return;
      const message = controller.signal.aborted
        ? "The local AI request was cancelled."
        : error instanceof Error ? error.message : "On-device AI was unavailable.";
      setExplanation(buildLocalRecoveryExplanation(payload, message));
    } finally {
      setProgress(null);
      if (abortRef.current === controller) setStatus("complete");
    }
  }

  return (
    <Panel
      title="AI recovery explanation"
      description="Turn verified recovery trends into a shorter plain-language summary."
      actions={explanation ? (
        <Badge tone={explanation.provider === "local-fallback" ? "info" : "accent"} showDot>
          {explanation.provider === "chrome-gemini-nano"
            ? "Gemini Nano · on device"
            : explanation.provider === "transformers-js"
              ? "Private AI"
              : "Evidence-based fallback"}
        </Badge>
      ) : <Badge tone="accent" showDot>Private AI</Badge>}
    >
      {!explanation ? (
        <div className="rounded-[16px] bg-[var(--color-surface-sunken)] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"><BrainCircuit className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">Generate a readable summary</h3>
              <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">Transparent rules calculate the facts first. AI only explains the de-identified trends and limitations.</p>
            </div>
          </div>

          <div className="mt-4 rounded-[14px] bg-[var(--color-surface)] p-3.5 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
            The explanation is generated on this device from the recovery evidence SomatoSync already calculated. The model is used to explain the pattern, not to create new medical facts or scores.
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button disabled={status === "loading"} onClick={generate}>
              {status === "loading" ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Building explanation…</> : <><Sparkles className="mr-2 h-4 w-4" />Explain this pattern</>}
            </Button>
            {progress && (
              <p className="text-[16px] text-[var(--color-text-secondary)]">
                {progress.label}{progress.percent != null ? ` ${progress.percent}%` : ""}
              </p>
            )}
            <details className="text-[16px] text-[var(--color-text-secondary)]">
              <summary className="cursor-pointer font-semibold text-[var(--color-accent)]">Privacy details</summary>
              <p className="mt-2 max-w-xl leading-relaxed">Assessment facts stay on this device. The language model only receives the compact evidence summary already calculated in the browser. Raw symptom answers, camera data, landmarks, memory words, names, and email are never provided to the model.</p>
            </details>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[16px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">AI-generated explanation</p>
                <h3 className="mt-1 text-[18px] font-semibold text-[var(--color-text-primary)]">{explanation.headline}</h3>
              </div>
              <div className="text-right text-[16px] text-[var(--color-text-tertiary)]">
                <p>{explanation.model ?? "Evidence-based local engine"}</p>
                <p>{new Date(explanation.generatedAt).toLocaleString()}</p>
              </div>
            </div>
            <p className="mt-3 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">{explanation.overview}</p>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <ExplanationList title="What changed" items={explanation.changes} />
            <ExplanationList title="What to focus on" items={explanation.focusAreas} />
          </div>

          <Card className="p-4">
            <h4 className="text-[16px] font-semibold text-[var(--color-text-primary)]">Uncertainty and data limits</h4>
            <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">{explanation.uncertainty}</p>
          </Card>

          {payload.scientificBasis.length > 0 && (
            <Card className="p-4">
              <h4 className="text-[16px] font-semibold text-[var(--color-text-primary)]">Scientific grounding supplied to the AI</h4>
              <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-tertiary)]">The model receives these source titles and controlled evidence notes; it does not browse the web or invent new citations.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {payload.scientificBasis.map((source) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1.5 text-[16px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]">
                    {source.publisher}<ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </Card>
          )}

          <Disclaimer variant="block">{explanation.safetyNote}</Disclaimer>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => { setExplanation(null); setStatus("idle"); setProgress(null); }}>Clear explanation</Button>
            <Button onClick={generate} disabled={status === "loading"}>
              <RefreshCw className={`mr-2 h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function ExplanationList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="p-4">
      <h4 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{title}</h4>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
