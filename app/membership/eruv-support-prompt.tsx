"use client";

import { useId, useState } from "react";

import styles from "./page.module.css";

/** Direct PayPal donate button used by centercityeruv.com — separate from Mekor membership payments. */
export const CENTER_CITY_ERUV_PAYPAL_DONATE =
  "https://www.paypal.com/donate/?hosted_button_id=MP2WKX3QTP34Y";

const CENTER_CITY_ERUV_SITE = "https://www.centercityeruv.com/";

export function EruvSupportPrompt() {
  const checkboxId = useId();
  const descriptionId = useId();
  const [selected, setSelected] = useState(false);

  return (
    <aside className={styles.eruvPrompt} aria-labelledby="eruv-support-title">
      <div className={styles.eruvPromptHeader}>
        <p className={styles.sectionEyebrow}>Optional community support</p>
        <h2 id="eruv-support-title" className={styles.eruvPromptTitle}>
          Center City Eruv
        </h2>
      </div>

      <p id={descriptionId} className={styles.eruvPromptCopy}>
        If your household benefits from the eruv, you&apos;re welcome to make an optional{" "}
        <strong>$100/year</strong> supporting contribution. It is processed separately through PayPal — not part of
        Mekor membership dues, checkout, or invoices.{" "}
        <a href={CENTER_CITY_ERUV_SITE} target="_blank" rel="noopener noreferrer">
          Learn more
        </a>
      </p>

      <div className={styles.eruvPromptControls}>
        <label className={styles.eruvCheckboxRow} htmlFor={checkboxId}>
          <input
            id={checkboxId}
            type="checkbox"
            checked={selected}
            onChange={(event) => setSelected(event.target.checked)}
            aria-describedby={descriptionId}
          />
          <span>I&apos;d like to contribute $100/year via PayPal (optional)</span>
        </label>

        {selected ? (
          <a
            className={styles.eruvDonateButton}
            href={CENTER_CITY_ERUV_PAYPAL_DONATE}
            target="_blank"
            rel="noopener noreferrer"
          >
            Continue to PayPal
          </a>
        ) : (
          <button type="button" className={styles.eruvDonateButtonDisabled} disabled>
            Continue to PayPal
          </button>
        )}
      </div>

      <p className={styles.eruvPromptFootnote}>
        Opens PayPal in a new tab. This does not complete a donation or change your membership application.
      </p>
    </aside>
  );
}
