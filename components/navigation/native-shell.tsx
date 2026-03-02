import type { ReactNode } from "react";

import { SiteNavigation } from "@/components/navigation/site-navigation";

type NativeShellProps = {
  currentPath: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function NativeShell({
  currentPath,
  children,
  className,
  contentClassName,
}: NativeShellProps) {
  return (
    <main className={joinClassNames("native-shell", className)} data-native-shell="true">
      <SiteNavigation currentPath={currentPath} />
      <section className={joinClassNames("native-shell__content", contentClassName)}>{children}</section>
    </main>
  );
}
