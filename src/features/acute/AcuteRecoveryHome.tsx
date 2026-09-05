import { useState } from "react";
import { Link } from "react-router-dom";
import { Headphones, ListChecks, Mic, TriangleAlert } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { DangerSignsDialog } from "../safety/DangerSignsDialog";
import { stopReadingAloud } from "../adaptive/focusReadingTools";

const acuteText = [
  "Keep things simple today.",
  "During the first 24 to 48 hours, relative rest is recommended. Daily activities and light walking can be okay as tolerated.",
  "Use screens in brief, manageable amounts rather than forcing long sessions.",
  "After the first day or two, gradually resume low-risk thinking and physical activity as tolerated.",
  "You do not need to complete every SomatoSync assessment today.",
].join(" ");

function speakAcuteGuidance() {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(acuteText);
  utterance.rate = 0.86;
  window.speechSynthesis.speak(utterance);
}

export function AcuteRecoveryHome({ firstName }: { firstName: string }) {
  const [showToday, setShowToday] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-5" data-acute-mode="true">
      <div>
        <p className="text-[16px] font-semibold text-[var(--color-accent)]">First 24–48 hours</p>
        <h1 className="mt-2 text-balance text-[34px] font-bold tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[42px]">Keep things simple today, {firstName}</h1>
        <p className="mt-3 max-w-[58ch] text-[18px] leading-8 text-[var(--color-text-secondary)]">Brief, manageable screen use is usually a better goal than long sessions. You do not need to complete every SomatoSync assessment today.</p>
      </div>

      <Card className="border-0 bg-[var(--color-accent-soft)] p-6 sm:p-7">
        <h2 className="text-[22px] font-semibold text-[var(--color-text-primary)]">What matters right now</h2>
        <ul className="mt-4 space-y-3 text-[17px] leading-7 text-[var(--color-text-secondary)]">
          <li>• Use relative rest—not strict isolation or complete inactivity.</li>
          <li>• Keep essential daily activity and light walking if manageable.</li>
          <li>• Reduce screen time if it clearly worsens symptoms.</li>
          <li>• Get urgent medical help for danger signs or significant deterioration.</li>
        </ul>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg" className="min-h-14 justify-start"><Link to="/app/assessments/voice-check-in"><Mic />Quick check-in</Link></Button>
        <Button size="lg" variant="secondary" className="min-h-14 justify-start" onClick={() => setShowToday((value) => !value)}><ListChecks />What should I do today?</Button>
        <div className="flex min-h-14 items-center rounded-[14px] border border-[color-mix(in_srgb,var(--color-risk)_35%,var(--color-border))] bg-[var(--color-surface)] px-4"><TriangleAlert className="mr-3 h-5 w-5 text-[var(--color-risk)]" /><DangerSignsDialog /></div>
        <Button size="lg" variant="secondary" className="min-h-14 justify-start" onClick={speakAcuteGuidance}><Headphones />Listen instead</Button>
      </div>

      {showToday && (
        <Card className="p-6" data-focus-preserve-text="true">
          <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">Today</h2>
          <ul className="mt-3 space-y-2 text-[16px] leading-7 text-[var(--color-text-secondary)]">
            <li>• Keep tasks short and stop before they become overwhelming.</li>
            <li>• A small, brief symptom increase can occur with activity; reduce the load if symptoms rise more than mildly or stay elevated.</li>
            <li>• Avoid activities with a risk of another head impact, collision, or fall.</li>
            <li>• Arrange appropriate medical follow-up and follow any individualized instructions you were given.</li>
          </ul>
        </Card>
      )}

      <p className="text-[16px] leading-7 text-[var(--color-text-tertiary)]" data-focus-preserve-text="true">SomatoSync supports recovery education and tracking. It does not diagnose concussion, determine medical clearance, or replace urgent evaluation.</p>
      <button type="button" className="sr-only" onClick={stopReadingAloud}>Stop audio</button>
    </div>
  );
}
