// KAIROS — headless UI verification (Playwright/Chromium). Observe-only.
// Drives the REAL local app (localhost:5173 -> local mock backend) and reports PASS/FAIL
// per stage, capturing console errors, page errors, failed requests, and screenshots.
// Run: node verify_ui.mjs
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.KAIROS_UI_BASE || "http://localhost:5173";
const SHOTS = "/tmp/kairos_shots";
fs.mkdirSync(SHOTS, { recursive: true });

const consoleErrors = [];
const pageErrors = [];
const failedReqs = [];
let fails = 0;
const ok = (label, cond, detail = "") => {
  if (!cond) fails++;
  console.log(`  [${cond ? "PASS" : "FAIL"}] ${label}${detail ? " — " + detail : ""}`);
  return cond;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("requestfailed", (r) => failedReqs.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`));
page.on("response", (r) => { if (r.status() >= 400) failedReqs.push(`${r.status()} ${r.url()}`); });

async function mascotStats() {
  return page.$$eval('img[src*="/brand/mascots/"]', (imgs) =>
    imgs.map((i) => ({ loaded: i.complete && i.naturalWidth > 0, w: i.getBoundingClientRect().width })));
}

try {
  console.log(`OBSERVE UI @ ${BASE}\n--- Stage 1: Homepage ---`);
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: `${SHOTS}/1-home.png`, fullPage: true });
  let m = await mascotStats();
  ok("homepage renders mascot images", m.length > 0, `${m.length} found`);
  ok("all homepage mascots loaded (naturalWidth>0)", m.length > 0 && m.every((x) => x.loaded));
  ok("all homepage mascots visible (box>0)", m.length > 0 && m.every((x) => x.w > 0));

  console.log("--- Stage 2: sample scan -> results ---");
  await page.getByRole("button", { name: /sample/i }).first().click();
  await page.getByText(/Scan complete/i).waitFor({ timeout: 30000 });
  await page.screenshot({ path: `${SHOTS}/2-results.png`, fullPage: true });
  ok("results screen reached (Scan complete)", true);
  ok("results has category mascots", (await mascotStats()).length > 0);

  console.log("--- Stage 3: subscribe ---");
  await page.getByRole("button", { name: /Keep KAIROS watching/i }).click();
  await page.getByText(/Keep the watch running/i).waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/3-subscribe.png`, fullPage: true });
  ok("subscribe screen reached", true);
  await page.getByRole("button", { name: /^Choose$/ }).first().click();

  console.log("--- Stage 4: pay -> mock activate ---");
  await page.getByText(/Start your watch/i).waitFor({ timeout: 15000 });
  await page.getByPlaceholder(/email/i).fill("uitest@example.com");
  await page.screenshot({ path: `${SHOTS}/4-pay.png`, fullPage: true });
  await page.getByRole("button", { name: /Activate monitoring/i }).click();

  console.log("--- Stage 5: onboard -> dashboard ---");
  await page.getByText(/The watch is on/i).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: /dashboard/i }).click();
  await page.getByText(/On watch/i).waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/5-dashboard.png`, fullPage: true });
  ok("dashboard reached (On watch) with active subscription", true);
  ok("dashboard has mascots", (await mascotStats()).length > 0);
} catch (e) {
  fails++;
  console.log(`  [FAIL] flow threw: ${String(e).split("\n")[0]}`);
  await page.screenshot({ path: `${SHOTS}/error.png`, fullPage: true }).catch(() => {});
}

console.log("\n--- runtime signals ---");
ok("no uncaught page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
ok("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
// failed requests are informational (backend writes etc.) — report, don't fail the run on 4xx alone
if (failedReqs.length) console.log("  (note) failed/4xx requests:", failedReqs.slice(0, 5).join(" | "));

await browser.close();
console.log(`\nRESULT: ${fails === 0 ? "ALL UI STAGES PASS" : fails + " FAIL(s)"} — screenshots in ${SHOTS}`);
process.exit(fails === 0 ? 0 : 1);
