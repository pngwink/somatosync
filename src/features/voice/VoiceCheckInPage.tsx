import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  Mic,
  MicOff,
  Pencil,
  RotateCcw,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/shared/PageHeader";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Disclaimer } from "../../components/shared/Disclaimer";
import { useToast } from "../../components/shared/Toast";
import {
  pcssCategoryLabels,
  pcssSymptoms,
  calculatePcssSummary,
  createEmptyPcssRatings,
} from "../assessments/pcss/pcssData";
import { savePcssAssessment } from "../assessments/pcss/pcssStorage";
import type { PcssCategory, PcssRatings, PcssSymptomId } from "../assessments/pcss/pcssTypes";
import { extractVoiceSymptoms, type VoiceExtractionResult } from "./voiceSymptomExtraction";
import {
  isVoiceModelReady,
  prepareVoiceModel,
  transcribeVoiceBlob,
  type VoiceModelProgress,
} from "./voiceTranscription";

const MAX_RECORD_SECONDS = 45;
type PageStep = "intro" | "record" | "review" | "saved";
const categories: PcssCategory[] = ["physical", "sleep", "cognitive", "emotional"];

function severityLabel(value: number) {
  if (value === 0) return "Not present";
  if (value <= 2) return "Mild";
  if (value <= 4) return "Moderate";
  return "Severe";
}

function confidenceTone(confidence: "high" | "medium" | "low") {
  if (confidence === "high") return "positive" as const;
  if (confidence === "medium") return "info" as const;
  return "caution" as const;
}

function ScoreStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-2" aria-label={`Severity ${value} out of 6`}>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[17px] font-semibold hover:border-[var(--color-accent)]" aria-label="Decrease severity">−</button>
      <div className="min-w-[96px] rounded-[12px] bg-[var(--color-surface-sunken)] px-3 py-2 text-center">
        <p className="text-[15px] font-semibold tabular-nums">{value} / 6</p>
        <p className="text-[14.5px] text-[var(--color-text-secondary)]">{severityLabel(value)}</p>
      </div>
      <button type="button" onClick={() => onChange(Math.min(6, value + 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[17px] font-semibold hover:border-[var(--color-accent)]" aria-label="Increase severity">+</button>
    </div>
  );
}

export function VoiceCheckInPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [step, setStep] = useState<PageStep>("intro");
  const [modelReady, setModelReady] = useState(isVoiceModelReady());
  const [modelBusy, setModelBusy] = useState(false);
  const [progress, setProgress] = useState<VoiceModelProgress | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [extraction, setExtraction] = useState<VoiceExtractionResult>({ symptoms: [], activityContexts: [], dangerSigns: [] });
  const [ratings, setRatings] = useState<PcssRatings>(createEmptyPcssRatings);
  const [savedTotal, setSavedTotal] = useState<number | null>(null);
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const detectedIds = useMemo(() => new Set(extraction.symptoms.map((symptom) => symptom.id)), [extraction.symptoms]);
  const summary = useMemo(() => calculatePcssSummary(ratings), [ratings]);

  useEffect(() => () => {
    if (timerRef.current != null) window.clearInterval(timerRef.current);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function prepareModel() {
    if (modelBusy || modelReady) return;
    setError("");
    setModelBusy(true);
    try {
      await prepareVoiceModel((next) => setProgress({ percent: next.percent, label: "Getting your voice check-in ready…" }));
      setModelReady(true);
      setProgress({ label: "Ready to listen.", percent: 100 });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Voice check-in could not be prepared.");
    } finally {
      setModelBusy(false);
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function startRecording() {
    setError("");
    if (!modelReady) {
      await prepareModel();
      if (!isVoiceModelReady()) return;
    }
    setStep("record");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser does not support microphone recording. Use current Chrome or Edge on localhost or HTTPS.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      setRecordSeconds(0);
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onerror = () => setError("The microphone recording stopped unexpectedly.");
      recorder.onstop = () => {
        if (timerRef.current != null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        void processRecording(blob);
      };
      recorder.start(250);
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((current) => {
          const next = current + 1;
          if (next >= MAX_RECORD_SECONDS) window.setTimeout(stopRecording, 0);
          return next;
        });
      }, 1_000);
    } catch (caught) {
      setError(caught instanceof DOMException && caught.name === "NotAllowedError"
        ? "Microphone permission was blocked. Allow microphone access and try again."
        : caught instanceof Error ? caught.message : "The microphone could not start.");
    }
  }

  async function processRecording(blob: Blob) {
    setProcessing(true);
    setProgress({ label: "Turning what you said into a check-in…" });
    setError("");
    try {
      const text = await transcribeVoiceBlob(blob, (next) => setProgress({ percent: next.percent, label: "Understanding your check-in…" }));
      setTranscript(text);
      analyzeTranscript(text);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The local transcription failed.");
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  }

  function analyzeTranscript(text: string) {
    setConfirmedReview(false);
    const result = extractVoiceSymptoms(text);
    const nextRatings = createEmptyPcssRatings();
    for (const symptom of result.symptoms) nextRatings[symptom.id] = symptom.severity;
    setExtraction(result);
    setRatings(nextRatings);
    setStep("review");
  }

  function updateRating(id: PcssSymptomId, value: number) {
    setConfirmedReview(false);
    setRatings((current) => ({ ...current, [id]: value }));
  }

  function save() {
    if (extraction.dangerSigns.length > 0 || !confirmedReview) return;
    const result = savePcssAssessment(ratings, { source: "voice", activityContexts: extraction.activityContexts });
    setSavedTotal(result.totalSeverity);
    setStep("saved");
    show({ title: "Conversational check-in saved", description: "Only confirmed symptom ratings and activity tags were stored.", tone: "success" });
  }

  function restart() {
    setStep("intro");
    setTranscript("");
    setExtraction({ symptoms: [], activityContexts: [], dangerSigns: [] });
    setRatings(createEmptyPcssRatings());
    setConfirmedReview(false);
    setError("");
  }

  if (step === "saved") {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <Card className="p-7 text-center">
          <CheckCircle2 className="mx-auto h-11 w-11 text-[var(--color-positive)]" />
          <h1 className="mt-4 text-[22px] font-semibold">Voice check-in saved</h1>
          <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">Confirmed PCSS severity: {savedTotal} / 132. The recording and transcript were discarded.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={restart}><RotateCcw />New voice check-in</Button>
            <Button onClick={() => navigate("/app/recovery")}>View recovery summary</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <PageHeader
        eyebrow="Conversational check-in"
        title="Talk through your check-in"
        context="Describe how you have felt, what you were doing, and what made symptoms better or worse. You will review every tentative symptom score before anything is saved."
      />

      {step === "intro" && (
        <Card className="p-6 sm:p-8">
          <div className="flex gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"><Sparkles className="h-5 w-5" /></span>
            <div className="max-w-2xl">
              <p className="text-[18px] font-semibold">How has today felt?</p>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">Talk normally about what you noticed, what you were doing, and what made things easier or harder. SomatoSync will turn that into a draft check-in for you to review.</p>
            </div>
          </div>
          {modelBusy && progress?.percent != null && (
            <p className="mt-4 text-[14.5px] font-medium text-[var(--color-accent)]">Getting ready · {progress.percent}%</p>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={() => void startRecording()} disabled={modelBusy}><Mic />{modelBusy ? "Getting ready…" : "Start voice check-in"}</Button>
            <Button variant="secondary" onClick={() => navigate("/app/assessments/pcss")}>Type it instead</Button>
          </div>
        </Card>
      )}

      {step === "record" && (
        <Card className="p-7 text-center sm:p-9">
          <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${recording ? "animate-pulse bg-[var(--color-risk-soft)] text-[var(--color-risk)]" : "bg-[var(--color-surface-sunken)] text-[var(--color-accent)]"}`}>
            {processing ? <LoaderCircle className="h-8 w-8 animate-spin" /> : recording ? <Mic className="h-8 w-8" /> : <Volume2 className="h-8 w-8" />}
          </div>
          <h2 className="mt-4 text-[20px] font-semibold">{processing ? "Understanding what you said" : recording ? "Listening…" : "Ready"}</h2>
          <p className="mx-auto mt-2 max-w-xl text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{processing ? progress?.label ?? "Understanding your check-in" : `Talk naturally for up to ${MAX_RECORD_SECONDS} seconds · ${recordSeconds}s`}</p>
          <div className="mt-5 flex justify-center gap-2">
            {recording ? <Button variant="destructive" onClick={stopRecording}><MicOff />Stop and analyze</Button> : !processing && <Button onClick={() => void startRecording()}><Mic />Record again</Button>}
            {!processing && <Button variant="ghost" onClick={() => setStep("intro")}>Cancel</Button>}
          </div>
        </Card>
      )}

      {step === "review" && (
        <div className="space-y-4">
          {extraction.dangerSigns.length > 0 && (
            <Card className="border-[var(--color-risk)]/40 bg-[var(--color-risk-soft)] p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-risk)]" />
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--color-risk)]">Possible urgent danger-sign language detected</h2>
                  <p className="mt-1 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">If any listed sign is actually happening, seek urgent medical evaluation rather than relying on this app. Correct the transcript only when the recognition was wrong.</p>
                  <div className="mt-3 flex flex-wrap gap-2">{extraction.dangerSigns.map((sign) => <Badge key={sign} tone="risk">{sign}</Badge>)}</div>
                  <a href="https://www.cdc.gov/heads-up/signs-symptoms/index.html" target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[14px] font-semibold text-[var(--color-risk)] underline">Open CDC danger signs</a>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-5 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="mt-2 text-[20px] font-semibold">Review and correct your check-in</h2>
                <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-secondary)]">SomatoSync turned what you said into tentative symptom ratings and context. Change any number that does not match how you actually feel before saving.</p>
              </div>
              <div className="rounded-[14px] bg-[var(--color-surface-sunken)] px-4 py-3 text-left sm:text-right">
                <p className="text-[14.5px] text-[var(--color-text-tertiary)]">Current total</p>
                <p className="font-mono text-[21px] font-semibold">{summary.totalSeverity} / 132</p>
              </div>
            </div>

            {extraction.symptoms.length > 0 ? (
              <div className="mt-5 space-y-3">
                {extraction.symptoms.map((symptom) => (
                  <div key={symptom.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-semibold">{symptom.label}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Badge tone={confidenceTone(symptom.confidence)}>{symptom.confidence} confidence</Badge>
                          <Badge tone={ratings[symptom.id] >= 5 ? "risk" : ratings[symptom.id] >= 3 ? "caution" : "neutral"}>{severityLabel(ratings[symptom.id])}</Badge>
                        </div>
                      </div>
                      <ScoreStepper value={ratings[symptom.id]} onChange={(value) => updateRating(symptom.id, value)} />
                    </div>
                    <div className="mt-4 rounded-[12px] bg-[var(--color-surface-sunken)] p-3">
                      <p className="text-[14.5px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Why this score</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{symptom.rationale}</p>
                      <p className="mt-2 text-[14.5px] italic leading-relaxed text-[var(--color-text-tertiary)]">“{symptom.evidence}”</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[var(--radius-md)] bg-[var(--color-caution-soft)] p-4">
                <p className="text-[15px] font-semibold">No symptom was confidently matched</p>
                <p className="mt-1 text-[14px] text-[var(--color-text-secondary)]">You can still review the four symptom groups below, edit the transcript, or record again.</p>
              </div>
            )}

            {extraction.activityContexts.length > 0 && (
              <div className="mt-5"><p className="text-[14.5px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">Context understood</p><div className="mt-2 flex flex-wrap gap-2">{extraction.activityContexts.map((context) => <Badge key={context} tone="info">{context}</Badge>)}</div></div>
            )}
          </Card>

          <Card className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold">Quick review of anything else</h2>
                <p className="mt-1 text-[14.5px] leading-relaxed text-[var(--color-text-secondary)]">Unmentioned symptoms start at zero. Open only the groups that apply and change any symptom that is present.</p>
              </div>
              <Badge tone="neutral">4 groups</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {categories.map((category) => {
                const items = pcssSymptoms.filter((symptom) => symptom.category === category && !detectedIds.has(symptom.id));
                const activeCount = items.filter((symptom) => ratings[symptom.id] > 0).length;
                return (
                  <details key={category} className="group rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
                      <div>
                        <p className="text-[15px] font-semibold">{pcssCategoryLabels[category]}</p>
                        <p className="mt-0.5 text-[14.5px] text-[var(--color-text-secondary)]">{items.length} not mentioned{activeCount > 0 ? ` · ${activeCount} added` : ""}</p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)] transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-[var(--color-border)] px-4 py-2">
                      {items.length === 0 ? <p className="py-3 text-[14px] text-[var(--color-text-secondary)]">All symptoms in this group were already identified from your speech.</p> : items.map((symptom) => (
                        <label key={symptom.id} className="flex items-center justify-between gap-3 border-b border-[var(--color-border)]/70 py-3 last:border-b-0">
                          <span className="text-[14.5px] font-medium">{symptom.label}</span>
                          <select value={ratings[symptom.id]} onChange={(event) => updateRating(symptom.id, Number(event.target.value))} className="min-w-[132px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-[14px]">
                            <option value={0}>0 · Not present</option>
                            <option value={1}>1 · Very mild</option>
                            <option value={2}>2 · Mild</option>
                            <option value={3}>3 · Moderate</option>
                            <option value={4}>4 · Moderate-high</option>
                            <option value={5}>5 · Severe</option>
                            <option value={6}>6 · Extreme</option>
                          </select>
                        </label>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </Card>

          <details className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-low)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <div><p className="text-[15px] font-semibold">See or correct the transcript</p><p className="mt-0.5 text-[14.5px] text-[var(--color-text-secondary)]">The transcript is not stored after you save.</p></div>
              <Pencil className="h-4 w-4 text-[var(--color-accent)]" />
            </summary>
            <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={4} className="mt-4 w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-3 py-2.5 text-[15px] leading-relaxed text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]" aria-label="Editable voice transcript" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => analyzeTranscript(transcript)}>Re-analyze edited transcript</Button>
              <Button size="sm" variant="ghost" onClick={() => { setStep("record"); setTranscript(""); }}><Mic />Record again</Button>
            </div>
          </details>

          <Card className="p-5 sm:p-6">
            <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
              <input type="checkbox" checked={confirmedReview} onChange={(event) => setConfirmedReview(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
              <span><span className="block text-[15px] font-semibold">These ratings match how I feel right now</span><span className="mt-1 block text-[14px] leading-relaxed text-[var(--color-text-secondary)]">I reviewed the suggested scores and any other symptom groups that apply. SomatoSync will save only these confirmed ratings.</span></span>
            </label>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={save} disabled={extraction.dangerSigns.length > 0 || !confirmedReview}><Check />Confirm and save</Button>
              <Button variant="secondary" onClick={() => navigate("/app/assessments/pcss")}>Open full manual form</Button>
            </div>
          </Card>
        </div>
      )}

      {error && <div role="alert" className="rounded-[var(--radius-md)] border border-[var(--color-risk)]/35 bg-[var(--color-risk-soft)] p-3 text-[14px] text-[var(--color-risk)]">{error}</div>}
      <Disclaimer variant="block">This check-in helps organize what you report. Review every suggested rating before saving; it is not a diagnosis.</Disclaimer>
    </div>
  );
}
