import { expect, test, type Page } from "@playwright/test";

const projectId = process.env.E2E_PROJECT_ID || "4cedbf77-7fa9-402c-b91c-14d9d2d83a54";

const runtimeProblems = [
  /Function components cannot be given refs/i,
  /Component is not a function/i,
  /React Refresh/i,
  /Cannot update a component while rendering/i,
  /Uncaught/i,
  /TypeError/i,
  /ReferenceError/i,
];

async function collectConsoleProblems(page: Page) {
  const problems: string[] = [];

  page.on("console", (message) => {
    if (!["error", "warning"].includes(message.type())) return;
    const text = message.text();
    if (runtimeProblems.some((pattern) => pattern.test(text))) problems.push(text);
  });

  page.on("pageerror", (error) => problems.push(error.message));
  return problems;
}

async function expectCleanRoute(page: Page, path: string, headingOrText: string | RegExp) {
  await page.goto(path);
  await expect(page.getByText(headingOrText).first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Something went wrong");
  await expect(page.locator("body")).not.toContainText("Component is not a function");
}

test.describe("0docs application E2E smoke flows", () => {
  test("public docs routes render searchable documentation without runtime errors", async ({ page }) => {
    const problems = await collectConsoleProblems(page);

    await page.goto("/");
    await expect(page.locator("body")).not.toBeEmpty();
    await expect(page.getByRole("heading").first()).toBeVisible();

    await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
    await expect(page.locator("body")).not.toContainText("Component is not a function");

    expect(problems).toEqual([]);
  });

  test("auth screen supports sign-in and sign-up mode switching", async ({ page }) => {
    const problems = await collectConsoleProblems(page);

    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();

    await page.getByRole("button", { name: /sign up/i }).click();
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toBeVisible();

    expect(problems).toEqual([]);
  });

  test("builder workspace routes render home, editor, settings, analytics, configurations and code", async ({ page }) => {
    const problems = await collectConsoleProblems(page);

    await expectCleanRoute(page, `/builder/${projectId}`, /Home|Project/);
    await expect(page.getByRole("button", { name: /editor/i })).toBeVisible();

    await expectCleanRoute(page, `/builder/${projectId}/editor`, /Editor|Add Block|Navigation/);
    await expect(page.getByRole("button", { name: /home/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /settings/i })).toBeVisible();

    const addBlock = page.getByRole("button", { name: /add block/i }).first();
    if (await addBlock.isVisible()) {
      await addBlock.click();
      await expect(page.locator("body")).toContainText(/Heading|Paragraph|Code|Callout|OpenAPI/i);
      await page.keyboard.press("Escape");
    }

    await expectCleanRoute(page, `/builder/${projectId}/settings`, /Project Settings/);
    await expect(page.getByLabel(/project name/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /test connection/i })).toBeVisible();

    await expectCleanRoute(page, `/builder/${projectId}/analytics`, /Analytics/);
    await expectCleanRoute(page, `/builder/${projectId}/configurations`, /Configurations|Navigation|Files/);
    await expectCleanRoute(page, `/builder/${projectId}/code`, /Code|Export|Files/);

    expect(problems).toEqual([]);
  });

  test("dashboard or auth gate renders a stable first screen", async ({ page }) => {
    const problems = await collectConsoleProblems(page);

    await page.goto("/dashboard");
    await expect(page.locator("body")).not.toBeEmpty();
    await expect(page.locator("body")).toContainText(/Projects|Welcome back|Sign in|Loading/i);
    await expect(page.locator("body")).not.toContainText("Component is not a function");

    expect(problems).toEqual([]);
  });
});
