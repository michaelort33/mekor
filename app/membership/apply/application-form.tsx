"use client";

import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from "react";

import { usePublicProfilePrefill } from "@/components/forms/use-public-profile-prefill";
import {
  buildApplicantDisplayName,
  calculateMembershipEstimate,
  formatUsd,
  getApplicationTypeLabel,
  getMembershipCategoryLabel,
  getMembershipCategoryOptions,
  getPaymentMethodLabel,
  PAYMENT_METHOD_PREFERENCE,
  type MembershipApplicationRecordInput,
  VOLUNTEER_INTEREST_OPTIONS,
} from "@/lib/membership/applications";
import styles from "./page.module.css";

type HouseholdRow = {
  name: string;
  hebrewName: string;
  relationship: string;
};

type YahrzeitRow = {
  name: string;
  relationship: string;
  hebrewDate: string;
  englishDate: string;
};

type FormState = MembershipApplicationRecordInput;

const STEPS = [
  { id: "membership", label: "Membership", short: "1" },
  { id: "details", label: "You", short: "2" },
  { id: "household", label: "Household", short: "3" },
  { id: "finish", label: "Finish", short: "4" },
  { id: "review", label: "Review", short: "5" },
] as const;

const emptyHouseholdRow: HouseholdRow = { name: "", hebrewName: "", relationship: "" };
const emptyYahrzeitRow: YahrzeitRow = { name: "", relationship: "", hebrewDate: "", englishDate: "" };

const initialState: FormState = {
  applicationType: "new",
  membershipCategory: "single",
  includeSecurityDonation: true,
  coverOnlineFees: false,
  preferredPaymentMethod: "undecided",
  firstName: "",
  lastName: "",
  hebrewName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "Philadelphia",
  state: "PA",
  postalCode: "",
  spouseFirstName: "",
  spouseLastName: "",
  spouseHebrewName: "",
  spouseEmail: "",
  spousePhone: "",
  householdMembers: [],
  yahrzeits: [],
  volunteerInterests: [],
  notes: "",
  sourcePath: "/membership/apply",
};

function sanitizeRows<T extends { name: string }>(rows: T[]) {
  return rows.filter((row) => row.name.trim().length > 0);
}

function FieldLabel({ children, required, hint }: { children: string; required?: boolean; hint?: string }) {
  return (
    <span className={styles.fieldLabel}>
      <span>
        {children}
        {required ? <span className={styles.requiredMark} aria-hidden="true"> *</span> : null}
      </span>
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </span>
  );
}

