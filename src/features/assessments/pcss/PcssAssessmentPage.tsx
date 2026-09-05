import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Info, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/shared/PageHeader";
import { Panel } from "../../../components/shared/Panel";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { SymptomSlider } from "../../../components/forms/SymptomSlider";
import { Disclaimer } from "../../../components/shared/Disclaimer";
import { useToast } from "../../../components/shared/Toast";
import {
  calculatePcssSummary,
  createEmptyPcssRatings,
  PCSS_MAX_TOTAL_SCORE,
  pcssCategoryLabels,
  pcssSymptoms,
  topPcssSymptoms,
} from "./pcssData";
import { getPcssDashboardRow, savePcssAssessment } from "./pcssStorage";
import { buildSymptomGuidance } from "../../guidance/guidanceEngine";
import type { AssessmentResult } from "../../../types";
import type { PcssCategory, PcssRatings, PcssSymptomId } from "./pcssTypes";

const categoryOrder: PcssCategory[] = ["physical", "sleep", "emotional", "cognitive"];

export function PcssAssessmentPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [ratings, setRatings] = useState<PcssRatings>(createEmptyPcssRatings);
  const [saved, setSaved] = useState(false);
  const [savedResult, setSavedResult] = useState<AssessmentResult | null>(null);
  const [guidanceTitles, setGuidanceTitles] = useState<string[]>([]);

  const summary = useMemo(() => calculatePcssSummary(ratings), [ratings]);
  const topSymptoms = useMemo(() => topPcssSymptoms(ratings), [ratings]);

  function update(id: PcssSymptomId, value: number) {
    setRatings((previous) => ({ ...previous, [id]: value }));
  }

  function save() {
    const recorded = savePcssAssessment(ratings);
    setSavedResult(getPcssDashboardRow());
    setGuidanceTitles(buildSymptomGuidance(recorded).slice(0, 3).map((item) => item.title));
    setSaved(true);
    show({
      title: "PCSS symptom assessment saved",
      description: `${summary.symptomCount} symptoms reported · severity total ${summary.totalSeverity} of ${PCSS_MAX_TOTAL_SCORE}.`,
      tone: "success",
    });
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 py-6">
        <Card className="p-7">
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="h-10 w-10 text-[var(--color-positive)]" aria-hidden="true" />
            <h1 className="mt-3 text-[19px] font-semibold text-[var(--color-text-primary)]">Symptom assessment recorded</h1>
            <p className="mt-1 text-[14.5px] text-[var(--color-text-secondary)]">
              Total severity: <span className="font-mono font-semibold">{summary.totalSeverity} / {PCSS_MAX_TOTAL_SCORE}</span> across {summary.symptomCount} reported symptoms.
            </p>
            {savedResult?.interpretationLabel && (
              <div className="mt-3">
                <Badge tone={savedResult.interpretationTone ?? "neutral"} showDot>
                  {savedResult.interpretationLabel}
                </Badge>
                <p className="mt-1 max-w-xl text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
                  {savedResult.interpretationDetail}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {categoryOrder.map((category) => (
              <div key={category} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5">
                <p className="text-[14.5px] text-[var(--color-text-tertiary)]">{pcssCategoryLabels[category]}</p>
                <p className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {summary.categoryTotals[category]}
                </p>
              </div>
            ))}
          </div>

          {guidanceTitles.length > 0 && (
            <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
              <p className="text-[14.5px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Guidance triggered by this entry</p>
              <ul className="mt-2 space-y-1.5 text-[14px] text-[var(--color-text-secondary)]">
                {guidanceTitles.map((title) => <li key={title}>• {title}</li>)}
              </ul>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate("/app/return-support")}>View explanations and sources</Button>
            </div>
          )}

          {topSymptoms.length > 0 && (
            <div className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] p-4">
              <p className="text-[14.5px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">Highest reported today</p>
              <div className="mt-2 space-y-1.5">
                {topSymptoms.map((symptom) => (
                  <div key={symptom.id} className="flex items-center justify-between text-[14px]">
                    <span className="text-[var(--color-text-secondary)]">{symptom.label}</span>
                    <span className="font-mono tabular-nums text-[var(--color-text-primary)]">{symptom.score} / 6</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Disclaimer variant="block" className="mt-5">
            This symptom total is one recovery measure. It does not diagnose concussion, determine readiness, or replace evaluation by a qualified healthcare professional.
          </Disclaimer>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => navigate("/app/assessments")}>Back to assessments</Button>
            <Button variant="secondary" onClick={() => navigate("/app/progress")}>View progress</Button>
            <Button onClick={() => navigate("/app/return-support")}>Open recovery guidance</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Post-Concussion Symptom Scale"
        context="Rate 22 symptoms based on how you feel now. Each item uses the PCSS 0–6 severity format."
      />

      <Card className="border-[var(--color-accent-soft-border)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[14px] font-semibold text-[var(--color-text-primary)]">Prefer to speak instead of moving 22 sliders?</p><p className="mt-1 text-[14.5px] text-[var(--color-text-secondary)]">The private conversational check-in understands natural language, proposes explained symptom scores, and lets you confirm everything before saving.</p></div>
          <Button variant="secondary" size="sm" onClick={() => navigate("/app/assessments/voice-check-in")}><Mic />Use voice check-in</Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-info)]" aria-hidden="true" />
          <div className="text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">
            <p>
              <strong className="font-medium text-[var(--color-text-primary)]">Evidence format:</strong> 0 means not present and 6 means severe; the 22-item total ranges from 0 to 132. This prototype follows the NIH FITBIR PCSS data structure and is not a digital administration of the full SCAT6.
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <a className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline" href="https://fitbir.nih.gov/dictionary/publicData/dataStructureAction%21view.action?dataStructureName=PCSS&publicArea=true&style.key=fitbir-style" target="_blank" rel="noreferrer">
                NIH FITBIR PCSS <ExternalLink className="h-3 w-3" />
              </a>
              <a className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline" href="https://www.concussioninsportgroup.com/scat-tools/" target="_blank" rel="noreferrer">
                CISG concussion tools <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </Card>

      {categoryOrder.map((category) => (
        <Panel
          key={category}
          title={pcssCategoryLabels[category]}
          description="Rate how you feel right now: 0 = not present, 6 = severe."
        >
          <div className="divide-y divide-[var(--color-border)]">
            {pcssSymptoms.filter((symptom) => symptom.category === category).map((symptom) => (
              <SymptomSlider
                key={symptom.id}
                id={`pcss-${symptom.id}`}
                label={symptom.label}
                value={ratings[symptom.id]}
                onChange={(value) => update(symptom.id, value)}
                max={6}
              />
            ))}
          </div>
        </Panel>
      ))}

      <div className="sticky bottom-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-med)] backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[14.5px] text-[var(--color-text-tertiary)]">Current symptom severity</p>
            <p className="font-mono text-[17px] font-semibold tabular-nums text-[var(--color-text-primary)]">
              {summary.totalSeverity} / {PCSS_MAX_TOTAL_SCORE}
              <span className="ml-2 font-sans text-[14.5px] font-normal text-[var(--color-text-secondary)]">{summary.symptomCount} symptoms</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/app/assessments")}>Cancel</Button>
            <Button onClick={save}>Save assessment</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
