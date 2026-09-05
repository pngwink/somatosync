import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--color-bg)] px-4 text-center">
      <p className="font-mono text-[14px] text-[var(--color-text-tertiary)]">404</p>
      <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">Page not found</h1>
      <p className="max-w-sm text-[14.5px] text-[var(--color-text-secondary)]">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Button asChild className="mt-2">
        <Link to="/app">Back to overview</Link>
      </Button>
    </div>
  );
}
