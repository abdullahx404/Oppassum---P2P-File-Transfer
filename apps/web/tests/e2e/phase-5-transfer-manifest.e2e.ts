import { expect, test } from "@playwright/test";

test("sender and receiver agree on a transfer manifest before file bytes are sent", async ({
  browser
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Transfer manifest peer flow is verified on desktop.");

  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const roomId = `phase5-${Date.now()}`;

  await firstPage.goto(`/?room=${roomId}`);
  await secondPage.goto(`/?room=${roomId}`);

  await expect(firstPage.getByText("1 device connected")).toBeVisible({ timeout: 15_000 });
  await expect(secondPage.getByText("1 device connected")).toBeVisible({ timeout: 15_000 });

  await firstPage.getByLabel("Choose files").setInputFiles({
    name: "manifest-only.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("metadata only")
  });

  await expect(firstPage.getByText("1 file selected")).toBeVisible();
  await firstPage.getByRole("button", { name: /, Ready/ }).first().click();

  await expect(secondPage.getByText("manifest-only.txt")).toBeVisible({ timeout: 20_000 });
  await secondPage.getByRole("button", { name: "Accept" }).click();
  await expect(firstPage.getByText("Transfer manifest accepted")).toBeVisible({ timeout: 20_000 });

  await firstContext.close();
  await secondContext.close();
});
