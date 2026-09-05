import { useMemo, useState } from "react";
import { Check, Link2, QrCode, ShieldCheck, Users, X } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { useToast } from "../../components/shared/Toast";
import { useAppMode } from "../../context/AppModeContext";
import { saveRecoveryMemoryEvent } from "../recovery-memory/recoveryMemoryStorage";
import { audienceLabel, buildRelayShareUrlInfo, buildSuggestedRelaySupports, createRelaySharePayload, parseRelayFeedbackCode } from "./relayEngine";
import { endRelayShare, hasRelayShare, loadRelayShares, saveRelayShare } from "./relayStorage";
import { QRCodeBlock } from "./QRCodeBlock";
import type { RelayAudience, RelaySharePayload, RelaySupport } from "./relayTypes";

const demoSupports: RelaySupport[] = [
  { id: "demo-read", title: "Larger, easier-to-read material", detail: "Use larger text or a printed/zoomed version for sustained reading.", patternTitle: "Readability adjustments", source: "response-memory" },
  { id: "demo-noise", title: "Use a quieter work space", detail: "Reduce unnecessary background noise during focused work or testing.", patternTitle: "Quieter environment", source: "symptom-pattern" },
  { id: "demo-chunk", title: "Chunk demanding work", detail: "Break longer assignments into smaller steps with extra processing time between sections.", patternTitle: "Lower reading load", source: "symptom-pattern" },
];

