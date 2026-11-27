import { chromium, expect, test, type Page } from "@playwright/test";
import { join } from "node:path";

const API = process.env.API_URL ?? "http://localhost:4000";
const WEB = process.env.WEB_URL ?? "http://localhost:3000";
const proofDir = process.env.PROOF_DIR;
const shot = async (page: Page, name: string) => {
  if (proofDir) await page.screenshot({ path: join(proofDir, name), fullPage: true });
};

async function call<T>(method: string, path: string, token?: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}/api/v1${path}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

/** Arranges the state the office would have produced: an accepted quote, scheduled for Ken today. */
async function seedScheduledJob(tag: string) {
  const owner = await call<{ accessToken: string }>("POST", "/auth/signup", undefined, {
    companyName: `Sakura Cleaning ${tag}`, name: "Hana Sato", email: `owner-${tag}@e2e.test`, password: "password123",
  });
  const invite = await call<{ inviteToken: string; user: { id: string } }>("POST", "/auth/invite", owner.accessToken, {
    name: "Ken Watanabe", email: `ken-${tag}@e2e.test`, role: "field",
  });
  await call("POST", "/auth/accept-invite", undefined, { token: invite.inviteToken, password: "password123" });
  const customer = await call<{ id: string }>("POST", "/customers", owner.accessToken, { name: "Yamada Trading Co.", address: "1-2-3 Shibuya, Tokyo" });
  const quote = await call<{ id: string; token: string }>("POST", "/quotes", owner.accessToken, {
    customerId: customer.id, title: "Office deep clean",
    items: [
      { description: "Deep cleaning", qty: 1, unitPrice: 30000, taxPercent: 10 },
      { description: "Window cleaning", qty: 2, unitPrice: 6000, taxPercent: 0 },
    ],
  });
  await call("POST", `/quotes/${quote.id}/send`, owner.accessToken);
  await call("POST", `/public/quotes/${quote.token}/accept`);
  const jobs = await call<{ id: string }[]>("GET", "/jobs", owner.accessToken);
  const at = new Date();
  at.setHours(10, 0, 0, 0);
  await call("PATCH", `/jobs/${jobs[0].id}/schedule`, owner.accessToken, { scheduledAt: at.toISOString(), assigneeId: invite.user.id });
  return { tag, jobId: jobs[0].id };
}

test("field flow (Expo web): login -> today -> check in -> 2 photos -> complete -> thumbnails + invoice", async ({ page, browser }) => {
  const tag = Date.now().toString(36);
  const { jobId } = await seedScheduledJob(tag);

  // F5: login and see today's job
  await page.goto("/");
  await page.getByTestId("email").fill(`ken-${tag}@e2e.test`);
  await page.getByTestId("password").fill("password123");
  await page.getByTestId("btn-Sign in").click();
  await expect(page.getByTestId("job-card-Office deep clean")).toBeVisible();
  await shot(page, "05-mobile-today.png");

  // job detail: address, check-in, two photos (presigned PUT straight to S3), notes, complete
  await page.getByTestId("job-card-Office deep clean").click();
  await expect(page.getByTestId("address")).toContainText("1-2-3 Shibuya");
  await page.getByTestId("btn-Check in").click();
  await expect(page.getByTestId("status")).toContainText("in progress");

  const chooser = page.waitForEvent("filechooser");
  await page.getByTestId("btn-Add photos").click();
  await (await chooser).setFiles(["e2e/fixtures/photo1.png", "e2e/fixtures/photo2.png"]);
  await expect(page.getByTestId("photo-count")).toHaveText("2 photo(s) uploaded", { timeout: 30_000 });
  await page.getByTestId("notes").fill("All done, keys left with reception.");
  await shot(page, "06-mobile-complete-photos.png");
  await page.getByTestId("btn-Complete job").click();
  await expect(page.getByTestId("completed-banner")).toBeVisible();

  // F6 + F7 + F8 as the owner on the web app: thumbnails, invoice PDF and KPIs
  // full (new-headless) Chromium so the built-in PDF viewer renders the invoice in the screenshot
  const pdfBrowser = await chromium.launch({ channel: "chromium" });
  const web = await pdfBrowser.newPage({ viewport: { width: 1280, height: 900 } });
  await web.goto(`${WEB}/login`);
  await web.getByLabel("Email").fill(`owner-${tag}@e2e.test`);
  await web.getByLabel("Password").fill("password123");
  await web.getByRole("button", { name: "Sign in" }).click();
  await web.waitForURL(/dashboard/);

  await web.goto(`${WEB}/jobs/${jobId}`);
  await expect(web.getByTestId("thumb")).toHaveCount(2, { timeout: 60_000 }); // Lambda (or local watcher) made them
  await shot(web, "07-job-thumbnails.png");

  await expect(web.getByTestId("invoice-link")).toHaveText("ready", { timeout: 60_000 }); // worker rendered the PDF
  await web.getByTestId("invoice-link").click();
  await web.getByRole("button", { name: "Download PDF" }).click();
  const pdfUrl = await web.getByTestId("pdf-link").getAttribute("href");
  const pdf = Buffer.from(await (await fetch(pdfUrl!)).arrayBuffer());
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  await web.waitForTimeout(1500); // let the embedded viewer paint
  await shot(web, "08-invoice-pdf.png");

  await web.goto(`${WEB}/dashboard`);
  await expect(web.getByTestId("tile-Revenue invoiced")).toContainText("¥45,000");
  await expect(web.getByTestId("tile-Jobs completed (week)")).toContainText("1");
  await shot(web, "09-dashboard-kpis.png");

  const docs = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await docs.goto(`${API}/api/docs`);
  await expect(docs.getByText("Field Service SaaS API")).toBeVisible();
  await shot(docs, "10-swagger.png");
  await pdfBrowser.close();
});
