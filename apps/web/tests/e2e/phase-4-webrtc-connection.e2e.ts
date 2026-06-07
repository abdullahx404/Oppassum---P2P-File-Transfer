import { expect, test } from "@playwright/test";

test("opens a WebRTC data channel between two discovered peers", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "WebRTC peer cards are verified on desktop.");

  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const roomId = `phase4-${Date.now()}`;

  await firstPage.goto(`/?room=${roomId}`);
  await secondPage.goto(`/?room=${roomId}`);

  await expect(firstPage.getByText("1 device connected")).toBeVisible({ timeout: 15_000 });
  await expect(secondPage.getByText("1 device connected")).toBeVisible({ timeout: 15_000 });

  await firstPage.getByRole("button", { name: /Computer, Ready|Device, Ready|Phone, Ready|Tablet, Ready/ }).click();

  await expect(firstPage.getByTestId("webrtc-connection-status")).toHaveText("Data channel open", {
    timeout: 20_000
  });
  await expect(secondPage.getByTestId("webrtc-connection-status")).toHaveText("Data channel open", {
    timeout: 20_000
  });

  await firstContext.close();
  await secondContext.close();
});
