import { expect, test } from "@playwright/test";

test("Focused typing commits and survives reload", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  await page.getByText("Start typing…").click();
  const editor = page.getByLabel("Node markdown");
  await expect(editor).toBeVisible();
  await editor.fill("Hello");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Hello")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Hello")).toBeVisible();
});

test("Enter creates sibling and Escape cancels Editing draft", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  const canvas = page.getByTestId("map-canvas");
  await canvas.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Node markdown")).toBeVisible();
  await page.keyboard.type("Sibling");
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Node markdown")).toHaveCount(0);
  await expect(page.locator("[data-testid^='node-']")).toHaveCount(2);
  await expect(page.getByText("Start typing…").first()).toBeVisible();
});
