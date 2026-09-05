import { useState } from "react";
import { PageHeader } from "../components/shared/PageHeader";
import { Panel, PanelDivider } from "../components/shared/Panel";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { useToast } from "../components/shared/Toast";
import { currentPatient } from "../data/patient";
import { formatDate } from "../lib/utils";
import { useAppMode } from "../context/AppModeContext";

export function ProfilePage() {
  const { show } = useToast();
  const { mode, userName, userId, enterUser } = useAppMode();
  const isDemo = mode === "demo";
  const [form, setForm] = useState({
    name: isDemo ? currentPatient.name : userName,
    dateOfBirth: isDemo ? currentPatient.dateOfBirth : "",
    activity: isDemo ? currentPatient.activity : "",
    injuryDate: isDemo ? currentPatient.injuryDate : "",
    school: isDemo ? currentPatient.school ?? "" : "",
    providerName: isDemo ? currentPatient.provider.name : "",
    emergencyName: isDemo ? currentPatient.emergencyContact?.name ?? "" : "",
    emergencyPhone: isDemo ? currentPatient.emergencyContact?.phone ?? "" : "",
  });

  const initials = form.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "NU";

  function handleSave() {
    if (!isDemo) enterUser(form.name, userId);
    show({
      title: isDemo ? "Demo profile unchanged" : "Profile updated",
      description: isDemo ? "Maya Chen's sample profile is read-only for this prototype." : "Your changes have been saved.",
      tone: "success",
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Profile" context="Details used across your recovery record." />

      <Panel
        title={form.name || "New User"}
        description={
          isDemo
            ? `Demo profile · Age ${currentPatient.age} · Injured ${formatDate(currentPatient.injuryDate, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}`
            : "Add your own information. No Maya Chen details are copied into this account."
        }
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-[16px]">{initials}</AvatarFallback>
          </Avatar>
          <p className="text-[16px] text-[var(--color-text-secondary)]">
            {form.activity || (isDemo ? currentPatient.activity : "No sport or activity added yet")}
          </p>
        </div>

        <PanelDivider />

        <h3 className="mb-3 text-[16px] font-semibold text-[var(--color-text-primary)]">Personal information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={form.name} disabled={isDemo} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" type="date" value={form.dateOfBirth} disabled={isDemo} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="activity">Sport or activity</Label>
            <Input id="activity" value={form.activity} disabled={isDemo} onChange={(e) => setForm({ ...form, activity: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="injury-date">Injury date</Label>
            <Input id="injury-date" type="date" value={form.injuryDate} disabled={isDemo} onChange={(e) => setForm({ ...form, injuryDate: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="school">School or workplace</Label>
            <Input id="school" value={form.school} disabled={isDemo} onChange={(e) => setForm({ ...form, school: e.target.value })} />
          </div>
        </div>

        <PanelDivider />

        <h3 className="mb-3 text-[16px] font-semibold text-[var(--color-text-primary)]">Care team</h3>
        <div className="space-y-1.5">
          <Label htmlFor="provider">Healthcare provider</Label>
          <Input id="provider" value={form.providerName} disabled={isDemo} onChange={(e) => setForm({ ...form, providerName: e.target.value })} />
        </div>

        <PanelDivider />

        <h3 className="mb-3 text-[16px] font-semibold text-[var(--color-text-primary)]">Emergency contact</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ec-name">Name</Label>
            <Input id="ec-name" value={form.emergencyName} disabled={isDemo} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ec-phone">Phone</Label>
            <Input id="ec-phone" type="tel" value={form.emergencyPhone} disabled={isDemo} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
          </div>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button onClick={handleSave}>{isDemo ? "Demo profile is read-only" : "Save changes"}</Button>
      </div>
    </div>
  );
}
