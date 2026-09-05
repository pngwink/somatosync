import { useMemo, useState, type ReactNode } from "react";
import { Check, Clipboard, HeartHandshake, ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { useToast } from "../../components/shared/Toast";
import { audienceLabel, buildRelayFeedbackCode, isRelayShareExpired, parseRelayShareHash } from "./relayEngine";
import type { RelayFeedbackPayload, RelayFeedbackResponse, RelaySupportResponse } from "./relayTypes";

export function SharedSupportsPage() {
  const toast = useToast();
  const share = useMemo(() => typeof window === "undefined" ? null : parseRelayShareHash(window.location.hash), []);
  const [responses, setResponses] = useState<Record<string, { provided: boolean; response: RelaySupportResponse | null }>>({});
  const [returnCode, setReturnCode] = useState("");

  if (!share) return <StateCard title="This support link is not valid" detail="Ask the person to create a new Recovery Relay link." />;
  if (isRelayShareExpired(share)) return <StateCard title="This support link has expired" detail="Ask the person to create a new temporary link if support is still needed." />;

  function setProvided(id: string, provided: boolean) {
    setResponses((current) => ({ ...current, [id]: { provided, response: provided ? current[id]?.response ?? "not-sure" : null } }));
    setReturnCode("");
  }

  function setResponse(id: string, response: RelaySupportResponse) {
    setResponses((current) => ({ ...current, [id]: { provided: true, response } }));
    setReturnCode("");
  }

  function createFeedback() {
    if (!share) return;
    const payload: RelayFeedbackPayload = {
      version: 1,
      kind: "somatosync-support-feedback",
      shareId: share.shareId,
      audience: share.audience,
      createdAt: new Date().toISOString(),
      responses: share.supports.map((support): RelayFeedbackResponse => ({
        supportId: support.id,
        title: support.title,
        patternTitle: support.patternTitle,
        provided: responses[support.id]?.provided ?? false,
        response: responses[support.id]?.provided ? responses[support.id]?.response ?? "not-sure" : null,
      })),
    };
    setReturnCode(buildRelayFeedbackCode(payload));
  }

  async function copyFeedback() {
    try {
      await navigator.clipboard.writeText(returnCode);
      toast.show({ title: "Return code copied", description: "Send it back to the SomatoSync user to add this feedback to their Recovery Story.", tone: "success" });
    } catch {
      toast.show({ title: "Copy failed", tone: "error" });
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"><HeartHandshake className="h-5 w-5" /></span>
          <div><p className="text-[19px] font-semibold text-[var(--color-text-primary)]">SomatoSync Recovery Relay</p><p className="text-[15px] text-[var(--color-text-secondary)]">Shared with {audienceLabel(share.audience).toLowerCase()}</p></div>
        </div>

        <Card className="p-5 sm:p-7">
          <h1 className="text-[25px] font-semibold tracking-tight text-[var(--color-text-primary)]">Supports that may help right now</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">Only the supports the user chose to share are shown here. This is not a medical clearance or diagnosis.</p>

          <div className="mt-6 space-y-4">
            {share.supports.map((support) => {
              const response = responses[support.id];
              return (
                <div key={support.id} className="rounded-[18px] border border-[var(--color-border)] p-4 sm:p-5">
                  <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">{support.title}</h2>
                  <p className="mt-1.5 text-[15.5px] leading-relaxed text-[var(--color-text-secondary)]">{support.detail}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Choice active={response?.provided === true} onClick={() => setProvided(support.id, true)}>Provided</Choice>
                    <Choice active={response?.provided === false} onClick={() => setProvided(support.id, false)}>Not provided</Choice>
                  </div>
                  {response?.provided && (
                    <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                      <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">What did you notice afterward?</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Choice active={response.response === "helped"} onClick={() => setResponse(support.id, "helped")}>Seemed helpful</Choice>
                        <Choice active={response.response === "no-clear-change"} onClick={() => setResponse(support.id, "no-clear-change")}>No clear change</Choice>
                        <Choice active={response.response === "worse"} onClick={() => setResponse(support.id, "worse")}>Harder to tolerate</Choice>
                        <Choice active={response.response === "not-sure"} onClick={() => setResponse(support.id, "not-sure")}>Not sure</Choice>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!returnCode ? (
            <Button className="mt-6 w-full" onClick={createFeedback}>Create return feedback</Button>
          ) : (
            <div className="mt-6 rounded-[18px] bg-[var(--color-positive-soft)] p-4 sm:p-5">
              <div className="flex items-start gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-positive)]" /><div><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">Feedback ready</p><p className="mt-1 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">Send this return code to the SomatoSync user. It contains only the selections above.</p></div></div>
              <div className="mt-3 max-h-24 overflow-auto rounded-[12px] bg-[var(--color-surface)] p-3 font-mono text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{returnCode}</div>
              <Button className="mt-3 w-full" onClick={copyFeedback}><Clipboard />Copy return code</Button>
            </div>
          )}

          <div className="mt-6 flex items-start gap-2 rounded-[14px] bg-[var(--color-surface-sunken)] p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-positive)]" /><p className="text-[15px] leading-relaxed text-[var(--color-text-secondary)]">No login is required. Raw symptoms, camera data, and assessment scores are not included in this link.</p>
          </div>
        </Card>
      </div>
    </main>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-3.5 py-2 text-[15px] font-medium transition ${active ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)]"}`}>{children}</button>;
}

function StateCard({ title, detail }: { title: string; detail: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4"><Card className="max-w-lg p-7 text-center"><h1 className="text-[22px] font-semibold text-[var(--color-text-primary)]">{title}</h1><p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{detail}</p></Card></main>;
}
