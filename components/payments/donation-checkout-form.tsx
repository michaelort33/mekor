"use client";

import { useState } from "react";

import { DESIGNATION_OPTIONS } from "@/lib/payments/shared";
import styles from "./donation-checkout-form.module.css";

export function DonationCheckoutForm({
  title = "Give online",
  description = "Choose the designation clearly so the gift is classified correctly downstream.",
  defaultAmountCents = 1800,
  defaultDesignation = "General donation",
  campaignId = null,
  kind = "donation",
  returnPath = "/donations",
}: {
  title?: string;
  description?: string;
  defaultAmountCents?: number;
  defaultDesignation?: string;
  campaignId?: number | null;
  kind?: "donation" | "campaign_donation" | "membership_dues";
  returnPath?: string;
}) {
  const [amount, setAmount] = useState(String(defaultAmountCents / 100));
  const [designation, setDesignation] = useState(defaultDesignation);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      setError("Enter a valid amount of at least $1.00.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/donations/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents,
        designation,
        donorName,
        donorEmail,
        donorPhone,
        campaignId,
        kind,
        returnPath,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
    if (!response.ok || !payload.url) {
      setError(payload.error || "Unable to start checkout.");
      setLoading(false);
      return;
    }

    window.location.assign(payload.url);
  }

  return (
    <section className={styles.shell}>
      <div className={styles.card}>
        <div className={styles.intro}>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>

        <form onSubmit={onSubmit} className={styles.shell}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Donation amount (USD)</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>

            <label className={styles.field}>
              <span>What is this donation for?</span>
              <select value={designation} onChange={(event) => setDesignation(event.target.value)}>
                {DESIGNATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                {DESIGNATION_OPTIONS.includes(defaultDesignation as never) ? null : (
                  <option value={defaultDesignation}>{defaultDesignation}</option>
                )}
              </select>
            </label>

            <label className={styles.field}>
              <span>Donor name</span>
              <input value={donorName} onChange={(event) => setDonorName(event.target.value)} required />
            </label>

            <label className={styles.field}>
              <span>Email for receipt</span>
              <input type="email" value={donorEmail} onChange={(event) => setDonorEmail(event.target.value)} required />
            </label>

            <label className={styles.field}>
              <span>Phone</span>
              <input value={donorPhone} onChange={(event) => setDonorPhone(event.target.value)} />
            </label>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Opening checkout..." : "Continue to secure payment"}
            </button>
            <p className={styles.note}>
              The thank-you note is distinct from the tax receipt. Qualifying gifts receive a separate standardized receipt for tax records.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
