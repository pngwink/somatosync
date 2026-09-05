import { ArrowLeft, QrCode, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/shared/PageHeader";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { RecoveryRelayPanel } from "../features/relay/RecoveryRelayPanel";

export function RecoveryRelayPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recovery Relay"
        title="Share supports"
        context="Create a temporary handoff for a teacher, parent, or coach without exposing the rest of the recovery dashboard."
        actions={<Button variant="secondary" size="sm" asChild><Link to="/app/recovery?tab=plan"><ArrowLeft />Back to plan</Link></Button>}
      />

      <Card className="border-0 bg-[var(--color-positive-soft)] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[var(--color-surface)] text-[var(--color-positive)]"><QrCode className="h-5 w-5" /></span>
          <div>
            <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-text-primary)]">Only share what helps someone support you</h2>
            <p className="mt-2 max-w-3xl text-[15.5px] leading-7 text-[var(--color-text-secondary)]">The recipient sees only the accommodations you select. Raw symptom ratings, camera signals, and assessment scores stay out of the share.</p>
            <div className="mt-3 flex items-center gap-2 text-[14.5px] font-medium text-[var(--color-positive)]"><ShieldCheck className="h-4 w-4" />Temporary, editable, and limited to selected supports</div>
          </div>
        </div>
      </Card>

      <RecoveryRelayPanel />
    </div>
  );
}