export function MembershipApplicationForm() {
  const profile = usePublicProfilePrefill();
  const isAuthenticated = Boolean(profile?.email);
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [accountPassword, setAccountPassword] = useState("");
  const [accountConfirmPassword, setAccountConfirmPassword] = useState("");
  const [prefillTouched, setPrefillTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    city: false,
  });
  const [householdRows, setHouseholdRows] = useState<HouseholdRow[]>([]);
  const [yahrzeitRows, setYahrzeitRows] = useState<YahrzeitRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [stepError, setStepError] = useState("");
  const estimate = useMemo(
    () =>
      calculateMembershipEstimate({
        membershipCategory: form.membershipCategory,
        includeSecurityDonation: form.includeSecurityDonation,
      }),
    [form.includeSecurityDonation, form.membershipCategory],
  );
  const membershipCategoryOptions = useMemo(() => getMembershipCategoryOptions(), []);
  const paysByCard = form.preferredPaymentMethod === "credit_card";

  const resolvedFirstName = prefillTouched.firstName ? form.firstName : form.firstName || profile?.firstName || "";
  const resolvedLastName = prefillTouched.lastName ? form.lastName : form.lastName || profile?.lastName || "";
  const resolvedEmail = prefillTouched.email ? form.email : form.email || profile?.email || "";
  const resolvedPhone = prefillTouched.phone ? form.phone : form.phone || profile?.phone || "";
  const resolvedCity = prefillTouched.city ? form.city : form.city === initialState.city ? profile?.city || form.city : form.city;

  const displayName = useMemo(
    () => buildApplicantDisplayName({ firstName: resolvedFirstName, lastName: resolvedLastName }),
    [resolvedFirstName, resolvedLastName],
  );

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onTextChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = event.target;
    if (type === "checkbox" && event.target instanceof HTMLInputElement) {
      updateField(name as keyof FormState, event.target.checked as never);
      return;
    }
    if (name === "firstName" || name === "lastName" || name === "email" || name === "phone" || name === "city") {
      setPrefillTouched((current) => ({ ...current, [name]: true }));
    }
    updateField(name as keyof FormState, value as never);
  }

  function updateHouseholdRow(index: number, key: keyof HouseholdRow, value: string) {
    setHouseholdRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  }

  function updateYahrzeitRow(index: number, key: keyof YahrzeitRow, value: string) {
    setYahrzeitRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  }

  function toggleVolunteerInterest(value: string) {
    setForm((current) => ({
      ...current,
      volunteerInterests: current.volunteerInterests.includes(value)
        ? current.volunteerInterests.filter((item) => item !== value)
        : [...current.volunteerInterests, value],
    }));
  }

  function validateStep(index: number) {
    if (index === 1) {
      if (!resolvedFirstName.trim() || !resolvedLastName.trim()) {
        return "Please enter your first and last name.";
      }
      if (!resolvedEmail.trim() || !resolvedEmail.includes("@")) {
        return "Please enter a valid email address.";
      }
      if (!resolvedPhone.trim()) {
        return "Please enter a phone number so we can reach you.";
      }
      if (!form.addressLine1.trim() || !resolvedCity.trim() || !form.state.trim() || !form.postalCode.trim()) {
        return "Please complete your street address, city, state, and ZIP.";
      }
    }
    if (index === 3 && !isAuthenticated) {
      if (accountPassword.length < 8) {
        return "Choose a password with at least 8 characters.";
      }
      if (accountPassword !== accountConfirmPassword) {
        return "Passwords do not match. Re-enter the same password in both fields.";
      }
    }
    return "";
  }

  function goNext() {
    const message = validateStep(step);
    if (message) {
      setStepError(message);
      return;
    }
    setStepError("");
    setError("");
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError("");
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      goNext();
      return;
    }

    const finalCheck = validateStep(1) || validateStep(3);
    if (finalCheck) {
      setError(finalCheck);
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      ...form,
      firstName: resolvedFirstName,
      lastName: resolvedLastName,
      email: resolvedEmail,
      phone: resolvedPhone,
      city: resolvedCity,
      householdMembers: sanitizeRows(householdRows),
      yahrzeits: sanitizeRows(yahrzeitRows),
    };

    const response = await fetch("/api/membership-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        password: isAuthenticated ? undefined : accountPassword,
        confirmPassword: isAuthenticated ? undefined : accountConfirmPassword,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { applicationId?: number; error?: string };
    if (!response.ok || !data.applicationId) {
      setError(data.error || "We couldn't submit your application. Check the highlighted fields and try again.");
      setSubmitting(false);
      return;
    }

    if (payload.preferredPaymentMethod === "credit_card") {
      const checkoutResponse = await fetch(`/api/membership-applications/${data.applicationId}/checkout`, {
        method: "POST",
      });
      const checkoutPayload = (await checkoutResponse.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!checkoutResponse.ok || !checkoutPayload.url) {
        setError(
          checkoutPayload.error ||
            "Your application was saved, but we couldn't open card checkout. Open your account to finish payment, or email the membership team.",
        );
        setSubmitting(false);
        return;
      }
      window.location.assign(checkoutPayload.url);
      return;
    }

    setSubmitting(false);
    setForm(initialState);
    setPrefillTouched({
      firstName: false,
      lastName: false,
      email: false,
      phone: false,
      city: false,
    });
    setHouseholdRows([]);
    setYahrzeitRows([]);
    setAccountPassword("");
    setAccountConfirmPassword("");
    window.location.assign("/account?membership=pending");
  }

  const submitLabel = submitting
    ? paysByCard
      ? "Opening secure checkout…"
      : "Submitting…"
    : paysByCard
      ? `Submit and pay ${formatUsd(estimate.totalAmountCents)}`
      : "Submit membership application";

  return (
    <section className={styles.formShell} aria-labelledby="application-form-title">
      <div className={styles.progressBar} role="navigation" aria-label="Application steps">
        {STEPS.map((item, index) => {
          const state = index === step ? "current" : index < step ? "done" : "upcoming";
          return (
            <button
              key={item.id}
              type="button"
              className={styles.progressStep}
              data-state={state}
              onClick={() => {
                if (index <= step) {
                  setStepError("");
                  setStep(index);
                }
              }}
              disabled={index > step}
              aria-current={index === step ? "step" : undefined}
            >
              <span className={styles.progressIndex}>{item.short}</span>
              <span className={styles.progressLabel}>{item.label}</span>
            </button>
          );
        })}
      </div>

      <form ref={formRef} onSubmit={onSubmit} className={styles.formGrid} noValidate>
        <div className={styles.formColumn}>
          {step === 0 ? (
            <section className={styles.formPanel}>
              <header className={styles.panelHeader}>
                <h2 id="application-form-title" className={styles.cardTitle}>
                  Membership type and estimate
                </h2>
                <p className={styles.helperText}>Choose the category that fits your household. You can change payment preference before submitting.</p>
              </header>
              <div className={styles.inlineGrid}>
                <label className={styles.field}>
                  <FieldLabel required>Application type</FieldLabel>
                  <select name="applicationType" value={form.applicationType} onChange={onTextChange}>
                    <option value="new">New member</option>
                    <option value="renewal">Renewing member</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <FieldLabel required>Membership category</FieldLabel>
                  <select name="membershipCategory" value={form.membershipCategory} onChange={onTextChange}>
                    {membershipCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={styles.toggleGrid}>
                <label className={styles.checkboxCard}>
                  <input
                    type="checkbox"
                    name="includeSecurityDonation"
                    checked={form.includeSecurityDonation}
                    onChange={onTextChange}
                  />
                  <span>
                    Include the suggested <strong>$100 security fee donation</strong>
                  </span>
                </label>
                <label className={styles.checkboxCard}>
                  <input type="checkbox" name="coverOnlineFees" checked={form.coverOnlineFees} onChange={onTextChange} />
                  <span>I&apos;d like to cover online processing fees if I pay by card</span>
                </label>
              </div>
              <label className={styles.field}>
                <FieldLabel required hint="Card checkout opens after submit if you choose credit card">
                  Preferred payment method
                </FieldLabel>
                <select name="preferredPaymentMethod" value={form.preferredPaymentMethod} onChange={onTextChange}>
                  {PAYMENT_METHOD_PREFERENCE.map((option) => (
                    <option key={option} value={option}>
                      {getPaymentMethodLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
              {paysByCard ? (
                <p className={styles.infoBanner} role="status">
                  After you submit, we&apos;ll open Stripe secure checkout for {formatUsd(estimate.totalAmountCents)}. Your application is still saved if checkout is interrupted.
                </p>
              ) : (
                <p className={styles.helperText}>
                  Paying later by check, Venmo, or PayPal? Submit the application first — the membership team will confirm payment details after review.
                </p>
              )}
            </section>
          ) : null}

          {step === 1 ? (
            <section className={styles.formPanel}>
              <header className={styles.panelHeader}>
                <h2 id="application-form-title" className={styles.cardTitle}>
                  Your contact details
                </h2>
                <p className={styles.helperText}>
                  {isAuthenticated
                    ? "We prefilled what we already know from your account. Confirm or update anything that looks outdated."
                    : "Use the email you want for Mekor updates and account access."}
                </p>
              </header>
              <div className={styles.inlineGrid}>
                <label className={styles.field}>
                  <FieldLabel required>First name</FieldLabel>
                  <input name="firstName" autoComplete="given-name" value={resolvedFirstName} onChange={onTextChange} required />
                </label>
                <label className={styles.field}>
                  <FieldLabel required>Last name</FieldLabel>
                  <input name="lastName" autoComplete="family-name" value={resolvedLastName} onChange={onTextChange} required />
                </label>
              </div>
              <div className={styles.inlineGrid}>
                <label className={styles.field}>
                  <FieldLabel hint="Optional">Hebrew name</FieldLabel>
                  <input name="hebrewName" value={form.hebrewName} onChange={onTextChange} />
                </label>
                <label className={styles.field}>
                  <FieldLabel required>Email</FieldLabel>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={resolvedEmail}
                    onChange={onTextChange}
                    required
                    readOnly={isAuthenticated}
                  />
                </label>
              </div>
              <div className={styles.inlineGrid}>
                <label className={styles.field}>
                  <FieldLabel required>Phone</FieldLabel>
                  <input name="phone" type="tel" autoComplete="tel" inputMode="tel" value={resolvedPhone} onChange={onTextChange} required />
                </label>
                <label className={styles.field}>
                  <FieldLabel required>Street address</FieldLabel>
                  <input name="addressLine1" autoComplete="address-line1" value={form.addressLine1} onChange={onTextChange} required />
                </label>
              </div>
              <label className={styles.field}>
                <FieldLabel hint="Apartment, suite, etc.">Address line 2</FieldLabel>
                <input name="addressLine2" autoComplete="address-line2" value={form.addressLine2} onChange={onTextChange} />
              </label>
              <div className={styles.inlineGridTriple}>
                <label className={styles.field}>
                  <FieldLabel required>City</FieldLabel>
                  <input name="city" autoComplete="address-level2" value={resolvedCity} onChange={onTextChange} required />
                </label>
                <label className={styles.field}>
                  <FieldLabel required>State</FieldLabel>
                  <input name="state" autoComplete="address-level1" value={form.state} onChange={onTextChange} required />
                </label>
                <label className={styles.field}>
                  <FieldLabel required>ZIP</FieldLabel>
                  <input name="postalCode" autoComplete="postal-code" inputMode="numeric" value={form.postalCode} onChange={onTextChange} required />
                </label>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <>
              <section className={styles.formPanel}>
                <header className={styles.panelHeader}>
                  <h2 id="application-form-title" className={styles.cardTitle}>
                    Spouse or partner
                  </h2>
                  <p className={styles.helperText}>Optional. Skip this step if it doesn&apos;t apply — you can still continue.</p>
                </header>
                <div className={styles.inlineGrid}>
                  <label className={styles.field}>
                    <FieldLabel>First name</FieldLabel>
                    <input name="spouseFirstName" autoComplete="off" value={form.spouseFirstName} onChange={onTextChange} />
                  </label>
                  <label className={styles.field}>
                    <FieldLabel>Last name</FieldLabel>
                    <input name="spouseLastName" autoComplete="off" value={form.spouseLastName} onChange={onTextChange} />
                  </label>
                </div>
                <div className={styles.inlineGrid}>
                  <label className={styles.field}>
                    <FieldLabel>Hebrew name</FieldLabel>
                    <input name="spouseHebrewName" value={form.spouseHebrewName} onChange={onTextChange} />
                  </label>
                  <label className={styles.field}>
                    <FieldLabel>Email</FieldLabel>
                    <input name="spouseEmail" type="email" autoComplete="off" value={form.spouseEmail} onChange={onTextChange} />
                  </label>
                </div>
                <label className={styles.field}>
                  <FieldLabel>Phone</FieldLabel>
                  <input name="spousePhone" type="tel" autoComplete="off" value={form.spousePhone} onChange={onTextChange} />
                </label>
              </section>

              <section className={styles.formPanel}>
                <div className={styles.cardHeaderRow}>
                  <div>
                    <h2 className={styles.cardTitle}>Children or other household members</h2>
                    <p className={styles.helperText}>Optional names for Mekor&apos;s household records.</p>
                  </div>
                  <button type="button" className={styles.ghostButton} onClick={() => setHouseholdRows((current) => [...current, emptyHouseholdRow])}>
                    Add member
                  </button>
                </div>
                {householdRows.length === 0 ? <p className={styles.helperText}>No household members added yet.</p> : null}
                <div className={styles.stack}>
                  {householdRows.map((row, index) => (
                    <div key={`household-${index}`} className={styles.repeatRow}>
                      <div className={styles.inlineGrid}>
                        <label className={styles.field}>
                          <FieldLabel>Name</FieldLabel>
                          <input value={row.name} onChange={(event) => updateHouseholdRow(index, "name", event.target.value)} />
                        </label>
                        <label className={styles.field}>
                          <FieldLabel>Hebrew name</FieldLabel>
                          <input value={row.hebrewName} onChange={(event) => updateHouseholdRow(index, "hebrewName", event.target.value)} />
                        </label>
                      </div>
                      <div className={styles.inlineGridRepeatFooter}>
                        <label className={styles.field}>
                          <FieldLabel>Relationship</FieldLabel>
                          <input value={row.relationship} onChange={(event) => updateHouseholdRow(index, "relationship", event.target.value)} />
                        </label>
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => setHouseholdRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.formPanel}>
                <div className={styles.cardHeaderRow}>
                  <div>
                    <h2 className={styles.cardTitle}>Yahrzeit information</h2>
                    <p className={styles.helperText}>Optional. Add names and dates you want Mekor to keep on file.</p>
                  </div>
                  <button type="button" className={styles.ghostButton} onClick={() => setYahrzeitRows((current) => [...current, emptyYahrzeitRow])}>
                    Add yahrzeit
                  </button>
                </div>
                {yahrzeitRows.length === 0 ? <p className={styles.helperText}>No yahrzeits added yet.</p> : null}
                <div className={styles.stack}>
                  {yahrzeitRows.map((row, index) => (
                    <div key={`yahrzeit-${index}`} className={styles.repeatRow}>
                      <div className={styles.inlineGrid}>
                        <label className={styles.field}>
                          <FieldLabel>Name</FieldLabel>
                          <input value={row.name} onChange={(event) => updateYahrzeitRow(index, "name", event.target.value)} />
                        </label>
                        <label className={styles.field}>
                          <FieldLabel>Relationship</FieldLabel>
                          <input value={row.relationship} onChange={(event) => updateYahrzeitRow(index, "relationship", event.target.value)} />
                        </label>
                      </div>
                      <div className={styles.inlineGrid}>
                        <label className={styles.field}>
                          <FieldLabel hint="e.g. 15 Nisan">Hebrew date</FieldLabel>
                          <input value={row.hebrewDate} onChange={(event) => updateYahrzeitRow(index, "hebrewDate", event.target.value)} />
                        </label>
                        <label className={styles.field}>
                          <FieldLabel hint="MM/DD/YYYY">English date</FieldLabel>
                          <input value={row.englishDate} onChange={(event) => updateYahrzeitRow(index, "englishDate", event.target.value)} />
                        </label>
                      </div>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => setYahrzeitRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <section className={styles.formPanel}>
                <header className={styles.panelHeader}>
                  <h2 id="application-form-title" className={styles.cardTitle}>
                    How you might like to help
                  </h2>
                  <p className={styles.helperText}>Optional. Select any interests that fit — none required to apply.</p>
                </header>
                <div className={styles.optionGrid}>
                  {VOLUNTEER_INTEREST_OPTIONS.map((option) => (
                    <label key={option} className={styles.optionChip}>
                      <input
                        type="checkbox"
                        checked={form.volunteerInterests.includes(option)}
                        onChange={() => toggleVolunteerInterest(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                <label className={styles.field}>
                  <FieldLabel hint="Optional">Anything else we should know?</FieldLabel>
                  <textarea name="notes" value={form.notes} onChange={onTextChange} rows={5} />
                </label>
              </section>

              {!isAuthenticated ? (
                <section className={styles.formPanel}>
                  <header className={styles.panelHeader}>
                    <h2 className={styles.cardTitle}>Create your sign-in</h2>
                    <p className={styles.helperText}>
                      Submitting creates a pending Mekor account. You can sign in right away; member tools unlock after approval.
                    </p>
                  </header>
                  <div className={styles.inlineGrid}>
                    <label className={styles.field}>
                      <FieldLabel required hint="At least 8 characters">Password</FieldLabel>
                      <input
                        type="password"
                        value={accountPassword}
                        onChange={(event) => setAccountPassword(event.target.value)}
                        minLength={8}
                        required
                        autoComplete="new-password"
                      />
                    </label>
                    <label className={styles.field}>
                      <FieldLabel required>Confirm password</FieldLabel>
                      <input
                        type="password"
                        value={accountConfirmPassword}
                        onChange={(event) => setAccountConfirmPassword(event.target.value)}
                        minLength={8}
                        required
                        autoComplete="new-password"
                      />
                    </label>
                  </div>
                </section>
              ) : (
                <section className={styles.formPanel}>
                  <header className={styles.panelHeader}>
                    <h2 className={styles.cardTitle}>Signed in as {resolvedEmail}</h2>
                    <p className={styles.helperText}>We&apos;ll attach this application to your existing Mekor account.</p>
                  </header>
                </section>
              )}
            </>
          ) : null}

          {step === 4 ? (
            <section className={styles.formPanel}>
              <header className={styles.panelHeader}>
                <h2 id="application-form-title" className={styles.cardTitle}>
                  Review and submit
                </h2>
                <p className={styles.helperText}>
                  Confirm the summary, then submit. Your application goes straight to Mekor&apos;s admin review queue.
                </p>
              </header>
              <dl className={styles.reviewSummary}>
                <div>
                  <dt>Applicant</dt>
                  <dd>{displayName || "—"}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{resolvedEmail || "—"}</dd>
                </div>
                <div>
                  <dt>Application</dt>
                  <dd>{getApplicationTypeLabel(form.applicationType)}</dd>
                </div>
                <div>
                  <dt>Membership</dt>
                  <dd>{getMembershipCategoryLabel(form.membershipCategory)}</dd>
                </div>
                <div>
                  <dt>Estimated total</dt>
                  <dd>{formatUsd(estimate.totalAmountCents)}</dd>
                </div>
                <div>
                  <dt>Payment</dt>
                  <dd>{getPaymentMethodLabel(form.preferredPaymentMethod)}</dd>
                </div>
                <div>
                  <dt>Household rows</dt>
                  <dd>{sanitizeRows(householdRows).length}</dd>
                </div>
                <div>
                  <dt>Yahrzeits</dt>
                  <dd>{sanitizeRows(yahrzeitRows).length}</dd>
                </div>
              </dl>
              <ol className={styles.reviewList}>
                <li>Your application lands in Mekor&apos;s admin panel for review.</li>
                <li>
                  {isAuthenticated
                    ? "Your account stays signed in while Mekor reviews."
                    : "A pending Mekor account is created so you can sign in immediately."}
                </li>
                <li>
                  {paysByCard
                    ? "Stripe opens next so you can pay dues securely by card."
                    : "After approval, the team follows up on payment and member access."}
                </li>
              </ol>
            </section>
          ) : null}

          {(stepError || error) && step !== 4 ? (
            <p className={styles.errorBanner} role="alert">
              {stepError || error}
            </p>
          ) : null}
          {error && step === 4 ? (
            <p className={styles.errorBanner} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.stepActions}>
            {step > 0 ? (
              <button type="button" className={styles.secondaryAction} onClick={goBack}>
                Back
              </button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className={styles.primaryAction} onClick={goNext}>
                Continue
              </button>
            ) : (
              <button type="submit" className={styles.submitButton} disabled={submitting}>
                {submitLabel}
              </button>
            )}
          </div>
        </div>

        <aside className={styles.summaryColumn}>
          <section className={styles.summaryCard}>
            <h2 className={styles.summaryHeading}>Application summary</h2>
            <p className={styles.summaryTotal}>{formatUsd(estimate.totalAmountCents)}</p>
            <p className={styles.summaryTotalLabel}>Estimated dues{form.includeSecurityDonation ? " + security donation" : ""}</p>
            <dl className={styles.summaryList}>
              <div>
                <dt>Applicant</dt>
                <dd>{displayName || "Add your name"}</dd>
              </div>
              <div>
                <dt>Application</dt>
                <dd>{getApplicationTypeLabel(form.applicationType)}</dd>
              </div>
              <div>
                <dt>Membership</dt>
                <dd>{getMembershipCategoryLabel(form.membershipCategory)}</dd>
              </div>
              <div>
                <dt>Base dues</dt>
                <dd>{formatUsd(estimate.baseAmountCents)}</dd>
              </div>
              <div>
                <dt>Security donation</dt>
                <dd>{estimate.securityDonationCents ? formatUsd(estimate.securityDonationCents) : "Not included"}</dd>
              </div>
              <div>
                <dt>Payment preference</dt>
                <dd>{getPaymentMethodLabel(form.preferredPaymentMethod)}</dd>
              </div>
            </dl>
            <p className={styles.summaryNote}>
              {paysByCard
                ? "Card payment opens in Stripe after you submit. Processing fees can be covered separately if you opted in."
                : "This form does not charge you now. Payment is arranged after review based on your preference."}
            </p>
          </section>

          <section className={styles.summaryCardAlt}>
            <h2 className={styles.summaryHeading}>After you apply</h2>
            <ol className={styles.reviewList}>
              <li>Admin review in Mekor</li>
              <li>{isAuthenticated ? "Stay signed in while you wait" : "Sign in with the password you create"}</li>
              <li>Welcome email and member access after approval</li>
            </ol>
          </section>
        </aside>
      </form>

      <div className={styles.mobileDock}>
        <div>
          <p className={styles.mobileDockLabel}>Estimated total</p>
          <p className={styles.mobileDockTotal}>{formatUsd(estimate.totalAmountCents)}</p>
        </div>
        {step < STEPS.length - 1 ? (
          <button type="button" className={styles.primaryAction} onClick={goNext}>
            Continue
          </button>
        ) : (
          <button
            type="button"
            className={styles.submitButton}
            disabled={submitting}
            onClick={() => formRef.current?.requestSubmit()}
          >
            {submitting ? "Working…" : paysByCard ? "Pay securely" : "Submit"}
          </button>
        )}
      </div>
    </section>
  );
}
