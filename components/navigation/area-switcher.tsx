"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { UserSessionRole } from "@/lib/auth/session";
import { buildAreaSwitcherLinks, type AppArea } from "@/lib/navigation/area-switcher";
import styles from "./area-switcher.module.css";

type AreaSwitcherProps = {
  currentPath: string;
  currentArea?: AppArea;
  role?: UserSessionRole | null;
  isCheckingAuth?: boolean;
  includeSignInLinks?: boolean;
  variant?: "default" | "compact" | "mobile";
  className?: string;
};

type ProfileResponse = {
  role: UserSessionRole | null;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function AreaSwitcher({
  currentPath,
  currentArea,
  role: providedRole,
  isCheckingAuth: providedCheckingAuth,
  includeSignInLinks = false,
  variant = "default",
  className,
}: AreaSwitcherProps) {
  const hasControlledAuthState = providedRole !== undefined || providedCheckingAuth !== undefined;
  const [role, setRole] = useState<UserSessionRole | null>(providedRole ?? null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(providedCheckingAuth ?? !hasControlledAuthState);

  useEffect(() => {
    if (providedRole !== undefined) {
      setRole(providedRole);
    }
  }, [providedRole]);

  useEffect(() => {
    if (providedCheckingAuth !== undefined) {
      setIsCheckingAuth(providedCheckingAuth);
    }
  }, [providedCheckingAuth]);

  useEffect(() => {
    if (hasControlledAuthState) {
      return;
    }

    let active = true;

    async function loadRole() {
      try {
        const response = await fetch("/api/auth/status", { cache: "no-store" });
        if (!active) {
          return;
        }

        if (!response.ok) {
          setRole(null);
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as ProfileResponse;
        setRole(payload.role ?? null);
      } catch {
        if (active) {
          setRole(null);
        }
      } finally {
        if (active) {
          setIsCheckingAuth(false);
        }
      }
    }

    void loadRole();

    return () => {
      active = false;
    };
  }, [hasControlledAuthState]);

  const links = useMemo(
    () =>
      buildAreaSwitcherLinks({
        currentPath,
        currentArea,
        role,
        includeSignInLinks: includeSignInLinks && !isCheckingAuth,
      }),
    [currentArea, currentPath, includeSignInLinks, isCheckingAuth, role],
  );

  return (
    <nav
      className={joinClassNames(styles.switcher, styles[`switcher--${variant}`], className)}
      aria-label="Area navigation"
    >
      <span className={styles.label}>Go to</span>
      <div className={styles.links}>
        {links.map((link) => (
          <Link
            key={link.area}
            href={link.href}
            className={joinClassNames(
              styles.link,
              link.current && styles.linkCurrent,
              link.requiresSignIn && styles.linkSignIn,
            )}
            aria-current={link.current ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
