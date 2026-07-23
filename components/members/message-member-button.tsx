"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./message-member-button.module.css";

type MessageMemberButtonProps = {
  recipientUserId: number;
  label?: string;
  variant?: "primary" | "secondary";
  className?: string;
};

export function MessageMemberButton({
  recipientUserId,
  label = "Message",
  variant = "primary",
  className,
}: MessageMemberButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startConversation() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/inbox/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientUserId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        threadId?: number;
        error?: string;
      };
      if (!response.ok || !payload.threadId) {
        setError(payload.error || "Unable to start conversation");
        return;
      }
      router.push(`/account/inbox?thread=${payload.threadId}`);
    } catch {
      setError("Unable to start conversation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(" ")}>
      <button
        type="button"
        className={`${styles.button} ${variant === "secondary" ? styles.secondary : styles.primary}`}
        onClick={() => void startConversation()}
        disabled={loading}
      >
        {loading ? "Opening…" : label}
      </button>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
