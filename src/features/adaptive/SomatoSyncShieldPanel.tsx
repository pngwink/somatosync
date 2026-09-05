import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { broadcastShieldProfile, requestShieldStatus } from "./shieldBridge";
import { useNeuroAdaptive } from "./NeuroAdaptiveContext";

export function SomatoSyncShieldPanel() {
  const { settings } = useNeuroAdaptive();
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as { source?: string; type?: string } | null;
      if (data?.source === "somatosync-shield-extension" && (data.type === "SOMATOSYNC_SHIELD_READY" || data.type === "SOMATOSYNC_SHIELD_SAVED")) {
        setConnected(true);
        if (data.type === "SOMATOSYNC_SHIELD_SAVED") setSynced(true);
      }
    };
    window.addEventListener("message", onMessage);
    requestShieldStatus();
    const timer = window.setTimeout(requestShieldStatus, 450);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  function sync() {
    setSynced(false);
    broadcastShieldProfile(settings);
  }

  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">SomatoSync Shield</h2>{connected && <span className="rounded-full bg-[var(--color-positive-soft)] px-2.5 py-1 text-[16px] font-semibold text-[var(--color-positive)]">Connected</span>}</div>
            <p className="mt-1 max-w-[62ch] text-[16px] leading-7 text-[var(--color-text-secondary)]">Carry your current Focus accessibility setup onto other websites—with per-site approval before anything changes.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          {connected ? <Button onClick={sync}>{synced ? "Setup synced" : "Sync setup"}</Button> : <Button variant="secondary" disabled>Not connected</Button>}
        </div>
      </div>

      <details className="mt-5 rounded-[14px] border border-[var(--color-border)] px-4 py-3">
        <summary className="cursor-pointer text-[16px] font-semibold text-[var(--color-accent)]">Shield details</summary>
        <div className="mt-3 space-y-3 text-[16px] leading-6 text-[var(--color-text-secondary)]">
          <p>Shield can change typography, reading width, low-luminance colors, media intensity, motion, obvious promotional clutter, and optional reading-focus support based on your current Focus setup. Navigation and sidebars stay available. A new website is never transformed until you approve it, unless you explicitly choose “Always use on this site.”</p>
          {!connected && <p>The ZIP includes <strong className="text-[var(--color-text-primary)]">somatosync-shield-extension</strong>. Load that folder as an unpacked Chrome extension, then reopen SomatoSync.</p>}
        </div>
      </details>
    </Card>
  );
}
