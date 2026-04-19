"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AccountShell } from "@/components/account/account-shell";
import { Badge, type BadgeTone } from "@/components/backend/ui/badge";
import { Button } from "@/components/backend/ui/button";
import { Card, CardBody, CardHeader } from "@/components/backend/ui/card";
import { DataState } from "@/components/backend/data/data-state";
import { DataTable, type DataTableColumn } from "@/components/backend/ui/data-table";
import { fetchJson, useResource } from "@/components/backend/data/use-resource";
import { Checkbox, Field, FieldRow, Input, Select, Textarea } from "@/components/backend/ui/field";
import { Alert } from "@/components/backend/ui/feedback";
import {
  FilterChip,
  Toolbar,
  ToolbarFilters,
  ToolbarSearch,
} from "@/components/backend/ui/toolbar";

type HostedEvent = {
  id: number;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  capacity: number | null;
  joinMode: "open_join" | "request_to_join";
  visibility: "members_only" | "public";
  status: "draft" | "published" | "cancelled" | "completed";
  counts: { approved: number; requested: number; waitlisted: number };
};

type ListResponse = { items: HostedEvent[] };

type CreateEventForm = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: string;
  joinMode: HostedEvent["joinMode"];
  visibility: HostedEvent["visibility"];
  publishNow: boolean;
};

const STATUS_TONES: Record<HostedEvent["status"], BadgeTone> = {
  draft: "neutral",
  published: "success",
  cancelled: "warning",
  completed: "info",
};

const initialForm: CreateEventForm = {
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  location: "",
  capacity: "",
  joinMode: "open_join",
  visibility: "members_only",
  publishNow: true,
};

