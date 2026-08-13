import { test, expect } from "@playwright/test";

/** Public routes - runnable without credentials. */
const PUBLIC_ROUTES = ["/auth", "/registro", "/recuperar-password"];
const VIEWPORTS = [320, 390, 768, 1280];

for (const width of VIEWPORTS) {
  test.describe(`public @ ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });
    for (const route of PUBLIC_ROUTES) {
      test(`${route} has no horizontal overflow`, async ({ page }) => {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(800);
        const [sw, cw] = await page.evaluate(() => [
          document.documentElement.scrollWidth,
          document.documentElement.clientWidth,
        ]);
        expect(sw).toBeLessThanOrEqual(cw + 1);
      });
    }
  });
}
