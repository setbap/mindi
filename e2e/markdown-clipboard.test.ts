import { expect, test } from "@playwright/test";

test("Focused Nodes render safe Markdown and Editing paste stays plain text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const canvas = page.getByTestId("map-canvas");
  await canvas.focus();
  await page.keyboard.type(
    "**Hello** <script>x</script> [link](https://example.com)",
  );
  await page.keyboard.press("Enter");

  const node = canvas.locator("[data-testid^='node-']").first();
  await expect(node.getByTestId("safe-markdown")).toBeVisible();
  await expect(node.locator("strong")).toHaveText("Hello");
  await expect(node.locator("script")).toHaveCount(0);
  await expect(node.getByRole("link", { name: "link" })).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );

  // Enter Editing via the Focused text (force: React Flow layout can churn).
  await node.locator("strong").click({ force: true });
  const editor = page.getByLabel("Node markdown");
  await expect(editor).toBeVisible();

  await editor.evaluate((el) => {
    const textarea = el as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    const transfer = new DataTransfer();
    transfer.setData("text/plain", "\r\npasted");
    transfer.setData("text/html", "<em>rich</em>");
    textarea.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: transfer,
      }),
    );
  });

  await expect(editor).toHaveValue(
    "**Hello** <script>x</script> [link](https://example.com)\npasted",
  );
  await expect(editor).not.toHaveValue(/<em>|rich/);
});
