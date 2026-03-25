"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { UserSessionRole } from "@/lib/auth/session";
import type { AccountAccessState } from "@/lib/auth/account-access";
import { buildAreaSwitcherLinks, type AppArea } from "@/lib/navigation/area-switcher";
import styles from "./area-switcher.module.css";

type AreaSwitcherProps = {
  currentPath: string;
  currentArea?: AppArea;
  role?: UserSessionRole | null;
  authenticated?: boolean;
  canAccessMembersArea?: boolean;
  accessState?: AccountAccessState | null;
  isCheckingAuth?: boolean;
  includeSignInLinks?: boolean;
  variant?: "default" | "compact" | "mobile";
  className?: string;
};

type ProfileResponse = {
  role: UserSessionRole | null;
  authenticated: boolean;
  canAccessMembersArea: boolean;
  accessState: AccountAccessState | null;
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function AreaSwitcher({
  currentPath,
  currentArea,
  role: providedRole,
  authenticated: providedAuthenticated,
  canAccessMembersArea: providedCanAccessMembersArea,
  accessState: providedAccessState,
  isCheckingAuth: providedCheckingAuth,
  includeSignInLinks = false,
  variant = "default",
  className,
}: AreaSwitcherProps) {
  const hasControlledAuthState =
    providedRole !== undefined ||
    providedAuthenticated !== undefined ||
    providedCanAccessMembersArea !== undefined ||
    providedAccessState !== undefined ||
    providedCheckingAuth !== undefined;
  const [role, setRole] = useState<UserSessionRole | null>(providedRole ?? null);
  const [authenticated, setAuthenticated] = useState(providedAuthenticated ?? providedRole != null);
  const [canAccessMembersArea, setCanAccessMembersArea] = useState(
    providedCanAccessMembersArea ?? (providedRole === "member" || providedRole === "admin" || providedRole === "super_admin"),
  );
  const [accessState, setAccessState] = useState<AccountAccessState | null>(providedAccessState ?? null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(providedCheckingAuth ?? !hasControlledAuthState);

  useEffect(() => {
    if (providedRole !== undefined) {
      setRole(providedRole);
    }
  }, [providedRole]);

  useEffect(() => {
    if (providedAuthenticated !== undefined) {
      setAuthenticated(providedAuthenticated);
    }
  }, [providedAuthenticated]);

  useEffect(() => {
    if (providedCanAccessMembersArea !== undefined) {
      setCanAccessMembersArea(providedCanAccessMembersArea);
    }
  }, [providedCanAccessMembersArea]);

  useEffect(() => {
    if (providedAccessState !== undefined) {
      setAccessState(providedAccessState);
    }
  }, [providedAccessState]);

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
          setAuthenticated(false);
          setCanAccessMembersArea(false);
          setAccessState(null);
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as ProfileResponse;
        setRole(payload.role ?? null);
        setAuthenticated(Boolean(payload.authenticated));
        setCanAccessMembersArea(Boolean(payload.canAccessMembersArea));
        setAccessState(payload.accessState ?? null);
      } catch {
        if (active) {
          setRole(null);
          setAuthenticated(false);
          setCanAccessMembersArea(false);
          setAccessState(null);
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
        authenticated,
        canAccessMembersArea,
        accessState,
        includeSignInLinks: includeSignInLinks && !isCheckingAuth,
      }),
    [accessState, authenticated, canAccessMembersArea, currentArea, currentPath, includeSignInLinks, isCheckingAuth, role],
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
