import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout, DemoAccessButton } from "./AuthLayout";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useAppMode } from "../../context/AppModeContext";

export function CreateAccountPage() {
  const navigate = useNavigate();
  const { enterDemo, enterUser } = useAppMode();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function openDemo() {
    enterDemo();
    navigate("/app");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (form.name.trim().length < 2) nextErrors.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = "Enter a valid email address.";
    if (form.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    if (!agreed) nextErrors.agreed = "You must accept the Terms and Privacy Policy to continue.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      enterUser(form.name, form.email.toLowerCase());
      navigate("/app");
    }, 500);
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start with a blank recovery record using email and password.">
      <DemoAccessButton onClick={openDemo} />

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-[14.5px] text-[var(--color-text-tertiary)]">or create a blank account</span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            invalid={!!errors.name}
            placeholder="Your name"
            autoComplete="name"
          />
          {errors.name && <p className="text-[14.5px] text-[var(--color-risk)]">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            invalid={!!errors.email}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {errors.email && <p className="text-[14.5px] text-[var(--color-risk)]">{errors.email}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            invalid={!!errors.password}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          {errors.password && <p className="text-[14.5px] text-[var(--color-risk)]">{errors.password}</p>}
        </div>

        <label className="flex items-start gap-2.5 text-[14.5px] leading-snug text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-[var(--color-border-strong)] accent-[var(--color-accent)]"
          />
          <span>
            I agree to the{" "}
            <Link to="/terms" target="_blank" className="font-medium text-[var(--color-accent)] hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy-policy" target="_blank" className="font-medium text-[var(--color-accent)] hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.agreed && <p className="text-[14.5px] text-[var(--color-risk)]">{errors.agreed}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Create blank account"}
        </Button>
      </form>

      <p className="mt-5 text-center text-[14px] text-[var(--color-text-secondary)]">
        Already have an account?{" "}
        <Link to="/sign-in" className="font-medium text-[var(--color-accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
