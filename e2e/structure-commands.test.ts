import { expect, test } from "@playwright/test";

test("structure commands create Root, move, detach, and guard final Delete", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  await expect(page.getByTestId("structure-commands")).toBeVisible();
  await page.getByRole("button", { name: "Create Root" }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(2);

  // Create a child under the new Root via Focused Tab (stays Focused).
  const canvas = page.getByTestId("map-canvas");
  await canvas.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Node markdown")).toHaveCount(0);
  await expect(page.locator(".react-flow__node")).toHaveCount(3);

  await expect(page.getByRole("button", { name: "Detach" })).toBeEnabled();
  await page.getByRole("button", { name: "Detach" }).click();
  await expect(page.locator(".react-flow__node")).toHaveCount(3);

  await canvas.focus();
  await page.keyboard.press("Alt+ArrowDown");

  // Delete key removes a leaf the same as the Delete button
  await canvas.focus();
  await page.keyboard.press("Enter"); // sibling leaf
  await expect(page.locator(".react-flow__node")).toHaveCount(4);
  await page.keyboard.press("Delete");
  await expect(page.locator(".react-flow__node")).toHaveCount(3);

  // Delete down to the final Node
  while (await page.getByRole("button", { name: "Delete" }).isEnabled()) {
    const before = await page.locator(".react-flow__node").count();
    await page.getByRole("button", { name: "Delete" }).click();
    const confirm = page.getByTestId("delete-confirm");
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.getByRole("button", { name: "Delete" }).click();
    }
    await expect
      .poll(async () => page.locator(".react-flow__node").count())
      .toBe(before - 1);
  }

  await expect(page.getByRole("button", { name: "Delete" })).toBeDisabled();
  await expect(
    page.getByText(/The final Node cannot be deleted/i),
  ).toBeVisible();
});
