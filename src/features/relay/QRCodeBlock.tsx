import { useEffect, useRef, useState } from "react";

interface QRCodeConstructor {
  new (element: HTMLElement, options: { text: string; width: number; height: number; colorDark: string; colorLight: string; correctLevel: number }): unknown;
}

declare global {
  interface Window { QRCode?: QRCodeConstructor; }
}

export function QRCodeBlock({ value }: { value: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const render = () => {
      if (cancelled || !ref.current) return;
      if (!window.QRCode) {
        attempts += 1;
        if (attempts < 25) window.setTimeout(render, 120);
        return;
      }
      ref.current.innerHTML = "";
      try {
        new window.QRCode(ref.current, { text: value, width: 188, height: 188, colorDark: "#111827", colorLight: "#ffffff", correctLevel: 0 });
        setReady(true);
      } catch {
        setReady(false);
      }
    };
    render();
    return () => { cancelled = true; };
  }, [value]);

  return (
    <div className="flex min-h-[212px] w-full items-center justify-center rounded-[18px] border border-[var(--color-border)] bg-white p-3">
      <div ref={ref} aria-label="QR code for shared supports" />
      {!ready && <p className="max-w-[180px] text-center text-[16px] leading-relaxed text-slate-600">QR preview unavailable. The copyable link still works.</p>}
    </div>
  );
}
