import { expect, test } from "@playwright/test";

test("shows rejection clearly and lets the sender retry the same selection", async ({
  browser
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Robust transfer flows are verified on desktop.");

  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const roomId = `phase7-reject-${Date.now()}`;

  await firstPage.goto(`/?room=${roomId}`);
  await secondPage.goto(`/?room=${roomId}`);

  await expect(firstPage.getByText("1 device connected")).toBeVisible({ timeout: 15_000 });
  await expect(secondPage.getByText("1 device connected")).toBeVisible({ timeout: 15_000 });

  await firstPage.getByLabel("Choose files").setInputFiles({
    name: "retry-me.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("retry after rejection")
  });
  await firstPage.getByRole("button", { name: /, Ready/ }).first().click();

  await expect(secondPage.getByText("retry-me.txt")).toBeVisible({ timeout: 20_000 });
  await secondPage.getByRole("button", { name: "Reject" }).click();

  await expect(firstPage.getByText("Transfer rejected")).toBeVisible({ timeout: 20_000 });
  await firstPage.getByRole("button", { name: "Retry" }).click();

  await expect(secondPage.getByText("retry-me.txt")).toBeVisible({ timeout: 20_000 });
  await secondPage.getByRole("button", { name: "Accept" }).click();
  await expect(firstPage.getByText("Sent Files")).toBeVisible({ timeout: 30_000 });

  await firstContext.close();
  await secondContext.close();
});

test("reports a peer disconnect during a pending transfer without a stuck state", async ({
  browser
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Disconnect recovery is verified on desktop.");

  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const roomId = `phase7-disconnect-${Date.now()}`;

  await firstPage.goto(`/?room=${roomId}`);
  await secondPage.goto(`/?room=${roomId}`);

  await expect(firstPage.getByText("1 device connected")).toBeVisible({ timeout: 15_000 });
  await expect(secondPage.getByText("1 device connected")).toBeVisible({ timeout: 15_000 });

  await firstPage.getByLabel("Choose files").setInputFiles({
    name: "disconnect.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("receiver leaves")
  });
  await firstPage.getByRole("button", { name: /, Ready/ }).first().click();

  await expect(secondPage.getByText("disconnect.txt")).toBeVisible({ timeout: 20_000 });
  await secondContext.close();

  await expect(firstPage.getByLabel("Peer Disconnected")).toBeVisible({ timeout: 20_000 });
  await expect(firstPage.getByRole("button", { name: "Retry" })).toBeVisible();

  await firstContext.close();
});
