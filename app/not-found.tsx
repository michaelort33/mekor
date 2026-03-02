import Link from "next/link";

import { NativeShell } from "@/components/navigation/native-shell";

export default function NotFound() {
  return (
    <NativeShell currentPath="/" className="not-found-page" contentClassName="mirror-error">
      <h1>404 - Not Found</h1>
      <p>The requested URL does not exist in the mirrored public route contract.</p>
      <p>
        <Link href="/">Go back to home</Link>
      </p>
    </NativeShell>
  );
}
