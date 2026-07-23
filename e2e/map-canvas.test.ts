import { expect, test } from "@playwright/test";

test("Map canvas lays out Nodes with Connectors and rejects Node drag", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  const canvas = page.getByTestId("map-canvas");
  await expect(canvas).toBeVisible();

  const flowNode = page.locator(".react-flow__node").first();
  await expect(flowNode).toBeVisible();
  const before = await flowNode.boundingBox();
  expect(before).not.toBeNull();

  await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
  await page.mouse.down();
  await page.mouse.move(before!.x + 120, before!.y + 80);
  await page.mouse.up();

  const after = await flowNode.boundingBox();
  expect(after).not.toBeNull();
  // Layout-owned: dragging must not relocate the Node on the canvas.
  expect(Math.abs(after!.x - before!.x)).toBeLessThan(2);
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);

  await canvas.focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(".react-flow__node")).toHaveCount(2);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
});
