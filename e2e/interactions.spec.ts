import { test, expect, Page } from "@playwright/test";

/**
 * Mobile interaction suite for protected routes.
 * Runs under the `authenticated` project (storageState from e2e/auth.setup.ts).
 */
test.use({ viewport: { width: 390, height: 844 } });

async function noHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

test.describe("mobile drawer", () => {
  test("opens, navigates and closes", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const trigger = page.getByRole("button", { name: /abrir men/i });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await noHorizontalOverflow(page);

    const target = drawer.getByRole("link", { name: /redes sociales/i }).first();
    await expect(target).toBeVisible();
    const box = await target.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await target.click();
    await expect(page).toHaveURL(/redes-sociales/);
    await expect(drawer).toBeHidden();
  });

  test("closes without navigating on Escape", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /abrir men/i }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(page).toHaveURL(/localhost:8080\/$|\/$/);
  });
});

test.describe("tab strips", () => {
  test("Publiteca tab strip scrolls and the last tab is reachable", async ({ page }) => {
    await page.goto("/publiteca/redes-sociales", { waitUntil: "domcontentloaded" });
    const list = page.getByRole("tablist").first();
    await expect(list).toBeVisible();

    const metrics = await list.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(metrics.clientWidth).toBeLessThanOrEqual(390);

    const tabs = list.getByRole("tab");
    const last = tabs.last();
    await last.scrollIntoViewIfNeeded();
    await last.click();
    await expect(last).toHaveAttribute("data-state", "active");
    await noHorizontalOverflow(page);
  });

  test("media section tabs stay inside the viewport", async ({ page }) => {
    for (const path of ["/publiteca/tv", "/publiteca/radio", "/publiteca/prensa"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const list = page.getByRole("tablist").first();
      await expect(list).toBeVisible();
      const width = await list.evaluate((el) => el.getBoundingClientRect().width);
      expect(width).toBeLessThanOrEqual(390);
      await noHorizontalOverflow(page);
    }
  });
});

test.describe("filter controls", () => {
  test("a filter select opens and its panel fits the viewport", async ({ page }) => {
    await page.goto("/redes-sociales", { waitUntil: "domcontentloaded" });
    const combo = page.getByRole("combobox").first();
    await expect(combo).toBeVisible();
    const triggerBox = await combo.boundingBox();
    expect(triggerBox!.width).toBeLessThanOrEqual(390);

    await combo.click();
    const listbox = page.getByRole("listbox").first();
    await expect(listbox).toBeVisible();
    const box = await listbox.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(391);
    await page.keyboard.press("Escape");
  });

  test("settings mobile nav reflects the current section", async ({ page }) => {
    await page.goto("/ajustes/clientes", { waitUntil: "domcontentloaded" });
    const nav = page.getByLabel(/navegaci.n de ajustes/i);
    await expect(nav).toBeVisible();
    await expect(nav).not.toHaveText(/selecciona una secci/i);
  });
});

test.describe("dialogs", () => {
  test("open, fit the viewport, scroll vertically and close", async ({ page }) => {
    await page.goto("/ajustes/clientes/gestion", { waitUntil: "domcontentloaded" });

    const opener = page
      .getByRole("button", { name: /nuevo cliente|agregar cliente|a.adir/i })
      .first();
    await expect(opener).toBeVisible();
    await opener.click();

    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible();

    const box = await dialog.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(390);
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.height).toBeLessThanOrEqual(844);
    await noHorizontalOverflow(page);

    const scrollable = await dialog.evaluate((el) => {
      const targets = [el, ...Array.from(el.querySelectorAll("*"))] as HTMLElement[];
      return targets.some((t) => t.scrollHeight > t.clientHeight + 1);
    });
    expect(scrollable).toBeTruthy();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("media controls", () => {
  test("radio player controls are visible and tappable", async ({ page }) => {
    await page.goto("/radio", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const controls = page.getByRole("button", { name: /reproducir|pausar|play|pause/i }).first();
    if (await controls.count()) {
      await expect(controls).toBeVisible();
      const box = await controls.boundingBox();
      expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(32);
    }
    await noHorizontalOverflow(page);
  });

  test("tv controls wrap inside the viewport", async ({ page }) => {
    await page.goto("/tv", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await noHorizontalOverflow(page);
  });
});