export default function AccountMemberEventsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | HostedEvent["status"]>("");
  const [joinModeFilter, setJoinModeFilter] = useState<"" | HostedEvent["joinMode"]>("");
  const [form, setForm] = useState<CreateEventForm>(initialForm);
  const [working, setWorking] = useState(false);
  const [busyId, setBusyId] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const resource = useResource<ListResponse>(
    (signal) => fetchJson<ListResponse>("/api/member-events?host=me&includeDraft=1&includePast=1&limit=60", { signal }),
    [],
  );

  const items = resource.data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((ev) => {
      if (statusFilter && ev.status !== statusFilter) return false;
      if (joinModeFilter && ev.joinMode !== joinModeFilter) return false;
      if (q) {
        return [ev.title, ev.description, ev.location].join(" ").toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, search, statusFilter, joinModeFilter]);

  async function createEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setWorking(true);
    try {
      await fetchJson("/api/member-events", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          location: form.location,
          capacity: form.capacity ? Number(form.capacity) : null,
          joinMode: form.joinMode,
          visibility: form.visibility,
          publishNow: form.publishNow,
        }),
      });
      setForm(initialForm);
      setNotice("Member event created.");
      await resource.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create event");
    } finally {
      setWorking(false);
    }
  }

  async function publishEvent(id: number) {
    setError("");
    setBusyId(id);
    try {
      await fetchJson(`/api/member-events/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "published" }),
      });
      await resource.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish event");
    } finally {
      setBusyId(0);
    }
  }

  async function cancelEvent(id: number) {
    setError("");
    setBusyId(id);
    try {
      await fetchJson(`/api/member-events/${id}/cancel`, { method: "POST" });
      await resource.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel event");
    } finally {
      setBusyId(0);
    }
  }

  const columns: DataTableColumn<HostedEvent>[] = [
    {
      id: "event",
      header: "Event",
      accessor: (r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.title}</div>
          <div style={{ fontSize: "var(--bk-text-xs)", color: "var(--bk-text-soft)" }}>
            {new Date(r.startsAt).toLocaleString()}
            {r.location ? ` · ${r.location}` : ""}
          </div>
        </div>
      ),
      sortValue: (r) => r.startsAt,
      exportValue: (r) => r.title,
    },
    {
      id: "status",
      header: "Status",
      accessor: (r) => <Badge tone={STATUS_TONES[r.status]}>{r.status}</Badge>,
      sortValue: (r) => r.status,
      exportValue: (r) => r.status,
    },
    {
      id: "join",
      header: "Join",
      accessor: (r) => r.joinMode.replace("_", " "),
      exportValue: (r) => r.joinMode,
      hideOnMobile: true,
    },
    {
      id: "attendance",
      header: "Attendance",
      accessor: (r) => (
        <span>
          {r.counts.approved} approved · {r.counts.requested} req · {r.counts.waitlisted} wl
        </span>
      ),
      sortValue: (r) => r.counts.approved,
      exportValue: (r) => r.counts.approved,
    },
  ];

  const stats = [
    { label: "Hosted", value: String(items.length), hint: `${filtered.length} in view` },
    {
      label: "Published",
      value: String(items.filter((i) => i.status === "published").length),
      hint: "Live to members",
    },
    {
      label: "Open requests",
      value: String(items.reduce((s, i) => s + i.counts.requested, 0)),
      hint: "Pending approval",
    },
  ];

  return (
    <AccountShell
      currentPath="/account/member-events"
      title="Host events"
      description="Create community gatherings and manage approvals."
      stats={stats}
      actions={
        <Link href="/events">
          <Button size="sm" variant="secondary">Public events</Button>
        </Link>
      }
    >
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <Card padded style={{ marginTop: "var(--bk-space-4)" }}>
        <CardHeader title="Create a member event" description="Publish a new gathering and start collecting registrations." />
        <CardBody>
          <form onSubmit={createEvent} style={{ display: "grid", gap: "var(--bk-space-3)" }}>
            <Field label="Title" required>
              {(p) => (
                <Input
                  {...p}
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  minLength={3}
                  maxLength={160}
                />
              )}
            </Field>

            <Field label="Description" optional>
              {(p) => (
                <Textarea
                  {...p}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  maxLength={4000}
                  rows={4}
                />
              )}
            </Field>

            <FieldRow cols={2}>
              <Field label="Starts at" required>
                {(p) => (
                  <Input
                    {...p}
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                    required
                  />
                )}
              </Field>
              <Field label="Ends at" optional>
                {(p) => (
                  <Input
                    {...p}
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                  />
                )}
              </Field>
            </FieldRow>

            <FieldRow cols={2}>
              <Field label="Location" optional>
                {(p) => (
                  <Input
                    {...p}
                    value={form.location}
                    onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                    maxLength={255}
                  />
                )}
              </Field>
              <Field label="Capacity" optional hint="Leave blank for unlimited">
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    min={1}
                    max={2000}
                    value={form.capacity}
                    onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
                  />
                )}
              </Field>
            </FieldRow>

            <FieldRow cols={2}>
              <Field label="Join mode">
                {(p) => (
                  <Select
                    {...p}
                    value={form.joinMode}
                    onChange={(e) => setForm((prev) => ({ ...prev, joinMode: e.target.value as HostedEvent["joinMode"] }))}
                  >
                    <option value="open_join">Open join</option>
                    <option value="request_to_join">Request to join</option>
                  </Select>
                )}
              </Field>
              <Field label="Visibility">
                {(p) => (
                  <Select
                    {...p}
                    value={form.visibility}
                    onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value as HostedEvent["visibility"] }))}
                  >
                    <option value="members_only">Members only</option>
                    <option value="public">Public</option>
                  </Select>
                )}
              </Field>
            </FieldRow>

            <Checkbox
              checked={form.publishNow}
              onChange={(e) => setForm((prev) => ({ ...prev, publishNow: e.target.checked }))}
              label="Publish immediately"
            />

            <div>
              <Button type="submit" disabled={working}>
                {working ? "Creating…" : "Create event"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div style={{ marginTop: "var(--bk-space-4)" }} />
      <Toolbar>
        <ToolbarSearch value={search} onChange={setSearch} placeholder="Search hosted events…" />
        <ToolbarFilters>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as HostedEvent["status"] | "")}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </Select>
          <Select value={joinModeFilter} onChange={(e) => setJoinModeFilter(e.target.value as HostedEvent["joinMode"] | "")}>
            <option value="">Any join mode</option>
            <option value="open_join">Open join</option>
            <option value="request_to_join">Request to join</option>
          </Select>
          {(search || statusFilter || joinModeFilter) ? (
            <FilterChip
              label="Clear filters"
              onRemove={() => {
                setSearch("");
                setStatusFilter("");
                setJoinModeFilter("");
              }}
            />
          ) : null}
        </ToolbarFilters>
      </Toolbar>

      <DataState resource={resource} empty={{ title: "No hosted events", description: "You haven't hosted any events yet." }}>
        {() => (
          <DataTable<HostedEvent>
            rows={filtered}
            rowId={(r) => r.id}
            columns={columns}
            rowActions={(r) => (
              <div style={{ display: "flex", gap: 6 }}>
                <Link href={`/member-events/${r.id}`}>
                  <Button size="sm" variant="ghost">Manage</Button>
                </Link>
                {r.status === "draft" ? (
                  <Button size="sm" disabled={busyId === r.id} onClick={() => publishEvent(r.id)}>
                    {busyId === r.id ? "…" : "Publish"}
                  </Button>
                ) : null}
                {r.status !== "cancelled" && r.status !== "completed" ? (
                  <Button size="sm" variant="dangerGhost" disabled={busyId === r.id} onClick={() => cancelEvent(r.id)}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            )}
            exportFilename="hosted-events.csv"
            emptyState="No hosted events match"
          />
        )}
      </DataState>
    </AccountShell>
  );
}
