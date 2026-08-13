import { defineConfig, devices } from "@playwright/test";

const STORAGE_STATE = "e2e/.auth/user.json";
const baseURL = process.env.E2E_BASE_URL || "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [["line"]],
  use: { baseURL, trace: "retain-on-failure" },
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
      testMatch: /responsive\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
    },
  ],
});
