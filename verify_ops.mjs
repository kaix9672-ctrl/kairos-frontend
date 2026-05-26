// KAIROS Ops dashboard — headless verification (Playwright). Observe-only, working tree.
// Asserts: hidden on normal URL, appears at #kairos-ops, reports the live/mock badge + row
// counts, normal app intact, zero console/page errors. Run with backend up (expect live·test)
// and with backend down (expect mock) to verify the fallback.
import { chromium } from "playwright";
const BASE = process.env.KAIROS_UI_BASE || "http://localhost:5173";
const errs = []; let fails = 0;
const ok = (l, c, d = "") => { if (!c) fails++; console.log(`  [${c ? "PASS" : "FAIL"}] ${l}${d ? " — " + d : ""}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
page.on("pageerror", (e) => errs.push("pageerror: " + String(e)));

// normal URL -> hidden + app works
await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
ok("dashboard HIDDEN on normal URL", (await page.locator(".kos").count()) === 0);
ok("normal app renders", await page.getByText(/KAIROS does the watching/i).isVisible().catch(() => false));

// #kairos-ops -> visible + badge + rows
await page.goto(BASE + "/#kairos-ops", { waitUntil: "networkidle", timeout: 30000 });
await page.locator(".kos").first().waitFor({ timeout: 10000 }).catch(() => {});
await page.waitForTimeout(1500); // allow /internal/os/* fetch to resolve
ok("dashboard APPEARS at #kairos-ops", await page.locator(".kos").first().isVisible().catch(() => false));
const badge = (await page.locator(".kos-badge").first().innerText().catch(() => "")).trim();
const inboxRows = await page.locator(".kos-card").first().locator(".kos-row").count().catch(() => 0);
console.log(`  badge="${badge}"  inboxRows=${inboxRows}`);
ok("badge present (live or mock)", /live|mock/i.test(badge), badge);
await page.screenshot({ path: "/tmp/kairos_shots/ops_state.png", fullPage: true }).catch(() => {});

ok("zero console / page errors", errs.length === 0, errs.slice(0, 4).join(" | "));
await browser.close();
console.log(`\nBADGE=${badge} INBOX_ROWS=${inboxRows} RESULT=${fails === 0 ? "PASS" : fails + " FAIL(s)"}`);
process.exit(fails ? 1 : 0);
