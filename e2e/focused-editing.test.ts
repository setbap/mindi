import { expect, test } from "@playwright/test";

test("Focused typing commits and survives reload", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  await page.getByTestId("map-canvas").getByText("Start typing…").click();
  const editor = page.getByLabel("Node markdown");
  await expect(editor).toBeVisible();
  await editor.fill("Hello");
  await page.keyboard.press("Enter");
  await expect(
    page.getByTestId("safe-markdown").getByText("Hello"),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByTestId("safe-markdown").getByText("Hello"),
  ).toBeVisible();
});

test("Enter creates sibling below without Editing; Space then Escape cancels draft", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  const canvas = page.getByTestId("map-canvas");
  await canvas.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Node markdown")).toHaveCount(0);
  await expect(canvas.locator("[data-testid^='node-']")).toHaveCount(2);

  await page.keyboard.press("Space");
  await expect(page.getByLabel("Node markdown")).toBeVisible();
  await page.keyboard.type("Sibling");
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Node markdown")).toHaveCount(0);
  await expect(canvas.getByText("Start typing…").first()).toBeVisible();
});

test("Tab chains children while staying Focused", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  const canvas = page.getByTestId("map-canvas");
  await canvas.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Node markdown")).toHaveCount(0);
  await expect(page.getByText(/Map now has 4 nodes/i)).toBeVisible();
  await expect
    .poll(async () => canvas.locator(".react-flow__node").count())
    .toBeGreaterThanOrEqual(2);
});
