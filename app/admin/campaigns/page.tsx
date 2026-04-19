"use client";

import { useMemo, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { DataState } from "@/components/backend/data/data-state";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";
import { Badge, type BadgeTone } from "@/components/backend/ui/badge";
import { Button } from "@/components/backend/ui/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/backend/ui/data-table";
import { Field, Input, Select } from "@/components/backend/ui/field";
import { Modal } from "@/components/backend/ui/modal";
import {
  Toolbar,
  ToolbarActions,
  ToolbarSearch,
} from "@/components/backend/ui/toolbar";

type CampaignStatus = "draft" | "active" | "closed" | "archived";

type Campaign = {
  id: number;
  title: string;
  slug: string;
  description: string;
  designationLabel: string;
  targetAmountCents: number | null;
  suggestedAmountCents: number | null;
  status: CampaignStatus;
  shareablePath: string;
  launchedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = { campaigns: Campaign[] };

const STATUS_TONES: Record<CampaignStatus, BadgeTone> = {
  draft: "neutral",
  active: "success",
  closed: "warning",
  archived: "neutral",
};

const dollars = (cents: number | null) =>
  cents == null
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function AdminCampaignsPage() {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(false);

  const resource = useResource<ListResponse>(
    (signal) => fetchJson<ListResponse>(`/api/admin/campaigns`, { signal }),
    [],
  );

  const items = useMemo(() => {
    const all = resource.data?.campaigns ?? [];
    if (!q) return all;
    const needle = q.toLowerCase();
    return all.filter(
      (c) =>
        c.title.toLowerCase().includes(needle) ||
        c.slug.toLowerCase().includes(needle) ||
        c.designationLabel.toLowerCase().includes(needle),
    );
  }, [resource.data?.campaigns, q]);

  const stats = useMemo(() => {
    const all = resource.data?.campaigns ?? [];
    const active = all.filter((c) => c.status === "active").length;
    const target = all.reduce((s, c) => s + (c.targetAmountCents ?? 0), 0);
    return [
      { label: "Campaigns", value: String(all.length), hint: `${active} active` },
      { label: "Combined target", value: dollars(target), hint: "Across all campaigns" },
    ];
  }, [resource.data?.campaigns]);

  const columns: DataTableColumn<Campaign>[] = [
    {
      id: "title",
      header: "Title",
      accessor: (c) => (
        <div>
          <div style={{ fontWeight: 700 }}>{c.title}</div>
          <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>/{c.slug}</div>
        </div>
      ),
      sortValue: (c) => c.title,
      exportValue: (c) => c.title,
    },
    {
      id: "status",
      header: "Status",
      accessor: (c) => <Badge tone={STATUS_TONES[c.status]}>{c.status}</Badge>,
      sortValue: (c) => c.status,
      exportValue: (c) => c.status,
    },
    {
      id: "target",
      header: "Target",
      accessor: (c) => dollars(c.targetAmountCents),
      sortValue: (c) => c.targetAmountCents ?? 0,
      exportValue: (c) => (c.targetAmountCents == null ? "" : (c.targetAmountCents / 100).toFixed(2)),
      align: "right",
    },
    {
      id: "suggested",
      header: "Suggested",
      accessor: (c) => dollars(c.suggestedAmountCents),
      exportValue: (c) => (c.suggestedAmountCents == null ? "" : (c.suggestedAmountCents / 100).toFixed(2)),
      align: "right",
      hideOnMobile: true,
    },
    {
      id: "updated",
      header: "Updated",
      accessor: (c) => new Date(c.updatedAt).toLocaleDateString(),
      sortValue: (c) => c.updatedAt,
      exportValue: (c) => c.updatedAt,
      hideOnMobile: true,
    },
  ];

  return (
    <AdminShell
      currentPath="/admin/campaigns"
      title="Campaigns"
      description="Create and manage fundraising campaigns used across donation flows."
      stats={stats}
    >
      <Toolbar>
        <ToolbarSearch value={q} onChange={setQ} placeholder="Search title, slug, designation…" />
        <ToolbarActions>
          <Button variant="ghost" size="sm" onClick={() => void resource.refresh()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            New campaign
          </Button>
        </ToolbarActions>
      </Toolbar>

      <DataState resource={resource} empty={{ title: "No campaigns yet", description: "Create your first campaign to collect donations." }}>
        {() => (
          <DataTable<Campaign>
            rows={items}
            rowId={(c) => c.id}
            columns={columns}
            rowActions={(c) => (
              <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                Edit
              </Button>
            )}
            exportFilename="campaigns.csv"
            emptyState="No campaigns match"
          />
        )}
      </DataState>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.title}` : "Edit"} size="lg">
        {editing ? (
          <CampaignForm
            initial={editing}
            onSaved={() => {
              setEditing(null);
              void resource.refresh();
            }}
          />
        ) : null}
      </Modal>

      <Modal open={creating} onClose={() => setCreating(false)} title="Create campaign" size="lg">
        <CampaignForm
          onSaved={() => {
            setCreating(false);
            void resource.refresh();
          }}
        />
      </Modal>
    </AdminShell>
  );
}

function CampaignForm({ initial, onSaved }: { initial?: Campaign; onSaved: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [designationLabel, setDesignationLabel] = useState(initial?.designationLabel ?? "");
  const [target, setTarget] = useState(initial?.targetAmountCents != null ? (initial.targetAmountCents / 100).toString() : "");
  const [suggested, setSuggested] = useState(initial?.suggestedAmountCents != null ? (initial.suggestedAmountCents / 100).toString() : "");
  const [status, setStatus] = useState<CampaignStatus>(initial?.status ?? "draft");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        ...(initial ? { id: initial.id } : {}),
        title,
        description,
        designationLabel,
        targetAmountCents: target ? Math.round(Number(target) * 100) : null,
        suggestedAmountCents: suggested ? Math.round(Number(suggested) * 100) : null,
        status,
      };
      await fetchJson(`/api/admin/campaigns`, {
        method: initial ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save campaign");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--bk-space-3)" }}>
      <Field label="Title" required>
        {(props) => <Input {...props} value={title} onChange={(e) => setTitle(e.target.value)} />}
      </Field>
      <Field label="Designation label" hint="Shown on receipts">
        {(props) => <Input {...props} value={designationLabel} onChange={(e) => setDesignationLabel(e.target.value)} />}
      </Field>
      <Field label="Description">
        {(props) => (
          <textarea
            id={props.id}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              fontFamily: "inherit",
              fontSize: "var(--bk-text-sm)",
              padding: "var(--bk-space-2)",
              background: "var(--bk-surface)",
              border: "1px solid var(--bk-border)",
              borderRadius: "var(--bk-radius-sm)",
              color: "var(--bk-text)",
            }}
          />
        )}
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--bk-space-3)" }}>
        <Field label="Target (USD)" hint="Blank = no target">
          {(props) => <Input {...props} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />}
        </Field>
        <Field label="Suggested donation (USD)">
          {(props) => <Input {...props} inputMode="decimal" value={suggested} onChange={(e) => setSuggested(e.target.value)} />}
        </Field>
      </div>
      <Field label="Status">
        {(props) => (
          <Select {...props} value={status} onChange={(e) => setStatus(e.target.value as CampaignStatus)}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </Select>
        )}
      </Field>
      {error ? <p style={{ color: "var(--bk-danger)", margin: 0, fontSize: "var(--bk-text-sm)" }}>{error}</p> : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--bk-space-2)" }}>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Save changes" : "Create campaign"}
        </Button>
      </div>
    </form>
  );
}
