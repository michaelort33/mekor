export const MAX_NEWSLETTER_HTML_CHARS = 120_000;
export const MAX_NEWSLETTER_BLOB_BYTES = 500 * 1024;

export type HtmlLintIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
};

export function sanitizeNewsletterHtml(input: string): string {
  let html = String(input ?? "");

  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, ' $1="#"');
  html = html.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
  html = html.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "");
  html = html.replace(/<embed\b[^>]*\/?>/gi, "");

  if (html.length > MAX_NEWSLETTER_HTML_CHARS) {
    html = html.slice(0, MAX_NEWSLETTER_HTML_CHARS);
  }

  return html.trim();
}

export function lintNewsletterHtml(html: string): HtmlLintIssue[] {
  const issues: HtmlLintIssue[] = [];
  const value = String(html ?? "");

  if (!value.trim()) {
    issues.push({ level: "error", code: "empty", message: "HTML body is empty." });
    return issues;
  }

  if (value.length > MAX_NEWSLETTER_HTML_CHARS) {
    issues.push({
      level: "error",
      code: "too_large",
      message: `HTML exceeds ${MAX_NEWSLETTER_HTML_CHARS} characters.`,
    });
  }

  if (/<script\b/i.test(value)) {
    issues.push({ level: "error", code: "script_tag", message: "Script tags are not allowed in email HTML." });
  }

  if (/\son[a-z]+\s*=/i.test(value)) {
    issues.push({ level: "error", code: "inline_handler", message: "Inline event handlers are not allowed." });
  }

  if (/javascript\s*:/i.test(value)) {
    issues.push({ level: "error", code: "javascript_url", message: "javascript: URLs are not allowed." });
  }

  if (!/<html[\s>]/i.test(value) && !/<body[\s>]/i.test(value) && !/<table[\s>]/i.test(value)) {
    issues.push({
      level: "warning",
      code: "structure",
      message: "Email HTML usually includes a table-based or full document structure.",
    });
  }

  if (!/style\s*=/i.test(value) && !/<style[\s>]/i.test(value)) {
    issues.push({
      level: "warning",
      code: "no_styles",
      message: "No inline or embedded styles detected; email clients may render poorly.",
    });
  }

  return issues;
}

export function assertSafeNewsletterHtml(html: string): string {
  const sanitized = sanitizeNewsletterHtml(html);
  const errors = lintNewsletterHtml(sanitized).filter((issue) => issue.level === "error");
  if (errors.length > 0) {
    throw new Error(errors.map((issue) => issue.message).join(" "));
  }
  return sanitized;
}
