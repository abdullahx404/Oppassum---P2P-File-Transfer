import { describe, expect, it } from "vitest";

import { createStoredZipFile } from "./zip";

describe("stored ZIP packaging", () => {
  it("creates an uncompressed ZIP file preserving folder paths", async () => {
    const file = new File(["hello"], "hello.txt", {
      lastModified: new Date("2026-01-01T00:00:00Z").getTime(),
      type: "text/plain"
    });

    Object.defineProperty(file, "webkitRelativePath", {
      value: "Project/docs/hello.txt"
    });

    const zip = await createStoredZipFile([file], "Project");
    const bytes = new Uint8Array(await zip.arrayBuffer());
    const text = new TextDecoder().decode(bytes);
    const view = new DataView(bytes.buffer);

    expect(zip.name).toBe("Project.zip");
    expect(zip.type).toBe("application/zip");
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(text).toContain("Project/docs/hello.txt");
    expect(text).toContain("hello");
  });
});
