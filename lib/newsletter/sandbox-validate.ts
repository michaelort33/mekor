import { lintNewsletterHtml, sanitizeNewsletterHtml, type HtmlLintIssue } from "@/lib/newsletter/html-sanitize";

export type SandboxValidateResult = {
  ok: boolean;
  mode: "sandbox" | "local-fallback";
  sanitizedHtml: string;
  issues: HtmlLintIssue[];
  stdout?: string;
  stderr?: string;
};

/**
 * Prefer Vercel Sandbox when OIDC/token is available; otherwise run the same
 * lint/sanitize rules locally so CI and unconfigured environments still work.
 */
export async function validateNewsletterHtmlInSandbox(html: string): Promise<SandboxValidateResult> {
  const sanitizedHtml = sanitizeNewsletterHtml(html);
  const localIssues = lintNewsletterHtml(sanitizedHtml);
  const canUseSandbox = Boolean(process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL_TOKEN);

  if (!canUseSandbox) {
    return {
      ok: localIssues.every((issue) => issue.level !== "error"),
      mode: "local-fallback",
      sanitizedHtml,
      issues: localIssues,
    };
  }

  try {
    const { Sandbox } = await import("@vercel/sandbox");
    const ms = (await import("ms")).default;
    const sandbox = await Sandbox.create({
      resources: { vcpus: 2 },
      timeout: ms("45s"),
      runtime: "node22",
    });

    try {
      const script = `
const fs = require('fs');
const html = fs.readFileSync('/vercel/sandbox/input.html', 'utf8');
const issues = [];
if (!html.trim()) issues.push({ level: 'error', code: 'empty', message: 'HTML body is empty.' });
if (html.length > 120000) issues.push({ level: 'error', code: 'too_large', message: 'HTML exceeds 120000 characters.' });
if (/<script\\\\b/i.test(html)) issues.push({ level: 'error', code: 'script_tag', message: 'Script tags are not allowed.' });
if (/\\\\son[a-z]+\\\\s*=/i.test(html)) issues.push({ level: 'error', code: 'inline_handler', message: 'Inline event handlers are not allowed.' });
if (/javascript\\\\s*:/i.test(html)) issues.push({ level: 'error', code: 'javascript_url', message: 'javascript: URLs are not allowed.' });
let cleaned = html
  .replace(/<script\\\\b[^<]*(?:(?!<\\\\/script>)<[^<]*)*<\\\\/script>/gi, '')
  .replace(/\\\\son[a-z]+\\\\s*=\\\\s*(\"[^\"]*\"|'[^']*'|[^\\\\s>]+)/gi, '')
  .replace(/\\\\s(href|src)\\\\s*=\\\\s*(['\"])\\\\s*javascript:[^'\"]*\\\\2/gi, ' \$1=\"#\"')
  .trim();
fs.writeFileSync('/vercel/sandbox/output.html', cleaned);
fs.writeFileSync('/vercel/sandbox/report.json', JSON.stringify({ issues, byteLength: Buffer.byteLength(cleaned) }, null, 2));
console.log(JSON.stringify({ ok: issues.every((i) => i.level !== 'error'), issueCount: issues.length }));
`;

      await sandbox.writeFiles([
        { path: "/vercel/sandbox/input.html", content: Buffer.from(sanitizedHtml, "utf8") },
        { path: "/vercel/sandbox/validate.mjs", content: Buffer.from(script, "utf8") },
      ]);

      const result = await sandbox.runCommand({ cmd: "node", args: ["validate.mjs"] });
      const stdout = await result.stdout();
      const stderr = await result.stderr();

      let outputHtml = sanitizedHtml;
      let issues = localIssues;
      try {
        const outputBuffer = await sandbox.readFile({ path: "/vercel/sandbox/output.html" });
        if (outputBuffer) {
          outputHtml = Buffer.isBuffer(outputBuffer)
            ? outputBuffer.toString("utf8")
            : typeof outputBuffer === "string"
              ? outputBuffer
              : sanitizedHtml;
        }
        const reportBuffer = await sandbox.readFile({ path: "/vercel/sandbox/report.json" });
        if (reportBuffer) {
          const reportText = Buffer.isBuffer(reportBuffer)
            ? reportBuffer.toString("utf8")
            : String(reportBuffer);
          const report = JSON.parse(reportText) as { issues?: HtmlLintIssue[] };
          if (Array.isArray(report.issues)) issues = report.issues;
        }
      } catch {
        // keep local fallback issues/html
      }

      return {
        ok: result.exitCode === 0 && issues.every((issue) => issue.level !== "error"),
        mode: "sandbox",
        sanitizedHtml: sanitizeNewsletterHtml(outputHtml),
        issues,
        stdout,
        stderr,
      };
    } finally {
      await sandbox.stop().catch(() => undefined);
    }
  } catch (error) {
    return {
      ok: localIssues.every((issue) => issue.level !== "error"),
      mode: "local-fallback",
      sanitizedHtml,
      issues: [
        ...localIssues,
        {
          level: "warning",
          code: "sandbox_unavailable",
          message: error instanceof Error ? `Sandbox unavailable: ${error.message}` : "Sandbox unavailable",
        },
      ],
    };
  }
}
