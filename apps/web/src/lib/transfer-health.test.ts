import { describe, expect, it } from "vitest";

import {
  getLargeTransferWarning,
  getProgressDetail,
  getSpeedBytesPerSecond,
  LARGE_TRANSFER_WARNING_BYTES
} from "./transfer-health";

describe("transfer health utilities", () => {
  it("shows speed and remaining bytes for active transfer progress", () => {
    const progress = {
      direction: "sending" as const,
      status: "transferring" as const,
      transferId: "transfer-1",
      fileName: "movie.mp4",
      bytesTransferred: 1024,
      totalBytes: 4096,
      completedFiles: 0,
      totalFiles: 1,
      startedAt: 1_000
    };

    expect(getSpeedBytesPerSecond(progress, 2_000)).toBe(1024);
    expect(getProgressDetail(progress, 2_000)).toBe("1.0 KB of 4.0 KB - 3.0 KB left at 1.0 KB/s");
  });

  it("uses clear wording for failed and completed transfers", () => {
    expect(
      getProgressDetail({
        direction: "receiving",
        status: "failed",
        transferId: "transfer-1",
        fileName: "movie.mp4",
        bytesTransferred: 2048,
        totalBytes: 4096,
        completedFiles: 0,
        totalFiles: 1
      })
    ).toBe("2.0 KB of 4.0 KB before failure");

    expect(
      getProgressDetail({
        direction: "receiving",
        status: "completed",
        transferId: "transfer-1",
        fileName: "movie.mp4",
        bytesTransferred: 4096,
        totalBytes: 4096,
        completedFiles: 1,
        totalFiles: 1
      })
    ).toBe("1 file completed");
  });

  it("warns when a selected transfer is large enough to need extra care", () => {
    expect(getLargeTransferWarning(LARGE_TRANSFER_WARNING_BYTES - 1)).toBeUndefined();
    expect(getLargeTransferWarning(LARGE_TRANSFER_WARNING_BYTES)).toContain("Large transfer selected");
  });
});
