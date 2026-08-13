import { defineConfig, devices } from "@playwright/test";

const STORAGE_STATE = "e2e/.auth/user.json";
const RESTRICTED_STORAGE_STATE = "e2e/.auth/restricted-user.json";
const baseURL = process.env.E2E_BASE_URL || "http://localhost:8080";
// Optional escape hatch for sandboxes where the bundled browser build differs.
const executablePath = process.env.E2E_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [["line"]],
  use: { baseURL, trace: "retain-on-failure", launchOptions: { executablePath } },
  projects: [
    {
      name: "public",
      testMatch: /public-responsive\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "authenticated",
      testMatch: /(responsive|interactions)\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
    },
    {
      // Optional: restricted data_entry account for permission parity checks.
      name: "restricted-setup",
      testMatch: /auth\.restricted\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "restricted",
      testMatch: /permissions\.spec\.ts/,
      dependencies: ["restricted-setup"],
      use: { ...devices["Desktop Chrome"], storageState: RESTRICTED_STORAGE_STATE },
    },
  ],
});
