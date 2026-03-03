export type DuesReminderType = "d30" | "d7" | "d1" | "overdue_weekly";

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function daysUntilDue(input: { dueDate: Date; now: Date }) {
  const due = startOfUtcDay(input.dueDate);
  const now = startOfUtcDay(input.now);
  return Math.round((due.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function dueReminderTypeForDate(input: { dueDate: Date; now: Date }): DuesReminderType | null {
  const days = daysUntilDue(input);
  if (days === 30) return "d30";
  if (days === 7) return "d7";
  if (days === 1) return "d1";
  if (days < 0 && Math.abs(days) % 7 === 0) return "overdue_weekly";
  return null;
}