export function RecoveryRelayPanel() {
  const { mode } = useAppMode();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const suggested = useMemo(() => mode === "demo" ? demoSupports : buildSuggestedRelaySupports(), [mode, revision]);
  const [audience, setAudience] = useState<RelayAudience>("teacher");
  const [durationHours, setDurationHours] = useState(24);
  const [selected, setSelected] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, { title: string; detail: string }>>({});
  const [share, setShare] = useState<RelaySharePayload | null>(null);
  const [feedbackCode, setFeedbackCode] = useState("");
  const [latestShareRevision, setLatestShareRevision] = useState(0);

  const currentSupports = suggested.slice(0, 4);
  const latestShare = useMemo(() => loadRelayShares().find((item) => !item.endedAt) ?? null, [latestShareRevision]);

  function openShare() {
    setSelected(currentSupports.slice(0, 3).map((support) => support.id));
    setEdits(Object.fromEntries(currentSupports.map((support) => [support.id, { title: support.title, detail: support.detail }])));
    setShare(null);
    setOpen(true);
  }

  function toggle(id: string) {
    setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : items.length >= 4 ? items : [...items, id]);
  }

  function generateShare() {
    const supports = suggested
      .filter((support) => selected.includes(support.id))
      .map((support) => ({ ...support, title: edits[support.id]?.title.trim() || support.title, detail: edits[support.id]?.detail.trim() || support.detail }))
      .filter((support) => support.title.length > 0)
      .slice(0, 4);
    if (supports.length === 0) return;
    const payload = createRelaySharePayload({ audience, supports, durationHours });
    saveRelayShare(payload);
    setLatestShareRevision((value) => value + 1);
    setShare(payload);
  }

  async function copyText(value: string, message: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.show({ title: message, tone: "success" });
    } catch {
      toast.show({ title: "Copy failed", description: "Select the text and copy it manually.", tone: "error" });
    }
  }

  function importFeedback() {
    const payload = parseRelayFeedbackCode(feedbackCode);
    if (!payload) {
      toast.show({ title: "That feedback code is not valid", tone: "error" });
      return;
    }
    if (!hasRelayShare(payload.shareId) && mode !== "demo") {
      toast.show({ title: "This feedback does not match a share created on this device", tone: "error" });
      return;
    }
    saveRecoveryMemoryEvent({
      id: `relay_feedback_${payload.shareId}_${payload.createdAt}`,
      kind: "caregiver-feedback",
      completedAt: payload.createdAt,
      audience: payload.audience,
      shareId: payload.shareId,
      responses: payload.responses,
    });
    setFeedbackCode("");
    setImportOpen(false);
    setRevision((value) => value + 1);
    toast.show({ title: "Feedback added to your Recovery Story", tone: "success" });
  }

  function endLatestShare() {
    if (!latestShare) return;
    endRelayShare(latestShare.shareId);
    setLatestShareRevision((value) => value + 1);
    toast.show({ title: "Share ended on this device", tone: "success" });
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"><Users className="h-5 w-5" /></span>
          <div>
            <h2 className="text-[19px] font-semibold text-[var(--color-text-primary)]">Current supports</h2>
            <p className="mt-1 max-w-2xl text-[16px] leading-relaxed text-[var(--color-text-secondary)]">Share only the few accommodations someone needs to help right now.</p>
          </div>
        </div>
        <Button onClick={openShare} disabled={currentSupports.length === 0} className="sm:shrink-0"><QrCode />Share supports</Button>
      </div>

      {currentSupports.length > 0 ? (
        <div className="mt-5 divide-y divide-[var(--color-border)] rounded-[16px] bg-[var(--color-surface-sunken)] px-4 sm:px-5">
          {currentSupports.slice(0, 3).map((support) => (
            <div key={support.id} className="py-4">
              <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{support.title}</p>
              <p className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">{support.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[16px] bg-[var(--color-surface-sunken)] p-4">
          <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">No support pattern yet</p>
          <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">A check-in or a completed adaptive-reading follow-up can give SomatoSync something useful to suggest here.</p>
        </div>
      )}


      <details className="mt-4 rounded-[14px] border border-[var(--color-border)] px-4 py-3">
        <summary className="cursor-pointer text-[16px] font-semibold text-[var(--color-accent)]">Manage sharing and feedback</summary>
        <div className="mt-3 flex flex-col gap-3">
          {latestShare && (
            <div className="flex flex-col gap-3 rounded-[14px] bg-[var(--color-surface-sunken)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">Active {audienceLabel(latestShare.audience).toLowerCase()} share</p><p className="mt-0.5 text-[16px] text-[var(--color-text-secondary)]">Expires {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(latestShare.expiresAt))}</p></div>
              <Button variant="ghost" size="sm" onClick={endLatestShare}><X />End share here</Button>
            </div>
          )}
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild><Button variant="secondary" size="sm" className="self-start">Import support feedback</Button></DialogTrigger>
            <DialogContent>
              <DialogTitle>Import support feedback</DialogTitle>
              <DialogDescription>Paste the return code created by the teacher, parent, or coach. It adds only their support feedback to Response Memory.</DialogDescription>
              <Textarea className="mt-4 min-h-28" value={feedbackCode} onChange={(event) => setFeedbackCode(event.target.value)} placeholder="SOMATOSYNC-FEEDBACK..." />
              <Button className="mt-4 w-full" onClick={importFeedback} disabled={!feedbackCode.trim()}>Add feedback</Button>
            </DialogContent>
          </Dialog>
        </div>
      </details>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto p-5 sm:p-6">
          {!share ? (
            <>
              <DialogTitle>Share current supports</DialogTitle>
              <DialogDescription>Choose the audience and edit exactly what they can see. Raw symptoms, camera signals, and assessment scores are not included.</DialogDescription>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="text-[16px] font-semibold text-[var(--color-text-primary)]">For
                  <select className="mt-2 h-11 w-full rounded-[12px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[16px]" value={audience} onChange={(event) => setAudience(event.target.value as RelayAudience)}>
                    <option value="teacher">Teacher / school</option><option value="parent">Parent / caregiver</option><option value="coach">Coach / trainer</option>
                  </select>
                </label>
                <label className="text-[16px] font-semibold text-[var(--color-text-primary)]">Link expires in
                  <select className="mt-2 h-11 w-full rounded-[12px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[16px]" value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))}>
                    <option value={2}>2 hours</option><option value={24}>24 hours</option><option value={72}>3 days</option>
                  </select>
                </label>
              </div>

              <div className="mt-5 space-y-3">
                {suggested.map((support) => {
                  const active = selected.includes(support.id);
                  return (
                    <div key={support.id} className={`rounded-[16px] border p-4 ${active ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/35" : "border-[var(--color-border)]"}`}>
                      <button type="button" onClick={() => toggle(support.id)} className="flex w-full items-center gap-3 text-left">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${active ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : "border-[var(--color-border-strong)]"}`}>{active && <Check className="h-4 w-4" />}</span>
                        <span className="text-[16px] font-semibold text-[var(--color-text-primary)]">{support.title}</span>
                      </button>
                      {active && (
                        <div className="mt-3 space-y-2 pl-9">
                          <Input value={edits[support.id]?.title ?? support.title} onChange={(event) => setEdits((current) => ({ ...current, [support.id]: { title: event.target.value, detail: current[support.id]?.detail ?? support.detail } }))} aria-label="Support title" />
                          <Textarea className="min-h-20 text-[16px]" value={edits[support.id]?.detail ?? support.detail} onChange={(event) => setEdits((current) => ({ ...current, [support.id]: { title: current[support.id]?.title ?? support.title, detail: event.target.value } }))} maxLength={180} aria-label="Support detail" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex items-start gap-2 rounded-[14px] bg-[var(--color-surface-sunken)] p-3.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-positive)]" />
                <p className="text-[16px] leading-relaxed text-[var(--color-text-secondary)]">The link contains only these selected supports, the audience type, and an expiration time.</p>
              </div>
              <Button className="mt-5 w-full" onClick={generateShare} disabled={selected.length === 0}>Create temporary share</Button>
            </>
          ) : (
            <ShareReady payload={share} onCopy={copyText} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ShareReady({ payload, onCopy }: { payload: RelaySharePayload; onCopy: (value: string, message: string) => void }) {
  const shareUrl = buildRelayShareUrlInfo(payload);
  const url = shareUrl.url;
  return (
    <>
      <DialogTitle>Share is ready</DialogTitle>
      <DialogDescription>{audienceLabel(payload.audience)} will see only {payload.supports.length} selected support{payload.supports.length === 1 ? "" : "s"}. The link expires automatically.</DialogDescription>
      {!shareUrl.crossDeviceReady && (
        <div className="mt-4 rounded-[14px] border border-[var(--color-caution)]/35 bg-[var(--color-caution-soft)] p-4">
          <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">Phone scanning needs a public or network-accessible URL</p>
          <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">This share currently points to localhost, which only works on this computer. Before a cross-device demo, set <code className="rounded bg-[var(--color-surface)] px-1.5 py-0.5">VITE_PUBLIC_APP_URL</code> to your deployed SomatoSync URL and restart the app.</p>
        </div>
      )}
      <div className="mt-5 grid gap-5 sm:grid-cols-[220px_1fr] sm:items-start">
        <QRCodeBlock value={url} />
        <div>
          <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">What they can see</p>
          <div className="mt-3 space-y-2">
            {payload.supports.map((support) => <div key={support.id} className="rounded-[14px] bg-[var(--color-surface-sunken)] p-3"><p className="text-[16px] font-semibold text-[var(--color-text-primary)]">{support.title}</p></div>)}
          </div>
          <Button className="mt-4 w-full" onClick={() => onCopy(url, "Share link copied")}><Link2 />Copy link</Button>
          <p className="mt-3 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">Expires {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(payload.expiresAt))}.</p>
        </div>
      </div>
      <details className="mt-4 rounded-[14px] border border-[var(--color-border)] px-4 py-3 text-[16px] text-[var(--color-text-secondary)]">
        <summary className="cursor-pointer font-semibold text-[var(--color-text-primary)]">Sharing privacy</summary>
        <p className="mt-2 leading-relaxed">This prototype uses a self-contained, time-limited link so no account or cloud health record is required. Ending the share removes it from this browser and blocks feedback imports here; a link already copied can still be opened until its expiration.</p>
      </details>
    </>
  );
}
