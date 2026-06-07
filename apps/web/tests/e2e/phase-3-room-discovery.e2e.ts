import { expect, test } from "@playwright/test";

test("two browser tabs discover each other through the signaling server", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Room discovery peer cards are verified on desktop.");

  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const roomId = `phase3-${Date.now()}`;

  await firstPage.goto(`/?room=${roomId}`);
  await secondPage.goto(`/?room=${roomId}`);

  await expect(firstPage.getByText("1 device connected")).toBeVisible({ timeout: 15_000 });
  await expect(secondPage.getByText("1 device connected")).toBeVisible({ timeout: 15_000 });
  await expect(firstPage.getByRole("button", { name: /Computer|Device|Phone|Tablet/ })).toBeVisible();
  await expect(secondPage.getByRole("button", { name: /Computer|Device|Phone|Tablet/ })).toBeVisible();

  await firstContext.close();
  await secondContext.close();
});
