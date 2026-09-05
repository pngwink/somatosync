import { Link } from "react-router-dom";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { PageHeader } from "../components/shared/PageHeader";
import { Panel, PanelDivider } from "../components/shared/Panel";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import { SegmentedControl } from "../components/forms/SegmentedControl";
import { useTheme } from "../hooks/useTheme";
import { useUserPreferences } from "../context/UserPreferencesContext";
import type { ThemeMode } from "../types";

function SettingsRow({ title, description, control }: { title: string; description?: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div>
        <p className="text-[16px] font-medium text-[var(--color-text-primary)]">{title}</p>
        {description && <p className="mt-0.5 max-w-lg text-[16px] leading-relaxed text-[var(--color-text-secondary)]">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export function SettingsPage() {
  const { mode, setMode } = useTheme();
  const {
    notificationsEnabled,
    assessmentRemindersEnabled,
    reducedVisualIntensity,
    setNotificationsEnabled,
    setAssessmentRemindersEnabled,
    setReducedVisualIntensity,
  } = useUserPreferences();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Settings" context="Preferences are saved only in this browser and stay separate for each local account." />

      <Panel title="Appearance and accessibility">
        <div className="divide-y divide-[var(--color-border)]">
          <SettingsRow
            title="Theme"
            description="Choose light, a warm-charcoal dark theme, or match your device. No single tint helps everyone, so comfort remains user-controlled."
            control={
              <SegmentedControl<ThemeMode>
                ariaLabel="Theme"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Warm dark" },
                  { value: "system", label: "System" },
                ]}
              />
            }
          />
          <SettingsRow
            title="Reduce visual intensity"
            description="Immediately softens contrast, saturation, backgrounds, media, and accent colors throughout SomatoSync."
            control={
              <Switch
                checked={reducedVisualIntensity}
                onCheckedChange={setReducedVisualIntensity}
                aria-label="Reduce visual intensity"
              />
            }
          />
        </div>

        <PanelDivider />

        <h3 className="mb-1 text-[16px] font-semibold text-[var(--color-text-primary)]">In-app notifications</h3>
        <div className="divide-y divide-[var(--color-border)]">
          <SettingsRow
            title="Notification center"
            description="Shows or hides the notification bell and all in-app notices. SomatoSync does not send background push notifications."
            control={<Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} aria-label="Notification center" />}
          />
          <SettingsRow
            title="Assessment reminders"
            description="Adds today’s suggested check-ins to the notification center. Turn this off to keep the schedule available without reminder notices."
            control={
              <Switch
                checked={assessmentRemindersEnabled}
                disabled={!notificationsEnabled}
                onCheckedChange={setAssessmentRemindersEnabled}
                aria-label="Assessment reminders"
              />
            }
          />
        </div>

        <PanelDivider />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">Privacy and data controls</h3>
            <p className="mt-0.5 text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
              Export or delete the local recovery record from the working Privacy & Data page.
            </p>
          </div>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/app/privacy"><ShieldCheck className="h-3.5 w-3.5" /> Open Privacy & Data <ExternalLink className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </Panel>
    </div>
  );
}
