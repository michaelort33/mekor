import { AdminShell } from "@/components/admin/admin-shell";
import { FeedbackAdminConsole } from "@/components/feedback/feedback-admin-console";

export const dynamic = "force-dynamic";

export default function AdminFeedbackPage() {
  return (
    <AdminShell
      currentPath="/admin/feedback"
      title="Suggestions & Feedback"
      description="Review ideas, bugs, and appreciation collected by the sitewide Share an idea widget."
      stats={[
        { label: "Source", value: "Chat widget", hint: "Floating launcher on public pages" },
        { label: "AI role", value: "Collector only", hint: "No Q&A / no knowledge base" },
        { label: "Storage", value: "Structured rows", hint: "site_suggestions + session transcript" },
      ]}
    >
      <FeedbackAdminConsole />
    </AdminShell>
  );
}
