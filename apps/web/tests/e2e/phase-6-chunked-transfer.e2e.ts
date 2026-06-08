import { expect, test } from "@playwright/test";

test("transfers small and medium files as WebRTC chunks and rebuilds download blobs", async ({
  browser
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Chunked file transfer is verified on desktop.");

  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();
  const roomId = `phase6-${Date.now()}`;
  const mediumContent = "chunked-transfer-line\n".repeat(8_000);

  await firstPage.goto(`/?room=${roomId}`);
  await secondPage.goto(`/?room=${roomId}`);

  await expect(firstPage.getByText("1 device connected")).toBeVisible({ timeout: 15_000 });
  await expect(secondPage.getByText("1 device connected")).toBeVisible({ timeout: 15_000 });

  await firstPage.getByLabel("Choose files").setInputFiles([
    {
      name: "small.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("hello phase 6")
    },
    {
      name: "medium.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(mediumContent)
    }
  ]);

  await expect(firstPage.getByText("2 files selected")).toBeVisible();
  await firstPage.getByRole("button", { name: /, Ready/ }).first().click();

  await expect(secondPage.getByText("small.txt")).toBeVisible({ timeout: 20_000 });
  await secondPage.getByRole("button", { name: "Accept" }).click();

  await expect(firstPage.getByText("Sent files")).toBeVisible({ timeout: 30_000 });
  const receivedFilesRegion = secondPage.getByRole("region", { name: "Received files" });
  await expect(receivedFilesRegion).toBeVisible({ timeout: 30_000 });
  await expect(receivedFilesRegion.getByRole("link", { name: /small.txt/ })).toBeVisible();
  await expect(receivedFilesRegion.getByRole("link", { name: /medium.txt/ })).toBeVisible();

  const received = await secondPage.evaluate(async () => {
    const links = [...document.querySelectorAll<HTMLAnchorElement>("[aria-label='Received files'] a")];

    return Promise.all(
      links.map(async (link) => ({
        download: link.download,
        text: await fetch(link.href).then((response) => response.text())
      }))
    );
  });

  expect(received).toEqual(
    expect.arrayContaining([
      { download: "small.txt", text: "hello phase 6" },
      { download: "medium.txt", text: mediumContent }
    ])
  );

  await firstContext.close();
  await secondContext.close();
});
