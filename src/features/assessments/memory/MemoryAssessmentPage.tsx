import { useEffect, useMemo, useState } from "react";
import { Brain, CheckCircle2, Clock3, Info, RotateCcw, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Textarea } from "../../../components/ui/textarea";
import { Disclaimer } from "../../../components/shared/Disclaimer";
import { TaskToleranceCheck, EMPTY_TASK_TOLERANCE, taskToleranceSummary, type TaskToleranceRatings } from "../shared/TaskToleranceCheck";
import { PageHeader } from "../../../components/shared/PageHeader";
import { useToast } from "../../../components/shared/Toast";
import { useAppMode } from "../../../context/AppModeContext";
import {
  MEMORY_DELAY_SECONDS,
  MEMORY_DEMO_DELAY_SECONDS,
  pickMemoryWordList,
  scoreRecall,
} from "./memoryData";
import { loadMemoryHistory, saveMemoryAssessment } from "./memoryStorage";
import type { MemoryAssessmentResult, MemoryRecallScore } from "./memoryTypes";

type MemoryPhase = "intro" | "preCheck" | "encoding" | "learningRecall" | "delay" | "delayed" | "postCheck" | "result";
const LEARNING_TRIALS = 3;

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function MemoryAssessmentPage() {
  const navigate = useNavigate();
  const { show } = useToast();
  const { mode } = useAppMode();
  const [phase, setPhase] = useState<MemoryPhase>("intro");
  const [learningTrial, setLearningTrial] = useState(1);
  const [wordIndex, setWordIndex] = useState(0);
  const [recallInput, setRecallInput] = useState("");
  const [delayedInput, setDelayedInput] = useState("");
  const [learningScores, setLearningScores] = useState<MemoryRecallScore[]>([]);
  const [delayEndsAt, setDelayEndsAt] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [result, setResult] = useState<MemoryAssessmentResult | null>(null);
  const [preTolerance, setPreTolerance] = useState<TaskToleranceRatings>(EMPTY_TASK_TOLERANCE);
  const [pendingDelayedScore, setPendingDelayedScore] = useState<MemoryRecallScore | null>(null);
  const previousListIds = useMemo(() => loadMemoryHistory().map((entry) => entry.wordListId), []);
  const [wordList, setWordList] = useState(() => pickMemoryWordList(previousListIds));
  const delaySeconds = mode === "demo" ? MEMORY_DEMO_DELAY_SECONDS : MEMORY_DELAY_SECONDS;

  useEffect(() => {
    if (phase !== "encoding") return;
    const timer = window.setTimeout(() => {
      if (wordIndex >= wordList.words.length - 1) {
        setRecallInput("");
        setPhase("learningRecall");
      } else {
        setWordIndex((current) => current + 1);
      }
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [phase, wordIndex, wordList.words.length]);

  useEffect(() => {
    if (phase !== "delay" || delayEndsAt == null) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((delayEndsAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) setPhase("delayed");
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [phase, delayEndsAt]);

  function start() {
    setLearningTrial(1);
    setWordIndex(0);
    setRecallInput("");
    setDelayedInput("");
    setLearningScores([]);
    setResult(null);
    setPendingDelayedScore(null);
    setPhase("preCheck");
  }

  function submitLearningTrial() {
    const score = scoreRecall(recallInput, wordList.words);
    const nextScores = [...learningScores, score];
    setLearningScores(nextScores);
    if (learningTrial < LEARNING_TRIALS) {
      setLearningTrial((current) => current + 1);
      setWordIndex(0);
      setRecallInput("");
      setPhase("encoding");
      return;
    }
    const end = Date.now() + delaySeconds * 1000;
    setDelayEndsAt(end);
    setSecondsRemaining(delaySeconds);
    setPhase("delay");
  }

  function submitDelayed() {
    if (learningScores.length !== LEARNING_TRIALS) return;
    setPendingDelayedScore(scoreRecall(delayedInput, wordList.words));
    setPhase("postCheck");
  }

  function finishWithTolerance(postTolerance: TaskToleranceRatings) {
    if (learningScores.length !== LEARNING_TRIALS || !pendingDelayedScore) return;
    const saved = saveMemoryAssessment({
      wordListId: wordList.id,
      immediateTrials: learningScores.map((score) => score.correctCount),
      delayedCorrect: pendingDelayedScore.correctCount,
      intrusionCount: learningScores.reduce((sum, score) => sum + score.intrusionCount, 0) + pendingDelayedScore.intrusionCount,
      delaySeconds,
      preTolerance,
      postTolerance,
    });
    setResult(saved);
    setPhase("result");
    show({
      title: "Learning, recall, and tolerance saved",
      description: `${saved.delayedCorrect} of 10 words recalled; symptom response was recorded separately.`,
      tone: "success",
    });
  }

  function restart() {
    const used = loadMemoryHistory().map((entry) => entry.wordListId);
    setWordList(pickMemoryWordList(used));
    setPhase("intro");
    setLearningTrial(1);
    setWordIndex(0);
    setRecallInput("");
    setDelayedInput("");
    setLearningScores([]);
    setDelayEndsAt(null);
    setResult(null);
    setPendingDelayedScore(null);
    setPreTolerance(EMPTY_TASK_TOLERANCE);
  }

  if (phase === "result" && result) {
    const trials = result.immediateTrials ?? [result.immediateCorrect];
    const learningTotal = result.learningTotal ?? result.immediateCorrect;
    const finalTrial = result.finalLearningCorrect ?? result.immediateCorrect;
    return (
      <div className="mx-auto max-w-3xl space-y-5 py-5">
        <Card className="p-7">
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="h-10 w-10 text-[var(--color-positive)]" aria-hidden="true" />
            <h1 className="mt-3 text-[20px] font-semibold text-[var(--color-text-primary)]">Learning and recall task recorded</h1>
            <Badge tone={result.interpretationTone} showDot className="mt-2">
              {result.interpretationLabel}
            </Badge>
            <p className="mt-2 max-w-xl text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
              {result.interpretationDetail}
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <ResultMetric label="Learning across trials" value={`${learningTotal} / 30`} detail={`Trials: ${trials.join(" · ")}`} />
            <ResultMetric label="Final learning trial" value={`${finalTrial} / 10`} detail="recall after the third presentation" />
            <ResultMetric label="Delayed recall" value={`${result.delayedCorrect} / 10`} detail={`${result.delayedPercent}% recalled after the delay`} />
          </div>

          {(() => {
            const tolerance = taskToleranceSummary(result.preTolerance, result.postTolerance, ["headache", "concentrationDifficulty", "fatigue"]);
            return tolerance ? (
              <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
                <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">Task tolerance · {tolerance.label}</p>
                <p className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">{tolerance.detail}</p>
                <p className="mt-2 text-[16px] leading-6 text-[var(--color-text-tertiary)]">Performance and symptom cost are shown separately so a higher score is not automatically treated as better tolerance.</p>
              </div>
            ) : null;
          })()}

          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
            <h2 className="text-[16px] font-medium text-[var(--color-text-primary)]">What this means</h2>
            <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
              The three learning trials show how recall changes with repeated exposure; delayed recall tracks what remains after at least five minutes. The color only describes change from your own previous task—not a clinical pass/fail range.
            </p>
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-accent-soft-border)] bg-[var(--color-accent-soft)] p-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
            <p className="text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
              Privacy: only numerical scores and the anonymous word-list ID were saved. The words you typed were discarded.
            </p>
          </div>

          <Disclaimer variant="block" className="mt-5">
            This original task follows the general 10-word learning and delayed-recall structure used in multidomain concussion assessment, but it is not SCAT6 or SCOAT6 and is not validated for diagnosis, prognosis, or clearance.
          </Disclaimer>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => navigate("/app/check-in")}>Back to assessments</Button>
            <Button variant="secondary" onClick={restart}><RotateCcw className="h-4 w-4" /> New word list</Button>
            <Button onClick={() => navigate("/app/recovery?tab=progress")}>View progress</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Learning and Delayed Recall"
        context="Learn one original 10-word list across three trials, then recall it again after a five-minute delay."
      />

      {phase === "intro" && (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <Brain className="mt-0.5 h-6 w-6 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">How it works</h2>
              <ol className="mt-3 space-y-2 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
                <li>1. The same 10 words appear three times, one word per second.</li>
                <li>2. After each presentation, type every word you remember.</li>
                <li>3. Wait at least five minutes without reviewing or writing the list.</li>
                <li>4. Recall the list one final time for delayed recall.</li>
              </ol>
              {mode === "demo" && (
                <p className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-caution-soft)] px-3 py-2 text-[16px] text-[var(--color-caution)]">
                  Demo preview uses a 15-second delay so judges can see the complete flow. Real-user mode uses five minutes.
                </p>
              )}
              <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] p-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-info)]" aria-hidden="true" />
                <p className="text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
                  Use a quiet setting and the same device when possible. Avoid repeating the task more than scheduled because practice, sleep, fatigue, attention, and symptoms can change performance.
                </p>
              </div>
              <Button className="mt-5" onClick={start}>Continue to brief symptom check</Button>
            </div>
          </div>
        </Card>
      )}

      {phase === "preCheck" && (
        <Card className="p-6">
          <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">Before you start</h2>
          <p className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">This brief check lets SomatoSync track both memory performance and how demanding the task felt.</p>
          <div className="mt-4">
            <TaskToleranceCheck
              mode="pre"
              metrics={["headache", "concentrationDifficulty", "fatigue"]}
              buttonLabel="Start learning trial 1"
              onSubmit={(ratings) => { setPreTolerance(ratings); setPhase("encoding"); }}
            />
          </div>
        </Card>
      )}

      {phase === "encoding" && (
        <Card className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center" aria-live="polite">
          <p className="text-[16px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
            Learning trial {learningTrial} of {LEARNING_TRIALS} · word {wordIndex + 1} of {wordList.words.length}
          </p>
          <p className="mt-6 text-[44px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            {wordList.words[wordIndex]}
          </p>
          <p className="mt-5 text-[16px] text-[var(--color-text-secondary)]">Read silently. Do not write the words down.</p>
        </Card>
      )}

      {phase === "learningRecall" && (
        <RecallCard
          title={`Learning trial ${learningTrial} recall`}
          description="Type every word you remember. Order does not matter. The same list will be presented again until all three learning trials are complete."
          value={recallInput}
          onChange={setRecallInput}
          onSubmit={submitLearningTrial}
          buttonLabel={learningTrial < LEARNING_TRIALS ? `Continue to trial ${learningTrial + 1}` : "Start five-minute delay"}
        />
      )}

      {phase === "delay" && (
        <Card className="p-7 text-center">
          <Clock3 className="mx-auto h-9 w-9 text-[var(--color-accent)]" aria-hidden="true" />
          <h2 className="mt-3 text-[18px] font-semibold text-[var(--color-text-primary)]">Delayed-recall interval</h2>
          <p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">
            Keep this tab open. Do not rehearse, review, or write down the words. A quiet nonverbal activity is okay.
          </p>
          <p className="mt-6 font-mono text-[42px] font-semibold tabular-nums text-[var(--color-text-primary)]">
            {formatCountdown(secondsRemaining)}
          </p>
          <p className="mt-4 text-[16px] text-[var(--color-text-tertiary)]">
            Learning trials were recorded. Scores appear only after delayed recall.
          </p>
        </Card>
      )}

      {phase === "delayed" && (
        <RecallCard
          title="Delayed recall"
          description="Without seeing the list again, type every word you still remember."
          value={delayedInput}
          onChange={setDelayedInput}
          onSubmit={submitDelayed}
          buttonLabel="Finish assessment"
        />
      )}

      {phase === "postCheck" && (
        <Card className="p-6">
          <h2 className="text-[18px] font-semibold text-[var(--color-text-primary)]">How did the task affect you?</h2>
          <div className="mt-3">
            <TaskToleranceCheck
              mode="post"
              metrics={["headache", "concentrationDifficulty", "fatigue"]}
              buttonLabel="Save result"
              onSubmit={finishWithTolerance}
            />
          </div>
        </Card>
      )}

      <Disclaimer>
        Memory is only one cognitive domain. Interpret this task alongside symptoms, attention, reaction time, balance, daily function, and qualified clinical evaluation—not by itself.
      </Disclaimer>
    </div>
  );
}

function RecallCard({
  title,
  description,
  value,
  onChange,
  onSubmit,
  buttonLabel,
}: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  buttonLabel: string;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
      <p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">{description}</p>
      <Textarea
        className="mt-4 min-h-36 text-[16px]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Type remembered words here…"
        autoFocus
      />
      <div className="mt-4 flex justify-end">
        <Button onClick={onSubmit}>{buttonLabel}</Button>
      </div>
    </Card>
  );
}

function ResultMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
      <p className="text-[16px] text-[var(--color-text-tertiary)]">{label}</p>
      <p className="mt-1 font-mono text-[22px] font-semibold tabular-nums text-[var(--color-text-primary)]">{value}</p>
      <p className="mt-0.5 text-[16px] text-[var(--color-text-secondary)]">{detail}</p>
    </div>
  );
}
