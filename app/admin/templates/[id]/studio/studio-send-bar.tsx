"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  StudioRecipientPicker,
  type StudioSubscriberOption,
} from "./studio-recipient-picker";
import styles from "./page.module.css";

type StudioSendBarProps = {
  subject: string;
  onSubjectChange: (value: string) => void;
  selectedRecipients: StudioSubscriberOption[];
  onAddRecipient: (option: StudioSubscriberOption) => void;
  onRemoveRecipient: (personId: number) => void;
  onRecipientError?: (message: string) => void;
  sending: boolean;
  confirmOpen: boolean;
  onConfirmOpenChange: (open: boolean) => void;
  onPreview: () => void;
  onConfirmSend: () => void;
};

export function StudioSendBar({
  subject,
  onSubjectChange,
  selectedRecipients,
  onAddRecipient,
  onRemoveRecipient,
  onRecipientError,
  sending,
  confirmOpen,
  onConfirmOpenChange,
  onPreview,
  onConfirmSend,
}: StudioSendBarProps) {
  const disableActions = sending || selectedRecipients.length === 0;

  return (
    <section className={styles.sendBar} aria-label="Send newsletter">
      <div className={styles.sendFields}>
        <div className="grid gap-2">
          <Label htmlFor="studio-subject">Subject</Label>
          <Input
            id="studio-subject"
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            className="h-11 rounded-xl"
          />
        </div>

        <div className="grid gap-2">
          <Label>Recipients</Label>
          <StudioRecipientPicker
            selected={selectedRecipients}
            onAdd={onAddRecipient}
            onRemove={onRemoveRecipient}
            onError={onRecipientError}
          />
        </div>
      </div>

      <div className={styles.sendActions}>
        <Button type="button" variant="secondary" disabled={disableActions} onClick={onPreview}>
          {sending ? "Working…" : "Preview recipients"}
        </Button>
        <Button
          type="button"
          variant="default"
          disabled={disableActions}
          className="bg-[linear-gradient(180deg,#8b2e2e_0%,#6d2424_100%)] hover:bg-[linear-gradient(180deg,#7a2828_0%,#5c1e1e_100%)]"
          onClick={() => onConfirmOpenChange(true)}
        >
          {`Send to ${selectedRecipients.length || "…"}`}
        </Button>
        <p className={styles.statusText}>
          Uses the current HTML snapshot through the existing SendGrid campaign pipeline.
        </p>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={onConfirmOpenChange}>
        <AlertDialogContent size="default" className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Send newsletter?</AlertDialogTitle>
            <AlertDialogDescription>
              Subject: <strong>{subject || "(missing subject)"}</strong>
              <br />
              This emails {selectedRecipients.length} confirmed weekly subscriber
              {selectedRecipients.length === 1 ? "" : "s"} via SendGrid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className={styles.confirmList}>
            {selectedRecipients.slice(0, 12).map((recipient) => (
              <li key={recipient.personId}>
                {recipient.displayName} &lt;{recipient.email}&gt;
              </li>
            ))}
            {selectedRecipients.length > 12 ? (
              <li>…and {selectedRecipients.length - 12} more</li>
            ) : null}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              variant="default"
              className="bg-[linear-gradient(180deg,#8b2e2e_0%,#6d2424_100%)]"
              onClick={(event) => {
                event.preventDefault();
                onConfirmSend();
              }}
            >
              {sending ? "Sending…" : "Confirm send"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
