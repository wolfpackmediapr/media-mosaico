import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const RESTRICTED_STORAGE_STATE = path.join(
  process.cwd(),
  "e2e/.auth/restricted-user.json"
);

/**
 * Optional restricted-user profile (data_entry with a partial
 * user_section_permissions set). Credentials come ONLY from the environment:
 *   E2E_RESTRICTED_EMAIL / E2E_RESTRICTED_PASSWORD
 * No hardcoded credentials, no auth bypass, no permission seeding from tests.
 * Fails fast so dependent tests report BLOCKED instead of silently passing.
 */
setup("authenticate restricted user via /auth", async ({ page }) => {
  const email = process.env.E2E_RESTRICTED_EMAIL;
  const password = process.env.E2E_RESTRICTED_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "BLOCKED - restricted-user test credentials unavailable (set E2E_RESTRICTED_EMAIL and E2E_RESTRICTED_PASSWORD)"
    );
  }

  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/correo/i).fill(email);
  await page.getByLabel(/contrase/i).fill(password);
  await page.getByRole("button", { name: /iniciar sesi/i }).click();
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 20000 });

  fs.mkdirSync(path.dirname(RESTRICTED_STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: RESTRICTED_STORAGE_STATE });
});
