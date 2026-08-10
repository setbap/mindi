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

test("on load the focused root Node is centered in the canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const canvas = page.getByTestId("map-canvas");
  await expect(canvas.locator(".react-flow__node").first()).toBeVisible();

  await expect
    .poll(
      async () => {
        return canvas.evaluate((el) => {
          const canvasBox = el.getBoundingClientRect();
          const active = el.getAttribute("aria-activedescendant") ?? "";
          const focusedId = active.replace(/^canvas-active-/, "");
          const node =
            (focusedId
              ? el.querySelector(`[data-testid="node-${focusedId}"]`)
              : null)?.closest(".react-flow__node") ??
            el.querySelector(".react-flow__node");
          if (!node || canvasBox.width < 400 || canvasBox.height < 400) {
            return Number.POSITIVE_INFINITY;
          }
          const nodeBox = node.getBoundingClientRect();
          const dx = Math.abs(
            nodeBox.left +
              nodeBox.width / 2 -
              (canvasBox.left + canvasBox.width / 2),
          );
          const dy = Math.abs(
            nodeBox.top +
              nodeBox.height / 2 -
              (canvasBox.top + canvasBox.height / 2),
          );
          return Math.max(dx / canvasBox.width, dy / canvasBox.height);
        });
      },
      { timeout: 10_000 },
    )
    .toBeLessThan(0.2);
});

test("Tab create and arrow focus center the Focused Node", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const canvas = page.getByTestId("map-canvas");
  await canvas.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Map now has 3 nodes/i)).toBeVisible();

  async function focusedOffset() {
    return canvas.evaluate((el) => {
      const canvasBox = el.getBoundingClientRect();
      const active = el.getAttribute("aria-activedescendant") ?? "";
      const focusedId = active.replace(/^canvas-active-/, "");
      const node = focusedId
        ? el
            .querySelector(`[data-testid="node-${focusedId}"]`)
            ?.closest(".react-flow__node")
        : null;
      if (!node || canvasBox.width < 400) {
        return Number.POSITIVE_INFINITY;
      }
      const nodeBox = node.getBoundingClientRect();
      const dx = Math.abs(
        nodeBox.left + nodeBox.width / 2 - (canvasBox.left + canvasBox.width / 2),
      );
      const dy = Math.abs(
        nodeBox.top + nodeBox.height / 2 - (canvasBox.top + canvasBox.height / 2),
      );
      return Math.max(dx / canvasBox.width, dy / canvasBox.height);
    });
  }

  await expect.poll(focusedOffset, { timeout: 10_000 }).toBeLessThan(0.25);

  await page.keyboard.press("ArrowUp");
  await expect.poll(focusedOffset, { timeout: 10_000 }).toBeLessThan(0.25);

  await page.keyboard.press("Tab");
  await expect(page.getByText(/Map now has 4 nodes/i)).toBeVisible();
  await expect.poll(focusedOffset, { timeout: 10_000 }).toBeLessThan(0.25);
});

test("Enter creates sibling below without Editing; Space then Escape commits draft", async ({
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
  await expect(
    page.getByTestId("safe-markdown").getByText("Sibling"),
  ).toBeVisible();
});

test("canvas sibling order matches Node browser top-to-bottom", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  const canvas = page.getByTestId("map-canvas");
  await canvas.focus();
  await page.keyboard.type("1");
  await page.keyboard.press("Enter"); // commit
  await expect(page.getByLabel("Node markdown")).toHaveCount(0);
  await page.keyboard.press("Enter"); // sibling below
  await expect(page.getByText(/Map now has 2 nodes/i)).toBeVisible();
  await page.keyboard.type("2");
  await page.keyboard.press("Enter"); // commit
  await expect(page.getByLabel("Node markdown")).toHaveCount(0);
  await page.keyboard.press("Enter"); // sibling below
  await expect(page.getByText(/Map now has 3 nodes/i)).toBeVisible();
  await page.keyboard.type("3");
  await page.keyboard.press("Enter"); // commit
  await expect(page.getByLabel("Node markdown")).toHaveCount(0);

  const browser = page.getByTestId("map-node-browser");
  await expect(browser.getByRole("treeitem").nth(0)).toContainText("1");
  await expect(browser.getByRole("treeitem").nth(1)).toContainText("2");
  await expect(browser.getByRole("treeitem").nth(2)).toContainText("3");

  await expect
    .poll(async () => canvas.locator(".react-flow__node").count())
    .toBe(3);

  const boxes = await canvas.locator(".react-flow__node").evaluateAll((els) =>
    els.map((el) => {
      const box = el.getBoundingClientRect();
      return { text: el.textContent ?? "", y: box.y };
    }),
  );
  const one = boxes.find((b) => b.text.includes("1"));
  const two = boxes.find((b) => b.text.includes("2"));
  const three = boxes.find((b) => b.text.includes("3"));
  expect(one && two && three).toBeTruthy();
  expect(one!.y).toBeLessThan(two!.y);
  expect(two!.y).toBeLessThan(three!.y);
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

test("Tab from Node browser still creates a child on the Focused Node", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  const browser = page.getByTestId("map-node-browser");
  await browser.getByRole("treeitem").first().click();
  await page.keyboard.press("Tab");
  await expect(page.getByText(/Map now has 2 nodes/i)).toBeVisible();
});

test("map title click renames with Enter and keeps Tab creating children", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  await page.getByTestId("map-title").click();
  const input = page.getByTestId("map-title-input");
  await expect(input).toBeFocused();
  await input.fill("Renamed Map");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("map-title")).toHaveText("Renamed Map");

  await page.keyboard.press("Tab");
  await expect(page.getByText(/Map now has 2 nodes/i)).toBeVisible();
});
