import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/shared/PageHeader";
import { Panel } from "../components/shared/Panel";
import { AssessmentRow } from "../components/assessments/AssessmentRow";
import { AssessmentRunnerDialog } from "../components/assessments/AssessmentRunnerDialog";
import { assessmentDefinitions, getMostRecentResult } from "../data/assessments";
import { getReactionDashboardRow } from "../features/assessments/reaction/reactionStorage";
import { getPcssDashboardRow } from "../features/assessments/pcss/pcssStorage";
import { getBalanceDashboardRow } from "../features/assessments/balance/balanceStorage";
import { getMemoryDashboardRow } from "../features/assessments/memory/memoryStorage";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { useToast } from "../components/shared/Toast";
import type { AssessmentDefinition } from "../types";
import { useAppMode } from "../context/AppModeContext";
import { loadRecoveryProfile } from "../features/recovery/recoveryProfile";
import { isAcuteRecovery } from "../features/science/recoverySafety";
import { Card } from "../components/ui/card";

export function AssessmentsPage() {
  const [active, setActive] = useState<AssessmentDefinition | null>(null);
  const { show } = useToast();
  const navigate = useNavigate();
  const { mode } = useAppMode();
  const acuteMode = mode === "user" && isAcuteRecovery(loadRecoveryProfile());
  const visibleDefinitions = acuteMode ? assessmentDefinitions.filter((item) => item.id === "symptom-check-in") : assessmentDefinitions;

  function latestResultFor(id: AssessmentDefinition["id"]) {
    if (id === "reaction-time") {
      return getReactionDashboardRow() ?? (mode === "demo" ? getMostRecentResult(id) : undefined);
    }
    if (id === "symptom-check-in") {
      return getPcssDashboardRow() ?? (mode === "demo" ? getMostRecentResult(id) : undefined);
    }
    if (id === "balance") {
      return getBalanceDashboardRow() ?? (mode === "demo" ? getMostRecentResult(id) : undefined);
    }
    if (id === "memory") {
      return getMemoryDashboardRow() ?? (mode === "demo" ? getMostRecentResult(id) : undefined);
    }
    return mode === "demo" ? getMostRecentResult(id) : undefined;
  }

  function handleStart(def: AssessmentDefinition) {
    if (def.id === "reaction-time") {
      navigate("/app/assessments/reaction-time");
      return;
    }
    if (def.id === "symptom-check-in") {
      navigate("/app/assessments/pcss");
      return;
    }
    if (def.id === "balance") {
      navigate("/app/assessments/balance");
      return;
    }
    if (def.id === "memory") {
      navigate("/app/assessments/memory");
      return;
    }
    setActive(def);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assessments & trend tools"
        context="Recognized symptom tracking and experimental trend tools stay clearly separated from diagnosis and medical clearance."
        actions={
          <Button variant="secondary" size="sm" asChild>
            <Link to="/app/calendar">Open recovery calendar</Link>
          </Button>
        }
      />

      {acuteMode && (
        <Card className="border-0 bg-[var(--color-accent-soft)] p-5" data-focus-preserve-text="true">
          <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">You do not need every assessment today</h2>
          <p className="mt-2 text-[16px] leading-7 text-[var(--color-text-secondary)]">During the first 24–48 hours, keep screen interactions brief. A symptom check-in is enough if it is useful; reaction, memory, and camera-based trend tasks can wait.</p>
        </Card>
      )}

      <Panel title={acuteMode ? "Quick symptom check" : "Assessments"} description={acuteMode ? "Keep this brief and stop if the screen becomes hard to tolerate." : "Scan one assessment at a time. Details stay secondary until you need them."}>
        <div className="divide-y divide-[var(--color-border)]">
          {visibleDefinitions.map((def) => (
            <AssessmentRow key={def.id} definition={def} latestResult={latestResultFor(def.id)} onStart={() => handleStart(def)} />
          ))}
        </div>
      </Panel>

      <AssessmentRunnerDialog
        definition={active}
        onOpenChange={(open) => !open && setActive(null)}
        onComplete={() => show({ title: "Result saved", description: `${active?.name} result recorded.`, tone: "success" })}
      />
    </div>
  );
}
