import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Wordmark } from "../components/navigation/Wordmark";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";

export function LegalPage({ type }: { type: "terms" | "privacy" }) {
  const privacy = type === "privacy";
  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3"><Wordmark /><Button variant="secondary" size="sm" asChild><Link to="/create-account"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link></Button></div>
        <Card className="mt-8 p-6 sm:p-8">
          <ShieldCheck className="h-6 w-6 text-[var(--color-accent)]" />
          <h1 className="mt-3 text-[26px] font-semibold text-[var(--color-text-primary)]">{privacy ? "Prototype Privacy Policy" : "Prototype Terms of Use"}</h1>
          {privacy ? <PrivacyText /> : <TermsText />}
        </Card>
      </div>
    </main>
  );
}

function PrivacyText() {
  return <div className="mt-6 space-y-5 text-[16px] leading-7 text-[var(--color-text-secondary)]">
    <section><h2 className="font-semibold text-[var(--color-text-primary)]">Local prototype data</h2><p>SomatoSync stores prototype account settings and recovery records in this browser’s local storage. It does not provide production authentication or a cloud medical record.</p></section>
    <section><h2 className="font-semibold text-[var(--color-text-primary)]">Camera processing</h2><p>Balance and Focus Mode camera frames are processed in memory. Raw video, screenshots, and landmark streams are not intentionally saved. Only summary measurements may be stored locally after a completed task.</p></section>
    <section><h2 className="font-semibold text-[var(--color-text-primary)]">AI explanation</h2><p>The optional AI Recovery Explanation sends an allowlisted, de-identified trend summary to a protected server route only after consent. Names, email addresses, raw camera frames, memory words, and complete symptom-response objects are excluded.</p></section>
    <section><h2 className="font-semibold text-[var(--color-text-primary)]">Control</h2><p>Users can export or delete SomatoSync local data from Privacy &amp; Data. Clearing browser storage may also remove the record.</p></section>
  </div>;
}

function TermsText() {
  return <div className="mt-6 space-y-5 text-[16px] leading-7 text-[var(--color-text-secondary)]">
    <section><h2 className="font-semibold text-[var(--color-text-primary)]">Educational prototype</h2><p>SomatoSync is a hackathon prototype for tracking and explaining recovery patterns. It is not a medical device and does not diagnose concussion, predict an exact recovery date, or provide clearance.</p></section>
    <section><h2 className="font-semibold text-[var(--color-text-primary)]">Emergency care</h2><p>Do not use this application instead of urgent medical evaluation. Seek emergency help for danger signs or rapidly worsening symptoms.</p></section>
    <section><h2 className="font-semibold text-[var(--color-text-primary)]">Appropriate use</h2><p>Use assessments only when safe and stop tasks that meaningfully worsen symptoms. Return-to-learn, work, driving, and sport decisions should follow individualized professional guidance.</p></section>
    <section><h2 className="font-semibold text-[var(--color-text-primary)]">Prototype accounts</h2><p>Email and password fields create local demonstration sessions only. They are not secure production authentication and should not be used with a real password.</p></section>
  </div>;
}
