import { createLovableConfig } from "lovable-agent-playwright-config/config";
import { devices } from "@playwright/test";

const STORAGE_STATE = "e2e/.auth/user.json";

export default createLovableConfig({
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
