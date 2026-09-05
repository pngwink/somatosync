import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { useToast } from "../../components/shared/Toast";
import { deleteAllSomatoSyncData } from "./privacyStorage";

const CONFIRM_PHRASE = "DELETE";

export function DeleteDataSection({
  disabled,
  entryCount,
  onDeleted,
}: {
  disabled: boolean;
  entryCount: number;
  onDeleted: () => void;
}) {
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const canDelete = confirmText.trim() === CONFIRM_PHRASE;

  const closeDialog = () => {
    setOpen(false);
    setConfirmText("");
  };

  const handleDelete = () => {
    if (!canDelete) return;
    const result = deleteAllSomatoSyncData();
    onDeleted();
    closeDialog();

    const message = result.success
      ? `Removed ${result.removedCount} ${result.removedCount === 1 ? "entry" : "entries"} from this device.`
      : `Removed ${result.removedCount} of ${result.removedCount + result.failedKeys.length} entries. Some entries couldn't be removed -- try again or clear site data from your browser settings.`;

    setStatusMessage(message);
    show({
      title: result.success ? "Data deleted" : "Some data couldn't be deleted",
      description: message,
      tone: result.success ? "success" : "error",
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-[16px] leading-relaxed text-[var(--color-text-secondary)]">
        Permanently remove all SomatoSync data stored on this device. This does not affect data on other devices or
        browsers, and cannot be undone.
      </p>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled || entryCount === 0}
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete all local SomatoSync data
      </Button>
      <p role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </p>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setConfirmText("");
        }}
      >
        <DialogContent aria-describedby="delete-data-description">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[var(--color-risk)]" aria-hidden="true" />
            <div>
              <DialogTitle>Delete all local SomatoSync data?</DialogTitle>
              <DialogDescription id="delete-data-description">
                This permanently removes {entryCount} {entryCount === 1 ? "entry" : "entries"} stored on this
                device, including check-ins, assessment history, and settings. This action cannot be undone, and
                data on other devices or browsers is not affected.
              </DialogDescription>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="delete-confirm-input">
              Type <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span> to confirm
            </Label>
            <Input
              id="delete-confirm-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              autoFocus
              aria-describedby="delete-data-description"
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={closeDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!canDelete}>
              <Trash2 className="h-3.5 w-3.5" /> Delete permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
