import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const STORAGE_STATE = path.join(process.cwd(), "e2e/.auth/user.json");

/**
 * Real /auth login flow. Credentials come ONLY from the environment:
 *   E2E_EMAIL / E2E_PASSWORD
 * Nothing is hardcoded and no auth bypass is used. If the credentials are not
 * present the setup fails fast so the dependent projects report as blocked
 * rather than silently passing.
 */
setup("authenticate via /auth", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "BLOCKED - authenticated test credentials unavailable (set E2E_EMAIL and E2E_PASSWORD)"
    );
  }

  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.getByLabel(/correo/i).fill(email);
  await page.getByLabel(/contrase/i).fill(password);
  await page.getByRole("button", { name: /iniciar sesi/i }).click();

  await expect(page).not.toHaveURL(/\/auth/, { timeout: 20000 });

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE });
});
