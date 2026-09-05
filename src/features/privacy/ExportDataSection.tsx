import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/shared/Toast";
import { downloadDataExport } from "./privacyExport";

export function ExportDataSection({ disabled, entryCount }: { disabled: boolean; entryCount: number }) {
  const { show } = useToast();
  const [statusMessage, setStatusMessage] = useState("");

  const handleExport = () => {
    try {
      downloadDataExport();
      const message =
        entryCount === 0
          ? "Export downloaded. No SomatoSync data was found, so the file contains an empty entry list."
          : `Export downloaded with ${entryCount} ${entryCount === 1 ? "entry" : "entries"}.`;
      setStatusMessage(message);
      show({ title: "Export downloaded", description: message, tone: "success" });
    } catch {
      const message = "The export couldn't be created. Please try again.";
      setStatusMessage(message);
      show({ title: "Export failed", description: message, tone: "error" });
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
        Download a JSON file containing every SomatoSync entry stored on this device, exactly as it's stored. This
        file stays on your device and is not uploaded anywhere.
      </p>
      <Button variant="secondary" size="sm" onClick={handleExport} disabled={disabled}>
        <Download className="h-3.5 w-3.5" /> Export my data
      </Button>
      <p role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </p>
    </div>
  );
}
