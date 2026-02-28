export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-6">
      <h1 className="text-4xl font-semibold tracking-tight">Mekor Starter</h1>
      <p className="max-w-2xl text-zinc-600">
        Single Next.js app with App Router, one API route, one guest page,
        MySQL + Drizzle, cookie-token auth, and zod validation.
      </p>
      <div className="flex gap-3">
        <a
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          href="/guest"
        >
          Open /guest
        </a>
      </div>
    </div>
  );
}
