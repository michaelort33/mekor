export function getFormNotifyTo() {
  const value = process.env.FORM_NOTIFY_EMAIL_TO;
  if (!value) {
    throw new Error("FORM_NOTIFY_EMAIL_TO is required");
  }
  return value;
}

export function getFormNotifyFrom() {
  const value = process.env.FORM_NOTIFY_EMAIL_FROM;
  if (!value) {
    throw new Error("FORM_NOTIFY_EMAIL_FROM is required");
  }
  return value;
}
