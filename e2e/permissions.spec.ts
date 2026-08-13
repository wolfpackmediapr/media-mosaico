import { test, expect } from "@playwright/test";

/**
 * Restricted-user permission parity suite.
 * Runs under the `restricted` project and is BLOCKED until
 * E2E_RESTRICTED_EMAIL / E2E_RESTRICTED_PASSWORD are provided.
 *
 * It asserts that the authorized section list is identical between the desktop
 * Sidebar and the mobile drawer, and that Publiteca media tabs honor the same
 * restrictions. It never writes permissions - the account must be provisioned
 * out of band with a partial user_section_permissions set.
 */
async function sectionLabels(scope: import("@playwright/test").Locator) {
  const links = scope.getByRole("link");
  const count = await links.count();
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = (await links.nth(i).innerText()).trim().toLowerCase();
    if (text) labels.push(text);
  }
  return labels.sort();
}

test("desktop sidebar and mobile drawer expose the same authorized sections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const desktop = page.locator("[data-sidebar-desktop]").first();
  await expect(desktop).toBeVisible();
  const desktopSections = await sectionLabels(desktop);
  expect(desktopSections.length).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /abrir men/i }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  const drawerSections = await sectionLabels(drawer);

  expect(drawerSections).toEqual(desktopSections);
});

test("publiteca media tabs follow the same restrictions", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /abrir men/i }).click();
  const drawer = page.getByRole("dialog");
  const authorized = await sectionLabels(drawer);
  await page.keyboard.press("Escape");

  const media = [
    { slug: "prensa", path: "/publiteca/prensa" },
    { slug: "radio", path: "/publiteca/radio" },
    { slug: "tv", path: "/publiteca/tv" },
    { slug: "redes", path: "/publiteca/redes-sociales" },
  ];

  for (const item of media) {
    const allowed = authorized.some((label) => label.includes(item.slug));
    await page.goto(item.path, { waitUntil: "domcontentloaded" });
    if (allowed) {
      await expect(page).toHaveURL(new RegExp(item.path));
    } else {
      await expect(page).not.toHaveURL(new RegExp(`${item.path}$`));
    }
  }
});
