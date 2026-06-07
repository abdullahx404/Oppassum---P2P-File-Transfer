import { describe, expect, it, vi } from "vitest";

import {
  createReceivedFileUrl,
  getTransferPercent,
  readFileChunks,
  waitForDataChannelBackpressure
} from "./chunked-transfer";

describe("chunked transfer utilities", () => {
  it("reads files in fixed-size chunks without changing bytes", async () => {
    const file = new File(["abcdefghij"], "letters.txt", { type: "text/plain" });
    const chunks: ArrayBuffer[] = [];

    for await (const chunk of readFileChunks(file, 4)) {
      chunks.push(chunk);
    }

    expect(chunks.map((chunk) => chunk.byteLength)).toEqual([4, 4, 2]);
    const merged = await new Blob(chunks).text();
    expect(merged).toBe("abcdefghij");
  });

  it("reassembles received chunks into a downloadable object URL", () => {
    const originalCreateObjectUrl = URL.createObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:oppassum-test");
    const file = {
      id: "file-1",
      name: "photo.png",
      size: 6,
      type: "image/png",
      lastModified: 1
    };

    const received = createReceivedFileUrl(file, [
      new TextEncoder().encode("abc").buffer,
      new TextEncoder().encode("def").buffer
    ]);

    expect(received).toMatchObject({
      id: "file-1",
      name: "photo.png",
      size: 6,
      type: "image/png",
      url: "blob:oppassum-test"
    });
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    URL.createObjectURL = originalCreateObjectUrl;
  });

  it("calculates bounded transfer progress", () => {
    expect(
      getTransferPercent({
        direction: "sending",
        status: "transferring",
        transferId: "transfer-1",
        fileName: "file.txt",
        bytesTransferred: 75,
        totalBytes: 100,
        completedFiles: 0,
        totalFiles: 1
      })
    ).toBe(75);

    expect(
      getTransferPercent({
        direction: "receiving",
        status: "completed",
        transferId: "transfer-1",
        fileName: "file.txt",
        bytesTransferred: 120,
        totalBytes: 100,
        completedFiles: 1,
        totalFiles: 1
      })
    ).toBe(100);
  });

  it("waits while the data channel is over the backpressure threshold", async () => {
    vi.useFakeTimers();
    const channel = { bufferedAmount: Number.MAX_SAFE_INTEGER } as { bufferedAmount: number };
    const waitPromise = waitForDataChannelBackpressure(channel as RTCDataChannel);
    let resolved = false;
    waitPromise.then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(20);
    expect(resolved).toBe(false);

    channel.bufferedAmount = 0;
    await vi.advanceTimersByTimeAsync(20);
    await waitPromise;
    expect(resolved).toBe(true);
    vi.useRealTimers();
  });
});
