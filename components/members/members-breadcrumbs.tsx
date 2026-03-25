"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AreaSwitcher } from "@/components/navigation/area-switcher";
import styles from "./members-breadcrumbs.module.css";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type MembersNavSection =
  | "dashboard"
  | "profile"
  | "payments"
  | "dues"
  | "family"
  | "inbox"
  | "host-events"
  | "members"
  | "community"
  | "none";

type MembersBreadcrumbsContext = "member" | "authenticated" | "public";

type MembersBreadcrumbsProps = {
  items: BreadcrumbItem[];
  context?: MembersBreadcrumbsContext;
  activeSection?: MembersNavSection;
};

const memberLinks: Array<{ section: MembersNavSection; label: string; href: string }> = [
  { section: "dashboard", label: "Dashboard", href: "/account" },
  { section: "profile", label: "Profile", href: "/account/profile" },
  { section: "payments", label: "Payments", href: "/account/payments" },
  { section: "dues", label: "Dues", href: "/account/dues" },
  { section: "host-events", label: "Host Events", href: "/account/member-events" },
  { section: "family", label: "Family", href: "/account/family" },
  { section: "inbox", label: "Inbox", href: "/account/inbox" },
  { section: "members", label: "Members Area", href: "/members" },
  { section: "community", label: "Community Directory", href: "/community" },
];

const publicLinks: Array<{ section: MembersNavSection; label: string; href: string }> = [
  { section: "community", label: "Community Directory", href: "/community" },
  { section: "none", label: "Membership", href: "/membership" },
  { section: "none", label: "Events", href: "/events" },
];

const authenticatedLinks: Array<{ section: MembersNavSection; label: string; href: string }> = [
  { section: "dashboard", label: "Account", href: "/account" },
  { section: "profile", label: "Profile", href: "/account/profile" },
  { section: "none", label: "Membership", href: "/membership" },
];

export function MembersBreadcrumbs({
  items,
  context = "member",
  activeSection = "none",
}: MembersBreadcrumbsProps) {
  const pathname = usePathname();
  const links = context === "member" ? memberLinks : context === "authenticated" ? authenticatedLinks : publicLinks;
  const currentPath = pathname ?? "/";
  const currentArea = context === "public" ? "site" : "member";

  return (
    <nav className={styles.wrap} aria-label="Members navigation">
      <div className={styles.topRow}>
        <div className={styles.trail} aria-label="Breadcrumb">
          {items.map((item, index) => (
            <span key={`${item.label}-${index}`}>
              {item.href ? (
                <Link href={item.href} className={styles.crumb}>
                  {item.label}
                </Link>
              ) : (
                <span className={styles.crumbCurrent} aria-current="page">
                  {item.label}
                </span>
              )}
              {index < items.length - 1 ? <span className={styles.sep}>/</span> : null}
            </span>
          ))}
        </div>

        <div className={styles.actions}>
          <AreaSwitcher
            currentPath={currentPath}
            currentArea={currentArea}
            includeSignInLinks={context === "public"}
            variant="compact"
          />
          {context === "member" || context === "authenticated" ? (
            <form action="/logout" method="post">
              <button type="submit" className={styles.pillAction}>
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/login?next=%2Fmembers" className={styles.pillAction}>
              Sign in
            </Link>
          )}
        </div>
      </div>

      <div className={styles.hubLinks}>
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={`${styles.hubLink}${activeSection === link.section ? ` ${styles.hubLinkActive}` : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
