// Keep this file so the App Router still creates a Suspense boundary for the
// route tree (client pages that call useSearchParams() rely on it to prerender,
// e.g. /account/inbox). Returning null renders nothing during transitions, so
// the previous page/nav stays mounted instead of flashing a blank shell.
export default function Loading() {
  return null;
}
