import { useCallback, useState } from "react";
import { PageHeader } from "../../components/shared/PageHeader";
import { Panel, PanelDivider } from "../../components/shared/Panel";
import { Disclaimer } from "../../components/shared/Disclaimer";
import { PrivacySummary } from "./PrivacySummary";
import { StoredDataTable } from "./StoredDataTable";
import { ExportDataSection } from "./ExportDataSection";
import { DeleteDataSection } from "./DeleteDataSection";
import { getStorageSummary } from "./privacyStorage";

export function PrivacyDataPage() {
  const [summary, setSummary] = useState(() => getStorageSummary());

  const refresh = useCallback(() => {
    setSummary(getStorageSummary());
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Privacy & Data"
        context="How SomatoSync stores information on this device, and direct control over what's kept."
      />

      <Panel title="How your data is stored" description="A plain description of this prototype's current data handling.">
        <ul className="space-y-2.5 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
          <li>SomatoSync currently stores prototype data in this browser using local storage (localStorage).</li>
          <li>Data saved in one browser stays on that browser and device -- it will not appear if you open SomatoSync in a different browser or on another device.</li>
          <li>Clearing your browser's site data, cache, or history may permanently remove information stored here.</li>
          <li>Local browser storage is not equivalent to encrypted clinical record storage.</li>
          <li>The balance screen uses MediaPipe Pose Landmarker in the browser. Video, screenshots, raw frames, and body-coordinate streams are not saved or included in AI requests.</li>
          <li>Neuro-Adaptive Mode uses optional MediaPipe Face Landmarker inference in the browser. Frames, screenshots, raw landmarks, facial templates, and raw interaction streams are discarded; only aggregate session summaries, interface settings, and small personalization weights may be saved locally.</li>
          <li>The conversational check-in records microphone audio only after permission. Whisper transcription runs locally in the browser; raw audio and the editable transcript are discarded after confirmation.</li>
          <li>The voice check-in stores only user-confirmed PCSS ratings, broad activity-context tags, and a source label. It does not store speech audio or use speech as a diagnostic biomarker.</li>
          <li>Research Assistant questions remain in page memory only. This build does not send prompts to an external AI API or save prompt history.</li>
          <li>The Learning & Delayed Recall task stores only counts, percentages, timing, and an anonymous word-list ID. The words a user types are not saved.</li>
          <li>The Recovery Calendar is calculated locally from assessment dates and does not create a separate cloud schedule.</li>
          <li>Symptom-triggered guidance, trend calculations, and the recovery outlook are calculated locally from transparent rules.</li>
          <li>Recovery explanations run locally with Chrome built-in AI or Transformers.js. No paid API key is used, and generated explanations are kept in page memory rather than written to local storage.</li>
          <li>Optional injury context and graded-pathway activity responses are stored only in the active account's local namespace.</li>
          <li>The app does not generate a hidden readiness score, recovery probability, or predicted recovery date.</li>
          <li>This build does not include an analytics SDK, advertising tracker, cloud database, or background data sync.</li>
          <li>Assessment records are separated by prototype account so the Maya Chen demo does not mix with a real-user session.</li>
        </ul>

        <PanelDivider />

        <Disclaimer variant="block">
          This is a prototype, not a HIPAA-compliant medical-record system. It does not use end-to-end encryption,
          and local storage should not be treated as fully secure. A production version would require secure
          authentication, encrypted storage, access controls, and a formal privacy review before handling real
          clinical data.
        </Disclaimer>
      </Panel>

      <Panel title="Stored on this device" description="A summary of SomatoSync entries found in local storage.">
        <div className="space-y-4">
          <PrivacySummary summary={summary} />
          {summary.entries.length > 0 && <StoredDataTable entries={summary.entries} />}
        </div>
      </Panel>

      <Panel title="Export your data">
        <ExportDataSection disabled={!summary.isStorageAvailable} entryCount={summary.entries.length} />
      </Panel>

      <Panel title="Delete your data">
        <DeleteDataSection
          disabled={!summary.isStorageAvailable}
          entryCount={summary.entries.length}
          onDeleted={refresh}
        />
      </Panel>
    </div>
  );
}
