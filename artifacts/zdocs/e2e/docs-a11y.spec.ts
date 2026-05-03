import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL || "http://localhost:5173";

test.describe("Docs viewer accessibility & interactions (Task #24)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/docs`, { waitUntil: "networkidle" });
  });

  test("page exposes the required landmarks", async ({ page }) => {
    await expect(page.locator("header").first()).toBeVisible();
    await expect(page.locator('main#content-area')).toBeVisible();
    await expect(page.locator('nav[aria-label="Docs"]').first()).toBeVisible();
    const toc = page.locator('aside[aria-label="On this page"]');
    if ((await toc.count()) > 0) {
      await expect(toc).toBeVisible();
    }
  });

  test("skip link is the first focusable element and lands focus in main", async ({ page }) => {
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: /skip to content/i });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    expect(focusedId).toBe("content-area");
  });

  test("header tabs support arrow / Home / End keyboard navigation", async ({ page }) => {
    const tabs = page.locator('[role="tablist"] [role="tab"]');
    const count = await tabs.count();
    test.skip(count < 2, "Project does not expose 2+ header tabs");
    await tabs.nth(0).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.nth(0)).toBeFocused();
    await page.keyboard.press("End");
    await expect(tabs.nth(count - 1)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(tabs.nth(0)).toBeFocused();
  });

  test("theme toggle announces the new theme via aria-live", async ({ page }) => {
    const toggle = page.locator('button[aria-label^="Switch to"]');
    test.skip((await toggle.count()) === 0, "Theme toggle hidden by strict appearance");
    const status = page.locator('[role="status"][aria-live="polite"]');
    await toggle.first().click();
    await expect(status).toContainText(/Switched to (light|dark) theme/);
  });

  test("search dialog opens with Cmd/Ctrl+K, traps focus, and closes on Escape", async ({ page }, testInfo) => {
    const mod = testInfo.project.use.userAgent?.includes("Mac") ? "Meta" : "Control";
    await page.keyboard.press(`${mod}+KeyK`);
    const dialog = page.locator('[role="dialog"][aria-modal="true"]').filter({ has: page.getByPlaceholder(/search/i) });
    await expect(dialog).toBeVisible();
    await expect(page.getByPlaceholder(/search/i)).toBeFocused();
    for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-modal="true"]');
      return d?.contains(document.activeElement) ?? false;
    });
    expect(inside).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("sidebar group toggles expose aria-expanded that flips on click", async ({ page }) => {
    const toggle = page.locator('nav[aria-label="Docs"] button[aria-expanded]').first();
    test.skip((await toggle.count()) === 0, "No collapsible sidebar groups");
    const before = await toggle.getAttribute("aria-expanded");
    await toggle.click();
    const after = await toggle.getAttribute("aria-expanded");
    expect(after).not.toBe(before);
  });

  test("mobile drawer is a modal dialog with focus trap", async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 720 });
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('button[aria-label="Open navigation"]').click();
    const drawer = page.locator('[role="dialog"][aria-modal="true"]').last();
    await expect(drawer).toBeVisible();
    const inside = await page.evaluate(() => {
      const d = document.querySelector('[role="dialog"][aria-modal="true"]');
      return d?.contains(document.activeElement) ?? false;
    });
    expect(inside).toBe(true);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  });

  test("no console errors on initial /docs render", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(`${BASE}/docs`, { waitUntil: "networkidle" });
    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
