import { useCallback, useEffect, useRef, useState } from "react";
import { BrainCircuit, Camera, CheckCircle2, ShieldAlert, VideoOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/shared/PageHeader";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Disclaimer } from "../../../components/shared/Disclaimer";
import { TaskToleranceCheck, EMPTY_TASK_TOLERANCE, taskToleranceSummary, type TaskToleranceRatings } from "../shared/TaskToleranceCheck";
import { useToast } from "../../../components/shared/Toast";
import {
  BALANCE_FRAME_HEIGHT,
  BALANCE_FRAME_WIDTH,
  BALANCE_SAMPLE_INTERVAL_MS,
  BALANCE_TEST_SECONDS,
  summarizeBalanceSamples,
} from "./balanceAnalysis";
import { saveBalanceResult } from "./balanceStorage";
import type { BalanceAssessmentResult, BalanceFrameSample } from "./balanceTypes";
import { MovementInterpretationScale } from "./MovementInterpretationScale";
import { useNeuroAdaptive } from "../../adaptive/NeuroAdaptiveContext";
import {
  detectPoseSample,
  drawPoseOverlay,
  loadPoseLandmarker,
  type PoseLandmarkerLike,
} from "./poseLandmarker";

type Phase = "intro" | "preCheck" | "requesting" | "positioning" | "countdown" | "testing" | "postCheck" | "result" | "error";

const bandText: Record<BalanceAssessmentResult["movementBand"], string> = {
  lower: "Lower observed movement",
  moderate: "Moderate observed movement",
  higher: "Higher observed movement",
  insufficient: "Recording quality too low",
};

export function BalanceAssessmentPage() {
  const { status: focusStatus, stopMonitoring } = useNeuroAdaptive();
  const navigate = useNavigate();
  const { show } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarkerLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const samplesRef = useRef<BalanceFrameSample[]>([]);
  const visibilityRef = useRef<number[]>([]);
  const testStartRef = useRef(0);
  const lastSampleRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("intro");
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [secondsRemaining, setSecondsRemaining] = useState(BALANCE_TEST_SECONDS);
  const [marker, setMarker] = useState({ x: 50, y: 50 });
  const [result, setResult] = useState<BalanceAssessmentResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [modelStatus, setModelStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [poseVisible, setPoseVisible] = useState(false);
  const [positioningReady, setPositioningReady] = useState(false);
  const [landmarkVisibility, setLandmarkVisibility] = useState(0);
  const [preTolerance, setPreTolerance] = useState<TaskToleranceRatings>(EMPTY_TASK_TOLERANCE);
  const [pendingResult, setPendingResult] = useState<BalanceAssessmentResult | null>(null);

  const stopCamera = useCallback(() => {
    if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const overlay = overlayCanvasRef.current;
    overlay?.getContext("2d")?.clearRect(0, 0, overlay.width, overlay.height);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function openCamera() {
    if (focusStatus !== "off" && focusStatus !== "error") stopMonitoring();
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("This browser does not support camera access. Try a current Chrome or Edge browser.");
      setPhase("error");
      return;
    }

    setPhase("requesting");
    setModelStatus("loading");
    setErrorMessage("");
    try {
      poseLandmarkerRef.current = await loadPoseLandmarker();
      setModelStatus("ready");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video preview was unavailable.");
      video.srcObject = stream;
      await video.play();
      setPhase("positioning");
      animationRef.current = requestAnimationFrame(previewPose);
    } catch (error) {
      stopCamera();
      setModelStatus("error");
      const message = error instanceof Error ? error.message : "The camera or pose model could not be opened.";
      setErrorMessage(`${message} Check your connection once so the camera analysis can finish loading.`);
      setPhase("error");
    }
  }

  function previewPose(now: number) {
    const video = videoRef.current;
    const landmarker = poseLandmarkerRef.current;
    const overlay = overlayCanvasRef.current;
    if (video && landmarker && video.readyState >= 2 && now - lastSampleRef.current >= BALANCE_SAMPLE_INTERVAL_MS) {
      lastSampleRef.current = now;
      const detected = detectPoseSample(landmarker, video, now, 0);
      if (detected) {
        setPoseVisible(true);
        setPositioningReady(detected.positioningReady);
        setLandmarkVisibility(Math.round(detected.visibility * 100));
        setMarker({
          x: 100 - (detected.sample.bodyX / BALANCE_FRAME_WIDTH) * 100,
          y: (detected.sample.bodyY / BALANCE_FRAME_HEIGHT) * 100,
        });
        if (overlay) drawPoseOverlay(overlay, detected.landmarks);
      } else {
        setPoseVisible(false);
        setPositioningReady(false);
        setLandmarkVisibility(0);
        if (overlay) overlay.getContext("2d")?.clearRect(0, 0, overlay.width, overlay.height);
      }
    }
    animationRef.current = requestAnimationFrame(previewPose);
  }

  function startCountdown() {
    setCountdown(3);
    setPhase("countdown");
    let value = 3;
    const timer = window.setInterval(() => {
      value -= 1;
      setCountdown(Math.max(0, value));
      if (value <= 0) {
        window.clearInterval(timer);
        startMeasurement();
      }
    }, 1000);
  }

  function startMeasurement() {
    if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    samplesRef.current = [];
    visibilityRef.current = [];
    testStartRef.current = performance.now();
    lastSampleRef.current = 0;
    setSecondsRemaining(BALANCE_TEST_SECONDS);
    setPhase("testing");
    animationRef.current = requestAnimationFrame(measureFrame);
  }

  function measureFrame(now: number) {
    const elapsed = now - testStartRef.current;
    const remaining = Math.max(0, Math.ceil(BALANCE_TEST_SECONDS - elapsed / 1000));
    setSecondsRemaining(remaining);

    if (elapsed >= BALANCE_TEST_SECONDS * 1000) {
      finishMeasurement();
      return;
    }

    if (now - lastSampleRef.current >= BALANCE_SAMPLE_INTERVAL_MS) {
      lastSampleRef.current = now;
      const video = videoRef.current;
      const landmarker = poseLandmarkerRef.current;
      const overlay = overlayCanvasRef.current;
      if (video && landmarker && video.readyState >= 2) {
        const detected = detectPoseSample(landmarker, video, now, elapsed);
        if (detected) {
          samplesRef.current.push(detected.sample);
          visibilityRef.current.push(detected.visibility);
          setPoseVisible(true);
          setPositioningReady(detected.positioningReady);
          setLandmarkVisibility(Math.round(detected.visibility * 100));
          setMarker({
            x: 100 - (detected.sample.bodyX / BALANCE_FRAME_WIDTH) * 100,
            y: (detected.sample.bodyY / BALANCE_FRAME_HEIGHT) * 100,
          });
          if (overlay) drawPoseOverlay(overlay, detected.landmarks);
        } else {
          setPoseVisible(false);
          setPositioningReady(false);
        }
      }
    }

    animationRef.current = requestAnimationFrame(measureFrame);
  }

  function finishMeasurement() {
    if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    const expectedSamples = Math.floor((BALANCE_TEST_SECONDS * 1000) / BALANCE_SAMPLE_INTERVAL_MS);
    const summarized = summarizeBalanceSamples(samplesRef.current, expectedSamples);
    const meanVisibility = visibilityRef.current.length
      ? visibilityRef.current.reduce((sum, value) => sum + value, 0) / visibilityRef.current.length
      : 0;
    const nextResult: BalanceAssessmentResult = {
      ...summarized,
      analysisMethod: "mediapipe-pose",
      poseModel: "MediaPipe Pose Landmarker Lite",
      meanLandmarkVisibility: Math.round(meanVisibility * 100),
    };
    setPendingResult(nextResult);
    stopCamera();
    if (nextResult.trackingQualityPercent >= 60) {
      setPhase("postCheck");
    } else {
      setResult(nextResult);
      setPhase("result");
      show({
        title: "Recording needs to be repeated",
        description: "Tracking quality was too low to interpret or save this recording.",
        tone: "error",
      });
    }
  }

  function finishWithTolerance(postTolerance: TaskToleranceRatings) {
    if (!pendingResult) return;
    const completed: BalanceAssessmentResult = { ...pendingResult, preTolerance, postTolerance };
    if (completed.trackingQualityPercent >= 60) saveBalanceResult(completed);
    setResult(completed);
    setPendingResult(null);
    setPhase("result");
    show({
      title: "Balance and tolerance saved",
      description: `${bandText[completed.movementBand]} · symptom response was recorded separately.`,
      tone: "success",
    });
  }

  function restart() {
    setResult(null);
    setPhase("intro");
    setSafetyConfirmed(false);
    setMarker({ x: 50, y: 50 });
    setPoseVisible(false);
    setPositioningReady(false);
    setLandmarkVisibility(0);
    setModelStatus("idle");
    setPreTolerance(EMPTY_TASK_TOLERANCE);
    setPendingResult(null);
  }

  if (phase === "preCheck") {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader title="Before the balance recording" context="A brief symptom check separates how you perform from how the task feels." />
        <Card className="p-6">
          <TaskToleranceCheck
            mode="pre"
            metrics={["headache", "dizziness", "fatigue"]}
            buttonLabel="Continue to camera"
            onSubmit={(ratings) => { setPreTolerance(ratings); void openCamera(); }}
          />
        </Card>
      </div>
    );
  }

  if (phase === "postCheck" && pendingResult) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader title="How did the balance task affect you?" context="Record the symptom response before viewing the movement result." />
        <Card className="p-6">
          <TaskToleranceCheck
            mode="post"
            metrics={["headache", "dizziness", "fatigue"]}
            buttonLabel="Save and view result"
            onSubmit={finishWithTolerance}
          />
        </Card>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader title="Balance recording complete" context="On-device ML pose landmarks translated into postural-movement and head-steadiness proxies." />
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-[var(--color-positive)]" aria-hidden="true" />
            <div>
              <h2 className="text-[17px] font-semibold text-[var(--color-text-primary)]">{bandText[result.movementBand]}</h2>
              <p className="mt-1 text-[16px] text-[var(--color-text-secondary)]">
                {result.movementBand === "insufficient"
                  ? "This recording was not saved because too few camera frames could be tracked. Improve lighting, simplify the background, and try again."
                  : "This label uses prototype recording thresholds and should only be compared with your own future recordings under similar conditions."}
              </p>
            </div>
          </div>

          <MovementInterpretationScale value={result.lateralRmsPercent} band={result.movementBand} />

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Lateral sway RMS" value={`${result.lateralRmsPercent}%`} detail="movement variability" />
            <Metric label="Lateral range" value={`${result.lateralRangePercent}%`} detail="side-to-side span" />
            <Metric label="Head steadiness" value={`${result.headRmsPercent}%`} detail="lower number = steadier" />
            <Metric label="Tracking quality" value={`${result.trackingQualityPercent}%`} detail={`${result.sampleCount} samples · ${result.meanLandmarkVisibility ?? 0}% landmark confidence`} />
          </div>

          {(() => {
            const tolerance = taskToleranceSummary(result.preTolerance, result.postTolerance, ["headache", "dizziness", "fatigue"]);
            return tolerance ? (
              <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
                <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">Task tolerance · {tolerance.label}</p>
                <p className="mt-1 text-[16px] leading-6 text-[var(--color-text-secondary)]">{tolerance.detail}</p>
                <p className="mt-2 text-[16px] leading-6 text-[var(--color-text-tertiary)]">Movement and symptom cost stay separate; less movement does not automatically mean the task was easier to tolerate.</p>
              </div>
            ) : null;
          })()}

          <div className="mt-5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] p-4">
            <h3 className="text-[16px] font-medium text-[var(--color-text-primary)]">What the camera measured</h3>
            <p className="mt-1 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
              SomatoSync estimates body position frame by frame and summarizes the movement visible to the camera. Video and raw body landmarks are not saved.
            </p>
          </div>

          <Disclaimer variant="block" className="mt-5">
            This experimental camera screen is not BESS, mBESS, VOMS, a force-plate assessment, or medical clearance. Stop testing and seek appropriate care if symptoms worsen or standing feels unsafe.
          </Disclaimer>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate("/app/assessments")}>Back to assessments</Button>
            <Button variant="secondary" onClick={restart}>Record again</Button>
            <Button onClick={() => navigate("/app/progress")}>View progress</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Camera balance assessment"
        context="A short eyes-open camera recording that summarizes visible postural movement."
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden">
          <div className="relative aspect-[4/3] bg-black">
            <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
            <canvas ref={overlayCanvasRef} width={640} height={480} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />

            {(phase === "positioning" || phase === "countdown" || phase === "testing") && (
              <>
                <div className="pointer-events-none absolute inset-[10%_14%] rounded-[24px] border border-dashed border-white/70" />
                <div
                  className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-accent)] shadow"
                  style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                  aria-hidden="true"
                />
              </>
            )}

            {phase === "intro" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center text-white">
                <Camera className="h-9 w-9" aria-hidden="true" />
                <p className="max-w-sm text-[16px]">Camera analysis runs in this browser. SomatoSync saves only summary movement measurements—not video or body landmarks.</p>
              </div>
            )}

            {phase === "requesting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-center text-white">
                <BrainCircuit className="h-8 w-8" aria-hidden="true" />
                <p className="text-[16px]">{modelStatus === "loading" ? "Loading camera analysis…" : "Requesting camera permission…"}</p>
                <p className="max-w-sm text-[16px] text-white/70">Camera frames are processed in the browser and are not saved.</p>
              </div>
            )}

            {phase === "countdown" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                <span className="font-mono text-7xl font-semibold tabular-nums text-white drop-shadow">{countdown}</span>
              </div>
            )}

            {(phase === "positioning" || phase === "countdown" || phase === "testing") && (
              <div className="absolute left-3 top-3 rounded-[var(--radius-sm)] bg-black/65 px-3 py-2 text-white">
                <p className="text-[16px] uppercase tracking-wide text-white/70">{phase === "testing" ? "Recording" : "Positioning"}</p>
                <p className="font-mono text-[16px] font-semibold tabular-nums">{phase === "testing" ? `${secondsRemaining}s` : `${landmarkVisibility}% confidence`}</p>
                <p className="text-[16px] text-white/75">{poseVisible ? (positioningReady ? "Required landmarks visible" : "Step back to show knees") : "Pose not detected"}</p>
              </div>
            )}

            {phase === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center text-white">
                <VideoOff className="h-9 w-9" aria-hidden="true" />
                <p className="max-w-md text-[16px]">{errorMessage || "The camera could not be opened."}</p>
              </div>
            )}
          </div>

          <div className="p-5">
            {phase === "intro" && (
              <div className="space-y-4">
                <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5">
                  <input
                    type="checkbox"
                    checked={safetyConfirmed}
                    onChange={(event) => setSafetyConfirmed(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span className="text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
                    I can stand safely with eyes open, have sturdy support nearby, and will stop immediately if I feel dizzy or unstable.
                  </span>
                </label>
                <Button className="w-full" disabled={!safetyConfirmed} onClick={() => setPhase("preCheck")}>Continue</Button>
              </div>
            )}

            {phase === "positioning" && (
              <div className="space-y-3">
                <p className="text-[16px] text-[var(--color-text-secondary)]">
                  Step back until your head, shoulders, hips, and knees are visible inside the guide. Face forward, keep your eyes open, and stand with feet about hip-width apart.
                </p>
                <Button className="w-full" disabled={!positioningReady || modelStatus !== "ready"} onClick={startCountdown}>
                  {positioningReady ? "I am positioned — start" : "Show shoulders, hips, and knees"}
                </Button>
              </div>
            )}

            {phase === "testing" && (
              <p className="text-center text-[16px] font-medium text-[var(--color-text-primary)]">Stay as still as comfortably possible and keep looking forward.</p>
            )}

            {phase === "error" && (
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => navigate("/app/assessments")}>Back</Button>
                <Button className="flex-1" onClick={openCamera}>Try again</Button>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-caution)]" aria-hidden="true" />
              <div>
                <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">Safety first</h2>
                <ul className="mt-2 space-y-2 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
                  <li>Use a clear area with a wall, counter, or another person nearby.</li>
                  <li>Keep both feet on the floor and eyes open.</li>
                  <li>Do not continue if symptoms increase or you feel unsafe.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">What is included</h2>
            <div className="mt-3 space-y-3 text-[16px] text-[var(--color-text-secondary)]">
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Postural movement</p>
                <p className="mt-0.5">A trained ML model tracks shoulder and hip landmarks; lateral RMS, range, and total path are calculated from their center.</p>
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Head-steadiness proxy</p>
                <p className="mt-0.5">Movement of the nose/ear landmark region during the same recording—not a separate eye-tracking or VOMS test.</p>
              </div>
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Recording quality</p>
                <p className="mt-0.5">Valid camera samples are reported so low-quality sessions are not overinterpreted.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Disclaimer>
        This camera-based movement estimate is experimental. Consistent distance, lighting, stance, and camera placement matter when comparing sessions.
      </Disclaimer>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3.5">
      <p className="text-[16px] text-[var(--color-text-tertiary)]">{label}</p>
      <p className="mt-1 font-mono text-[19px] font-semibold tabular-nums text-[var(--color-text-primary)]">{value}</p>
      <p className="mt-0.5 text-[16px] text-[var(--color-text-secondary)]">{detail}</p>
    </div>
  );
}
