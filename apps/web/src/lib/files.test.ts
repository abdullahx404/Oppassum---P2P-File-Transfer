import { describe, expect, it } from "vitest";

import { createTransferManifest, formatBytes } from "./files";

describe("file manifest helpers", () => {
  it("creates metadata without reading file bytes", () => {
    const files = [
      new File(["hello"], "hello.txt", { type: "text/plain", lastModified: 10 }),
      new File(["world"], "world.txt", { type: "text/plain", lastModified: 20 })
    ];

    const manifest = createTransferManifest(files);

    expect(manifest.files).toHaveLength(2);
    expect(manifest.totalBytes).toBe(10);
    expect(manifest.files[0]).toMatchObject({
      name: "hello.txt",
      size: 5,
      type: "text/plain",
      lastModified: 10
    });
  });

  it("formats byte counts for transfer prompts", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(12 * 1024 * 1024)).toBe("12 MB");
  });
});
