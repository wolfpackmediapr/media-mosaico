import { test, expect } from "@playwright/test";

/**
 * Responsive regression suite for protected routes.
 * Requires the storageState produced by e2e/auth.setup.ts (project dependency).
 */
const ROUTES = [
  { path: "/", name: "Inicio" },
  { path: "/publiteca/prensa", name: "Publiteca Prensa" },
  { path: "/publiteca/radio", name: "Publiteca Radio" },
  { path: "/publiteca/tv", name: "Publiteca TV" },
  { path: "/publiteca/redes-sociales", name: "Publiteca Redes" },
  { path: "/tv", name: "TV" },
  { path: "/radio", name: "Radio" },
  { path: "/prensa", name: "Prensa Digital" },
  { path: "/prensa-escrita", name: "Prensa Escrita" },
  { path: "/redes-sociales", name: "Redes Sociales" },
  { path: "/notificaciones", name: "Notificaciones" },
  { path: "/envio-alertas", name: "Alertas Enviadas" },
  { path: "/reportes", name: "Reportes" },
  { path: "/media-monitoring", name: "Media Monitoring" },
  { path: "/ajustes", name: "Ajustes" },
  { path: "/ajustes/clientes", name: "Ajustes Clientes" },
  { path: "/ajustes/medios", name: "Ajustes Medios" },
  { path: "/ajustes/usuarios", name: "Ajustes Usuarios" },
];

const VIEWPORTS = [
  { label: "320", width: 320, height: 844 },
  { label: "390", width: 390, height: 844 },
  { label: "768", width: 768, height: 1024 },
  { label: "1280", width: 1280, height: 900 },
];

for (const vp of VIEWPORTS) {
  test.describe(`viewport ${vp.label}px`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of ROUTES) {
      test(`${route.name} has no horizontal overflow`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await expect(page).not.toHaveURL(/\/auth/);
        await page.waitForTimeout(1500);

        const { scrollWidth, clientWidth, offenders } = await page.evaluate(() => {
          const doc = document.documentElement;
          const offenders: string[] = [];
          if (doc.scrollWidth > doc.clientWidth + 1) {
            document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
              const r = el.getBoundingClientRect();
              if (r.width > 0 && r.right > doc.clientWidth + 1 && offenders.length < 10) {
                offenders.push(`${el.tagName.toLowerCase()}.${el.className?.toString().slice(0, 80)}`);
              }
            });
          }
          return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders };
        });

        expect(scrollWidth, `overflow offenders: ${offenders.join(" | ")}`).toBeLessThanOrEqual(
          clientWidth + 1
        );
      });
    }
  });
}

test.describe("mobile navigation shell", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hamburger opens the nav drawer and navigates", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const trigger = page.getByRole("button", { name: /abrir menú|menu/i }).first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("link").first()).toBeVisible();
  });

  test("inline sidebar is hidden below md", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("aside, [data-sidebar-desktop]").first()).toBeHidden();
  });
});

test.describe("desktop regression", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("desktop sidebar is visible and drawer trigger hidden", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /inicio/i }).first()).toBeVisible();
  });
});
