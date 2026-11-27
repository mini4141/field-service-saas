import { defineConfig } from "@playwright/test";

// The stack (api, worker, web, mobile web, thumbnailer) is started by scripts/dev-up.sh or deploy.sh.
const out = process.env.PW_OUT_DIR ?? "test-results";
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: `${out}/web-html-report`, open: "never" }],
    ["junit", { outputFile: `${out}/web-playwright-junit.xml` }],
  ],
  outputDir: `${out}/web-artifacts`,
  use: {
    baseURL: process.env.WEB_URL ?? "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
    trace: "off",
  },
});
