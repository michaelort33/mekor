"use client";

import { useMemo, useState } from "react";

type PendingRequest = {
  id: number;
  senderName: string;
  recipientDisplayName: string;
  subject: string;
  createdAt: string;
};

type OperationsToolsProps = {
  pendingRequests: PendingRequest[];
};

export function OperationsTools({ pendingRequests }: OperationsToolsProps) {
  const [csvInput, setCsvInput] = useState("");
  const [importResult, setImportResult] = useState("");
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);
  const [relayTargetById, setRelayTargetById] = useState<Record<number, "sender" | "recipient">>({});
  const [relaySubjectById, setRelaySubjectById] = useState<Record<number, string>>({});
  const [relayMessageById, setRelayMessageById] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");

  const initialTargets = useMemo(() => {
    const value: Record<number, "sender" | "recipient"> = {};
    for (const row of pendingRequests) {
      value[row.id] = "recipient";
    }
    return value;
  }, [pendingRequests]);

  async function downloadTemplate() {
    window.open("/api/admin/households/import-csv", "_blank");
  }

  async function runCsvImport() {
    if (!csvInput.trim()) {
      setImportResult("CSV content is required.");
      return;
    }

    const response = await fetch("/api/admin/households/import-csv", {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: csvInput,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setImportResult(`Import failed: ${data.error ?? "Unknown error"}`);
      return;
    }

    setImportResult(JSON.stringify(data.result, null, 2));
  }

  async function moderateRequest(id: number, action: "approve" | "reject") {
    setBusyRequestId(id);
    setMessage("");

    const response = await fetch(`/api/admin/member-connect/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote: "Updated from admin operations dashboard" }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(`${action} failed for #${id}: ${data.error ?? "Unknown error"}`);
    } else {
      setMessage(`Request #${id} ${action}d.`);
    }

    setBusyRequestId(null);
  }

  async function relayMessage(id: number) {
    setBusyRequestId(id);
    setMessage("");

    const to = relayTargetById[id] ?? initialTargets[id] ?? "recipient";
    const subject = relaySubjectById[id] ?? "";
    const relayMessageBody = relayMessageById[id] ?? "";

    if (!relayMessageBody.trim()) {
      setMessage(`Relay message is required for request #${id}.`);
      setBusyRequestId(null);
      return;
    }

    const response = await fetch(`/api/admin/member-connect/${id}/relay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, message: relayMessageBody }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(`Relay failed for #${id}: ${data.error ?? "Unknown error"}`);
    } else {
      setMessage(`Relay queued for request #${id}.`);
    }

    setBusyRequestId(null);
  }

  return (
    <>
      <section className="admin-ops__panel">
        <h2>CSV Bootstrap Import</h2>
        <p>Import households, members, renewal terms, and opening balances.</p>
        <div className="admin-ops__buttons">
          <button type="button" onClick={downloadTemplate}>Download Template CSV</button>
          <button type="button" onClick={runCsvImport}>Run Import</button>
        </div>
        <textarea
          className="admin-ops__textarea"
          placeholder="Paste CSV rows here"
          value={csvInput}
          onChange={(event) => setCsvInput(event.target.value)}
        />
        {importResult ? <pre className="admin-ops__result">{importResult}</pre> : null}
      </section>

      <section className="admin-ops__panel">
        <h2>Pending Member-to-Member Requests</h2>
        {pendingRequests.length === 0 ? (
          <p>No pending requests.</p>
        ) : (
          <div className="admin-ops__queue">
            {pendingRequests.map((request) => (
              <article key={request.id} className="admin-ops__queue-card">
                <header>
                  <h3>#{request.id} {request.subject || "(No subject)"}</h3>
                  <p>
                    {request.senderName} → {request.recipientDisplayName} · {new Date(request.createdAt).toLocaleString("en-US")}
                  </p>
                </header>
                <div className="admin-ops__buttons">
                  <button type="button" disabled={busyRequestId === request.id} onClick={() => moderateRequest(request.id, "approve")}>Approve</button>
                  <button type="button" disabled={busyRequestId === request.id} onClick={() => moderateRequest(request.id, "reject")}>Reject</button>
                </div>
                <div className="admin-ops__relay-grid">
                  <label>
                    Relay To
                    <select
                      value={relayTargetById[request.id] ?? initialTargets[request.id] ?? "recipient"}
                      onChange={(event) =>
                        setRelayTargetById((prev) => ({
                          ...prev,
                          [request.id]: event.target.value as "sender" | "recipient",
                        }))
                      }
                    >
                      <option value="recipient">Recipient</option>
                      <option value="sender">Sender</option>
                    </select>
                  </label>
                  <label>
                    Subject
                    <input
                      value={relaySubjectById[request.id] ?? ""}
                      onChange={(event) =>
                        setRelaySubjectById((prev) => ({
                          ...prev,
                          [request.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-ops__relay-message">
                    Message
                    <textarea
                      rows={3}
                      value={relayMessageById[request.id] ?? ""}
                      onChange={(event) =>
                        setRelayMessageById((prev) => ({
                          ...prev,
                          [request.id]: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <button type="button" disabled={busyRequestId === request.id} onClick={() => relayMessage(request.id)}>
                  Relay Message
                </button>
              </article>
            ))}
          </div>
        )}
        {message ? <p className="admin-ops__message">{message}</p> : null}
      </section>
    </>
  );
}
