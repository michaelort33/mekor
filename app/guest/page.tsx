"use client";

import { FormEvent, useState } from "react";

type Guest = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

const COOKIE_NAME = "guest_token";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

export default function GuestPage() {
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadGuests() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/guest", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setGuests([]);
      setError(data.error ?? "Failed to load guests");
      setLoading(false);
      return;
    }

    setGuests(data.guests ?? []);
    setLoading(false);
  }

  function handleSaveToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCookie(COOKIE_NAME, token.trim());
    void loadGuests();
  }

  async function handleCreateGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const response = await fetch("/api/guest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Failed to create guest");
      setSaving(false);
      return;
    }

    setGuests((current) => [data.guest as Guest, ...current]);
    setName("");
    setEmail("");
    setSaving(false);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Guest Console</h1>
        <p className="text-sm text-zinc-600">
          Minimal starter flow: set token cookie, then read/write guests through
          one API route.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Token Cookie
        </h2>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSaveToken}>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-800"
            placeholder="Paste GUEST_API_TOKEN value"
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
          <button
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            type="submit"
          >
            Save Token
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Add Guest
        </h2>
        <form className="grid gap-3 sm:grid-cols-3" onSubmit={handleCreateGuest}>
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-800"
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-800"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? "Saving..." : "Create"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Guests
          </h2>
          <button
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-50"
            onClick={() => void loadGuests()}
            type="button"
          >
            Refresh
          </button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {loading ? <p className="text-sm text-zinc-500">Loading...</p> : null}

        {!loading && !error && guests.length === 0 ? (
          <p className="text-sm text-zinc-500">No guests yet.</p>
        ) : null}

        <ul className="space-y-2">
          {guests.map((guest) => (
            <li
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              key={guest.id}
            >
              <p className="font-medium">{guest.name}</p>
              <p className="text-zinc-600">{guest.email}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
