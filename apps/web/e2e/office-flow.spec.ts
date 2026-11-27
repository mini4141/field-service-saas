import { expect, test } from "@playwright/test";
import { join } from "node:path";

const proofDir = process.env.PROOF_DIR; // when set, also capture proof screenshots
const shot = async (page: import("@playwright/test").Page, name: string) => {
  if (proofDir) await page.screenshot({ path: join(proofDir, name), fullPage: true });
};

test("office flow: signup -> invite -> customer -> quote -> public accept -> schedule", async ({ page, context }) => {
  const tag = Date.now().toString(36);

  // F1: signup
  await page.goto("/signup");
  await page.getByLabel("Company name").fill(`Sakura Cleaning ${tag}`);
  await page.getByLabel("Your name").fill("Hana Sato");
  await page.getByLabel("Email").fill(`owner-${tag}@e2e.test`);
  await page.getByLabel("Password (min 8)").fill("password123");
  await shot(page, "01-signup.png");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("whoami")).toContainText("owner");
  await expect(page.getByRole("link", { name: "Team" })).toBeVisible(); // owner navigation

  // F1: invite a field user, the link is shown on screen
  await page.goto("/team");
  await page.getByLabel("Name", { exact: true }).fill("Ken Watanabe");
  await page.getByLabel("Email", { exact: true }).fill(`ken-${tag}@e2e.test`);
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page.getByTestId("invite-link")).toContainText("/accept-invite?token=");

  // F2: customer
  await page.goto("/customers");
  await page.getByLabel("Name", { exact: true }).fill("Yamada Trading Co.");
  await page.getByLabel("Address").fill("1-2-3 Shibuya, Tokyo");
  await page.getByRole("button", { name: "Add customer" }).click();
  await expect(page.getByText("Yamada Trading Co.")).toBeVisible();

  // F3: quote builder, total is JPY 45,000
  await page.goto("/quotes/new");
  await page.getByLabel("Title").fill("Office deep clean");
  await expect(page.getByLabel("Customer")).toContainText("Yamada Trading Co.");
  await page.getByLabel("Description").first().fill("Deep cleaning");
  await page.getByLabel("Unit price (¥)").first().fill("30000");
  await page.getByRole("button", { name: "+ Add line" }).click();
  await page.getByLabel("Description").nth(1).fill("Window cleaning");
  await page.getByLabel("Qty").nth(1).fill("2");
  await page.getByLabel("Unit price (¥)").nth(1).fill("6000");
  await page.getByLabel("Tax %").nth(1).fill("0");
  await expect(page.getByTestId("quote-total")).toHaveText("Total: ¥45,000");
  await shot(page, "02-quote-builder.png");
  await page.getByRole("button", { name: "Save quote" }).click();
  await page.getByRole("button", { name: "Send to customer" }).click();
  const link = await page.getByTestId("public-link").getAttribute("href");
  expect(link).toContain("/q/");

  // F3: the customer accepts through the public link (server action)
  const customer = await context.newPage();
  await customer.goto(link!);
  await expect(customer.getByText("Total: ¥45,000")).toBeVisible();
  await shot(customer, "03-public-quote-accept.png");
  await customer.getByRole("button", { name: "Accept quote" }).click();
  await expect(customer.getByTestId("accepted")).toBeVisible();

  // F4: schedule by dragging the new job onto the calendar
  await page.goto("/schedule");
  await page.getByLabel("Assign to").selectOption({ label: "Ken Watanabe" });
  const cell = page.getByTestId(`cell-${new Date().getDay()}-10`);
  await page.getByTestId("job-Office deep clean").dragTo(cell);
  await expect(cell).toContainText("Office deep clean");
  await shot(page, "04-calendar.png");
});
