import { AdminShell } from "@/components/admin/admin-shell";
import { AskMekorAdminConsole } from "@/components/ask-mekor/ask-mekor-admin-console";

export const dynamic = "force-dynamic";

export default function AdminAskMekorPage() {
  return (
    <AdminShell
      currentPath="/admin/ask-mekor"
      title="Ask Mekor"
      description="Review public and private questions, answer them, and keep the Q&A board moving."
      stats={[
        { label: "Primary job", value: "Triage", hint: "Public and private flows share one queue" },
        { label: "Private path", value: "Inbox-backed", hint: "Admins reply through linked private threads" },
        { label: "Public path", value: "Board-backed", hint: "Admin answers publish on the public question page" },
      ]}
    >
      <AskMekorAdminConsole />
    </AdminShell>
  );
}
