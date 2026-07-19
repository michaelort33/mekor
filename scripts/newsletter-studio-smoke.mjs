#!/usr/bin/env node
/**
 * Playwright smoke for newsletter studio (mocked APIs).
 * Usage: STUDIO_SMOKE=1 node scripts/newsletter-studio-smoke.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const PORT = Number(process.env.STUDIO_SMOKE_PORT || 3311);
const BASE = `http://127.0.0.1:${PORT}`;
const ARTIFACT_DIR = process.env.STUDIO_SMOKE_ARTIFACT_DIR || "/opt/cursor/artifacts";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {
      // retry
    }
    await sleep(1000);
  }
  throw new Error(`Server did not become ready at ${url}`);
}

async function main() {
  if (process.env.STUDIO_SMOKE !== "1") {
    console.error("Set STUDIO_SMOKE=1 to run this harness.");
    process.exit(1);
  }

  await mkdir(ARTIFACT_DIR, { recursive: true });

  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "-p", String(PORT), "-H", "127.0.0.1"],
    {
      env: {
        ...process.env,
        STUDIO_SMOKE: "1",
        PORT: String(PORT),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let serverLog = "";
  child.stdout.on("data", (chunk) => {
    serverLog += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    serverLog += chunk.toString();
  });

  const browser = await chromium.launch({ headless: true });
  try {
    await waitForServer(`${BASE}/dev/newsletter-studio-smoke`);
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    let lastSendPayload = null;
    const adminCalls = [];
    await page.route("**/api/admin/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      adminCalls.push(`${method} ${url.pathname}`);

      if (url.pathname === "/api/admin/templates" && method === "PUT") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      }

      if (url.pathname === "/api/admin/templates" && method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            template: {
              id: 9001,
              title: "Smoke Test Newsletter",
              subject: "Shabbat Shalom — Smoke",
              bodyHtml:
                '<table style="width:100%"><tr><td style="color:#234d78"><h1>Shabbat Shalom</h1><p id="intro">Welcome to Mekor Habracha.</p></td></tr></table>',
              status: "draft",
              publishOnSend: false,
            },
          }),
        });
      }

      if (url.pathname === "/api/admin/newsletters/subscribers") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            subscribers: [
              { personId: 11, displayName: "Ada Subscriber", email: "ada@example.com" },
              { personId: 12, displayName: "Ben Subscriber", email: "ben@example.com" },
            ],
          }),
        });
      }

      if (url.pathname === "/api/admin/templates/send" && method === "POST") {
        lastSendPayload = request.postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            mode: lastSendPayload?.mode || "send",
            status: "completed",
            successCount: lastSendPayload?.mode === "preview" ? 0 : 1,
            failedCount: 0,
            skippedCount: 0,
            recipientCount: 1,
            campaignId: 42,
          }),
        });
      }

      if (url.pathname === "/api/admin/templates/chat") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ error: "chat mocked" }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto(`${BASE}/dev/newsletter-studio-smoke`, { waitUntil: "networkidle" });
    await page.getByLabel("Newsletter HTML source").waitFor({ timeout: 60_000 });

    const nextHtml =
      '<table style="width:100%"><tr><td style="color:#234d78"><h1>Shabbat Shalom</h1><p id="intro">Edited live in smoke test.</p></td></tr></table>';
    await page.getByLabel("Newsletter HTML source").fill(nextHtml);
    await page.waitForTimeout(300);
    const preview = page.frameLocator('iframe[title="Newsletter live preview"]');
    await preview.locator("#intro").waitFor({ timeout: 10_000 });
    const introText = await preview.locator("#intro").innerText();
    if (!introText.includes("Edited live in smoke test")) {
      throw new Error(`Preview did not update. Got: ${introText}`);
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "newsletter-studio-smoke-edit.png"),
      fullPage: true,
    });

    const click = (locator) => locator.click({ force: true, timeout: 15_000 });

    await page.getByRole("button", { name: "Show it in Chat" }).evaluate((el) => el.click());
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "newsletter-studio-smoke-after-chat-click.png"),
      fullPage: true,
    });
    console.log("adminCalls", adminCalls.join(", "));
    const bodyText = await page.locator("body").innerText();
    if (!bodyText.includes("Ask for edits")) {
      throw new Error(`Chat drawer did not open. Body snippet: ${bodyText.slice(0, 500)}`);
    }
    await page.getByText("Ask for edits — the HTML and preview update live.").waitFor({
      timeout: 5_000,
    });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "newsletter-studio-smoke-chat.png"),
      fullPage: true,
    });
    await click(page.getByRole("button", { name: "Close", exact: true }).first());
    await page.getByText("Ask for edits — the HTML and preview update live.").waitFor({
      state: "hidden",
      timeout: 10_000,
    });

    const recipientTrigger = page.getByRole("combobox", { name: /Search subscribers by name or email/i });
    await recipientTrigger.evaluate((el) => el.click());
    await page.getByPlaceholder("Search confirmed weekly subscribers").waitFor({ timeout: 10_000 });
    await page.getByPlaceholder("Search confirmed weekly subscribers").fill("Ada");
    await page.waitForTimeout(500);
    if (!adminCalls.some((call) => call.includes("/api/admin/newsletters/subscribers"))) {
      throw new Error(`Subscribers API was not called. Calls: ${adminCalls.join(", ")}`);
    }
    await page.getByText("ada@example.com").evaluate((el) => el.click());
    await page.getByLabel("Remove Ada Subscriber").waitFor({ timeout: 10_000 });
    await page.getByRole("button", { name: "Preview recipients" }).evaluate((el) => el.click());
    await page.getByText(/Preview ready for/i).waitFor({ timeout: 10_000 });
    if (!lastSendPayload || lastSendPayload.mode !== "preview" || lastSendPayload.personIds?.[0] !== 11) {
      throw new Error(`Unexpected preview payload: ${JSON.stringify(lastSendPayload)}`);
    }

    await click(page.getByRole("button", { name: /Send to 1/ }));
    await page.getByRole("heading", { name: "Send newsletter?" }).waitFor();
    await click(page.getByRole("button", { name: "Confirm send" }));
    await page.getByText(/Campaign sent|queued|still sending|Preview ready/i).first().waitFor({
      timeout: 10_000,
    });
    if (!lastSendPayload || lastSendPayload.mode !== "send" || lastSendPayload.recipientGroup !== "selected") {
      throw new Error(`Unexpected send payload: ${JSON.stringify(lastSendPayload)}`);
    }
    if (lastSendPayload.bodyHtmlOverride && !String(lastSendPayload.bodyHtmlOverride).includes("Edited live")) {
      throw new Error("Send payload missing current HTML override");
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "newsletter-studio-smoke-send.png"),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "newsletter-studio-smoke-mobile.png"),
      fullPage: true,
    });

    console.log("newsletter-studio-smoke: PASS");
    console.log(`artifacts: ${ARTIFACT_DIR}/newsletter-studio-smoke-*.png`);
  } catch (error) {
    console.error("newsletter-studio-smoke: FAIL");
    console.error(error);
    console.error("--- server log (tail) ---");
    console.error(serverLog.slice(-4000));
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
    child.kill("SIGTERM");
    await sleep(500);
    if (!child.killed) child.kill("SIGKILL");
  }
}

main();
