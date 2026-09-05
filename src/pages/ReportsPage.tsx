import { useMemo, useState } from "react";
import { Download, FileText, Lock } from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { Panel } from "../components/shared/Panel";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { ReportPreview } from "../components/reports/ReportPreview";
import { useToast } from "../components/shared/Toast";
import { useAppMode } from "../context/AppModeContext";
import { NewUserEmptyState } from "../components/shared/NewUserEmptyState";
import { buildLiveReportData, type ReportRange } from "../features/reports/reportData";
import { downloadDataExport } from "../features/privacy/privacyExport";

const metricOptions = [
  { id: "summary", label: "Patient summary" },
  { id: "improvements", label: "Improvements and concerns" },
  { id: "assessments", label: "Assessment results table" },
  { id: "questions", label: "Questions for the clinician" },
];

const audienceOptions = [
  { value: "clinician", label: "Clinician" },
  { value: "parent", label: "Parent or caregiver" },
  { value: "school", label: "School" },
  { value: "work", label: "Workplace" },
  { value: "athletic-trainer", label: "Athletic trainer" },
];

export function ReportsPage() {
  const { show } = useToast();
  const { mode, userName } = useAppMode();
  const [audience, setAudience] = useState("clinician");
  const [range, setRange] = useState<ReportRange>("14d");
  const [metrics, setMetrics] = useState<string[]>(metricOptions.map((metric) => metric.id));

  const allData = useMemo(() => buildLiveReportData(mode, userName, "all"), [mode, userName]);
  const data = useMemo(() => buildLiveReportData(mode, userName, range), [mode, userName, range]);
  const rangeLabel = { "7d": "Last 7 days", "14d": "Last 14 days", "30d": "Last 30 days", all: "Entire recovery" }[range];
  const audienceLabel = audienceOptions.find((option) => option.value === audience)?.label ?? "Clinician";

  function toggleMetric(id: string) {
    setMetrics((previous) => previous.includes(id) ? previous.filter((metric) => metric !== id) : [...previous, id]);
  }

  function printReport() {
    const preview = document.getElementById("report-preview");
    if (!preview) return;
    const printWindow = window.open("", "_blank", "width=980,height=760");
    if (!printWindow) {
      show({ title: "Pop-up blocked", description: "Allow pop-ups, then try Print / Save as PDF again.", tone: "error" });
      return;
    }
    try { printWindow.opener = null; } catch { /* Cross-origin browser policy may block this assignment. */ }
    printWindow.document.write(`<!doctype html><html><head><title>SomatoSync report</title><style>
      body{font-family:Segoe UI,Arial,sans-serif;color:#1b2430;margin:32px;line-height:1.45} .rounded\\[var\\(--radius-md\\)\\]{border-radius:6px}
      table{width:100%;border-collapse:collapse;margin-top:12px} th,td{padding:8px;border-bottom:1px solid #d7dee4;text-align:left;font-size:13.5px}
      button,a{display:none!important} .bg-\\[var\\(--color-surface-sunken\\)\\]{background:#f4f6f8} .text-\\[var\\(--color-text-secondary\\)\\]{color:#51606e}
      @page{margin:18mm} @media print{body{margin:0}}
    </style></head><body>${preview.outerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  }

  if (allData.results.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" context="Generate a shareable summary after recovery information has been recorded." />
        <NewUserEmptyState title="No report data yet" description="Complete at least one symptom check-in or assessment, then return here to generate a real report." primaryHref="/app/check-in" primaryLabel="Start a check-in" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" context="Create a printable, real-time summary from the results stored in this account." />

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Panel title="Report options">
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Date range</Label><Select value={range} onValueChange={(value) => setRange(value as ReportRange)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7d">Last 7 days</SelectItem><SelectItem value="14d">Last 14 days</SelectItem><SelectItem value="30d">Last 30 days</SelectItem><SelectItem value="all">Entire recovery</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Audience</Label><Select value={audience} onValueChange={setAudience}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{audienceOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Included sections</Label>{metricOptions.map((metric) => <label key={metric.id} className="flex items-center gap-2.5 text-[16px] text-[var(--color-text-primary)]"><input type="checkbox" checked={metrics.includes(metric.id)} onChange={() => toggleMetric(metric.id)} className="h-3.5 w-3.5 rounded border-[var(--color-border-strong)] accent-[var(--color-accent)]" />{metric.label}</label>)}</div>
          </div>

          <div className="mt-5 space-y-2.5 border-t border-[var(--color-border)] pt-5">
            <Button className="w-full" onClick={printReport}><FileText className="h-4 w-4" /> Print / Save as PDF</Button>
            <Button variant="secondary" className="w-full" onClick={() => { downloadDataExport(); show({ title: "Data downloaded", description: "A local JSON copy of SomatoSync data was created.", tone: "success" }); }}><Download className="h-4 w-4" /> Download raw data</Button>
            <p className="flex items-start gap-1.5 pt-1 text-[16px] leading-snug text-[var(--color-text-tertiary)]"><Lock className="mt-[2px] h-3 w-3 shrink-0" />Reports include health information. Only share with people you trust.</p>
          </div>
        </Panel>

        <ReportPreview audience={audienceLabel} dateRangeLabel={rangeLabel} includedMetrics={metrics} data={data} />
      </div>
    </div>
  );
}
