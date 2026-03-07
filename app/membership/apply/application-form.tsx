"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";

import { usePublicProfilePrefill } from "@/components/forms/use-public-profile-prefill";
import {
  buildApplicantDisplayName,
  calculateMembershipEstimate,
  formatUsd,
  getApplicationTypeLabel,
  getMembershipCategoryLabel,
  getPaymentMethodLabel,
  MEMBERSHIP_CATEGORY_OPTIONS,
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

export function MembershipApplicationForm() {
  const profile = usePublicProfilePrefill();
  const [form, setForm] = useState<FormState>(initialState);
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
  const [success, setSuccess] = useState<{ applicationId: number } | null>(null);

  const estimate = useMemo(
    () =>
      calculateMembershipEstimate({
        membershipCategory: form.membershipCategory,
        includeSecurityDonation: form.includeSecurityDonation,
      }),
    [form.includeSecurityDonation, form.membershipCategory],
  );

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => ({}))) as { applicationId?: number; error?: string };
    if (!response.ok || !data.applicationId) {
      setError(data.error || "Unable to submit application right now.");
      setSubmitting(false);
      return;
    }

    if (payload.preferredPaymentMethod === "credit_card") {
      const checkoutResponse = await fetch(`/api/membership-applications/${data.applicationId}/checkout`, {
        method: "POST",
      });
      const checkoutPayload = (await checkoutResponse.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!checkoutResponse.ok || !checkoutPayload.url) {
        setError(checkoutPayload.error || "Application saved, but payment checkout could not be started.");
        setSubmitting(false);
        return;
      }
      window.location.assign(checkoutPayload.url);
      return;
    }

    setSuccess({ applicationId: data.applicationId });
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
  }

  return (
    <section className={styles.formShell}>
      <form onSubmit={onSubmit} className={styles.formGrid}>
        <div className={styles.formColumn}>
          <section className={styles.formCard}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionEyebrow}>Application</p>
              <h2 className={styles.cardTitle}>Membership type and dues</h2>
            </div>
            <div className={styles.inlineGrid}>
              <label className={styles.field}>
                <span>Application type</span>
                <select name="applicationType" value={form.applicationType} onChange={onTextChange}>
                  <option value="new">New member</option>
                  <option value="renewal">Renewing member</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Membership category</span>
                <select name="membershipCategory" value={form.membershipCategory} onChange={onTextChange}>
                  {MEMBERSHIP_CATEGORY_OPTIONS.map((option) => (
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
                  Include the suggested <strong>$100 security fee donation</strong>.
                </span>
              </label>
              <label className={styles.checkboxCard}>
                <input type="checkbox" name="coverOnlineFees" checked={form.coverOnlineFees} onChange={onTextChange} />
                <span>Note that I would like to cover online processing fees if I pay by card.</span>
              </label>
            </div>
            <label className={styles.field}>
              <span>Preferred payment method</span>
              <select name="preferredPaymentMethod" value={form.preferredPaymentMethod} onChange={onTextChange}>
                {PAYMENT_METHOD_PREFERENCE.map((option) => (
                  <option key={option} value={option}>
                    {getPaymentMethodLabel(option)}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className={styles.formCard}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionEyebrow}>Primary member</p>
              <h2 className={styles.cardTitle}>Contact and household details</h2>
            </div>
            <div className={styles.inlineGrid}>
              <label className={styles.field}>
                <span>First name</span>
                <input name="firstName" value={resolvedFirstName} onChange={onTextChange} required />
              </label>
              <label className={styles.field}>
                <span>Last name</span>
                <input name="lastName" value={resolvedLastName} onChange={onTextChange} required />
              </label>
            </div>
            <div className={styles.inlineGrid}>
              <label className={styles.field}>
                <span>Hebrew name</span>
                <input name="hebrewName" value={form.hebrewName} onChange={onTextChange} />
              </label>
              <label className={styles.field}>
                <span>Email</span>
                <input name="email" type="email" value={resolvedEmail} onChange={onTextChange} required />
              </label>
            </div>
            <div className={styles.inlineGrid}>
              <label className={styles.field}>
                <span>Phone</span>
                <input name="phone" value={resolvedPhone} onChange={onTextChange} required />
              </label>
              <label className={styles.field}>
                <span>Street address</span>
                <input name="addressLine1" value={form.addressLine1} onChange={onTextChange} required />
              </label>
            </div>
            <label className={styles.field}>
              <span>Address line 2</span>
              <input name="addressLine2" value={form.addressLine2} onChange={onTextChange} />
            </label>
            <div className={styles.inlineGridTriple}>
              <label className={styles.field}>
                <span>City</span>
                <input name="city" value={resolvedCity} onChange={onTextChange} required />
              </label>
              <label className={styles.field}>
                <span>State</span>
                <input name="state" value={form.state} onChange={onTextChange} required />
              </label>
              <label className={styles.field}>
                <span>ZIP</span>
                <input name="postalCode" value={form.postalCode} onChange={onTextChange} required />
              </label>
            </div>
          </section>

          <section className={styles.formCard}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionEyebrow}>Spouse or partner</p>
              <h2 className={styles.cardTitle}>Optional second adult details</h2>
            </div>
            <div className={styles.inlineGrid}>
              <label className={styles.field}>
                <span>First name</span>
                <input name="spouseFirstName" value={form.spouseFirstName} onChange={onTextChange} />
              </label>
              <label className={styles.field}>
                <span>Last name</span>
                <input name="spouseLastName" value={form.spouseLastName} onChange={onTextChange} />
              </label>
            </div>
            <div className={styles.inlineGrid}>
              <label className={styles.field}>
                <span>Hebrew name</span>
                <input name="spouseHebrewName" value={form.spouseHebrewName} onChange={onTextChange} />
              </label>
              <label className={styles.field}>
                <span>Email</span>
                <input name="spouseEmail" type="email" value={form.spouseEmail} onChange={onTextChange} />
              </label>
            </div>
            <label className={styles.field}>
              <span>Phone</span>
              <input name="spousePhone" value={form.spousePhone} onChange={onTextChange} />
            </label>
          </section>

          <section className={styles.formCard}>
            <div className={styles.cardHeaderRow}>
              <div>
                <p className={styles.sectionEyebrow}>Household members</p>
                <h2 className={styles.cardTitle}>Children or other household members</h2>
              </div>
              <button type="button" className={styles.ghostButton} onClick={() => setHouseholdRows((current) => [...current, emptyHouseholdRow])}>
                Add household member
              </button>
            </div>
            {householdRows.length === 0 ? <p className={styles.helperText}>Add rows if you want Mekor to have household names on file.</p> : null}
            <div className={styles.stack}>
              {householdRows.map((row, index) => (
                <div key={`household-${index}`} className={styles.repeatRow}>
                  <div className={styles.inlineGrid}>
                    <label className={styles.field}>
                      <span>Name</span>
                      <input value={row.name} onChange={(event) => updateHouseholdRow(index, "name", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>Hebrew name</span>
                      <input value={row.hebrewName} onChange={(event) => updateHouseholdRow(index, "hebrewName", event.target.value)} />
                    </label>
                  </div>
                  <div className={styles.inlineGridRepeatFooter}>
                    <label className={styles.field}>
                      <span>Relationship</span>
                      <input value={row.relationship} onChange={(event) => updateHouseholdRow(index, "relationship", event.target.value)} />
                    </label>
                    <button type="button" className={styles.removeButton} onClick={() => setHouseholdRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.formCard}>
            <div className={styles.cardHeaderRow}>
              <div>
                <p className={styles.sectionEyebrow}>Yahrzeit information</p>
                <h2 className={styles.cardTitle}>Names and dates to keep on file</h2>
              </div>
              <button type="button" className={styles.ghostButton} onClick={() => setYahrzeitRows((current) => [...current, emptyYahrzeitRow])}>
                Add yahrzeit
              </button>
            </div>
            {yahrzeitRows.length === 0 ? <p className={styles.helperText}>Add any yahrzeits you want Mekor to know about for reminders or recordkeeping.</p> : null}
            <div className={styles.stack}>
              {yahrzeitRows.map((row, index) => (
                <div key={`yahrzeit-${index}`} className={styles.repeatRow}>
                  <div className={styles.inlineGrid}>
                    <label className={styles.field}>
                      <span>Name</span>
                      <input value={row.name} onChange={(event) => updateYahrzeitRow(index, "name", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>Relationship</span>
                      <input value={row.relationship} onChange={(event) => updateYahrzeitRow(index, "relationship", event.target.value)} />
                    </label>
                  </div>
                  <div className={styles.inlineGrid}>
                    <label className={styles.field}>
                      <span>Hebrew date</span>
                      <input value={row.hebrewDate} onChange={(event) => updateYahrzeitRow(index, "hebrewDate", event.target.value)} />
                    </label>
                    <label className={styles.field}>
                      <span>English date</span>
                      <input value={row.englishDate} onChange={(event) => updateYahrzeitRow(index, "englishDate", event.target.value)} />
                    </label>
                  </div>
                  <button type="button" className={styles.removeButton} onClick={() => setYahrzeitRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.formCard}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionEyebrow}>Community interests</p>
              <h2 className={styles.cardTitle}>How you might like to help</h2>
            </div>
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
              <span>Anything else we should know?</span>
              <textarea name="notes" value={form.notes} onChange={onTextChange} rows={6} />
            </label>
          </section>

          <section className={styles.submitCard}>
            <div className={styles.cardHeader}>
              <p className={styles.sectionEyebrow}>Final step</p>
              <h2 className={styles.cardTitle}>Submit your membership application</h2>
            </div>
            <p className={styles.bodyText}>
              When you submit, the application goes straight to Mekor&apos;s admin team for review. Approved applicants receive a welcome email with next steps.
            </p>
            {error ? <p className={styles.errorBanner}>{error}</p> : null}
            {success ? (
              <section className={styles.successCard}>
                <p className={styles.sectionEyebrow}>Submitted</p>
                <h2 className={styles.cardTitle}>Application received</h2>
                <p className={styles.bodyText}>
                  Your application ID is <strong>#{success.applicationId}</strong>. Mekor staff will review it and follow up by email.
                </p>
              </section>
            ) : null}
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit membership application"}
            </button>
          </section>
        </div>

        <aside className={styles.summaryColumn}>
          <section className={styles.summaryCard}>
            <p className={styles.sectionEyebrow}>Application summary</p>
            <h2 className={styles.cardTitle}>Before you submit</h2>
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
                <dt>Estimated total</dt>
                <dd>{formatUsd(estimate.totalAmountCents)}</dd>
              </div>
              <div>
                <dt>Payment preference</dt>
                <dd>{getPaymentMethodLabel(form.preferredPaymentMethod)}</dd>
              </div>
            </dl>
            <p className={styles.summaryNote}>
              If you selected online processing-fee coverage, the admin team will follow up when payment is arranged. This form does not charge your card.
            </p>
          </section>

          <section className={styles.summaryCardAlt}>
            <p className={styles.sectionEyebrow}>Review flow</p>
            <ol className={styles.reviewList}>
              <li>Your application lands directly in Mekor&apos;s admin panel.</li>
              <li>An admin reviews the submission and approves or follows up.</li>
              <li>Approved applicants receive a welcome email with login or setup instructions.</li>
            </ol>
          </section>
        </aside>
      </form>
    </section>
  );
}
