import type { ReactNode } from "react";

import { MarketingFooter } from "@/components/marketing/page-shell";
import { SiteNavigation } from "@/components/navigation/site-navigation";
import { cn } from "@/lib/utils";

type NativeShellProps = {
  currentPath: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function NativeShell({
  currentPath,
  children,
  className,
  contentClassName,
}: NativeShellProps) {
  return (
    <main
      className={cn(
        "min-h-screen bg-[radial-gradient(circle_at_top,rgba(225,213,192,0.32),transparent_35%),linear-gradient(180deg,#f8f3eb_0%,#f2ede4_100%)] text-[var(--color-foreground)]",
        className,
      )}
      data-native-shell="true"
    >
      <SiteNavigation currentPath={currentPath} />
      <section className={cn("mx-auto flex w-full max-w-[84rem] flex-col gap-8 px-4 pb-16 pt-6 sm:px-6 lg:px-8", contentClassName)}>
        {children}
        <MarketingFooter />
      </section>
    </main>
  );
}
