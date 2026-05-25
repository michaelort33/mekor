import Link from "next/link";

import { NativeShell } from "@/components/navigation/native-shell";

export default function NotFound() {
  return (
    <NativeShell currentPath="/" className="not-found-page" contentClassName="mirror-error">
      <h1>Page not found</h1>
      <p>We couldn&apos;t find the page you were looking for. The link may be out of date, or the page may have moved.</p>
      <p>
        <Link href="/">Go back to home</Link>
      </p>
    </NativeShell>
  );
}
