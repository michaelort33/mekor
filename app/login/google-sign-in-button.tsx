"use client";

import Script from "next/script";
import { useCallback, useRef, useState } from "react";

import styles from "./page.module.css";

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (input: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            context?: "signin";
            ux_mode?: "popup";
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type: "standard";
              theme: "outline";
              size: "large";
              text: "signin_with";
              shape: "rectangular";
              width: number;
            },
          ) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({
  nextPath,
  familyInviteToken,
}: {
  nextPath: string;
  familyInviteToken: string;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const buttonRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCredential = useCallback(
    async (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        setError("Google sign-in did not return a credential.");
        return;
      }

      setError("");
      setSubmitting(true);
      const result = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: response.credential,
          familyInviteToken: familyInviteToken || undefined,
        }),
      });
      const data = (await result.json().catch(() => ({}))) as { error?: string };
      if (!result.ok) {
        setError(data.error || "Google sign-in failed");
        setSubmitting(false);
        return;
      }

      window.location.assign(nextPath);
    },
    [familyInviteToken, nextPath],
  );

  const renderButton = useCallback(() => {
    if (!clientId || !buttonRef.current || !window.google || renderedRef.current) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredential,
      context: "signin",
      ux_mode: "popup",
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: 300,
    });
    renderedRef.current = true;
  }, [clientId, handleCredential]);

  if (!clientId) {
    return null;
  }

  return (
    <div className={styles.googleAuth}>
      <div className={styles.divider}>or</div>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={renderButton}
        onReady={renderButton}
      />
      <div ref={buttonRef} className={styles.googleButton} aria-label="Sign in with Google" />
      {submitting ? <p className={styles.googleStatus}>Signing in with Google…</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
