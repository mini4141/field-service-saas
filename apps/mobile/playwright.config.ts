import { defineConfig } from "@playwright/test";

const out = process.env.PW_OUT_DIR ?? "test-results";
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: `${out}/mobile-html-report`, open: "never" }],
    ["junit", { outputFile: `${out}/mobile-playwright-junit.xml` }],
  ],
  outputDir: `${out}/mobile-artifacts`,
  use: {
    baseURL: process.env.MOBILE_URL ?? "http://localhost:8081",
    viewport: { width: 412, height: 860 },
    deviceScaleFactor: 2,
  },
});
