import { describe, expect, it } from "vitest";

import {
  createTransferManifest,
  formatBytes,
  getTransferDisplayName,
  getTransferItemLabel,
  getTransferSelectionLabel
} from "./files";

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
    expect(manifest.folderRoots).toEqual([]);
    expect(getTransferSelectionLabel(manifest)).toBe("2 Files Selected");
  });

  it("preserves selected folder roots and relative paths", () => {
    const photo = new File(["photo"], "photo.jpg", { type: "image/jpeg", lastModified: 10 });
    const note = new File(["note"], "note.txt", { type: "text/plain", lastModified: 20 });

    Object.defineProperty(photo, "webkitRelativePath", {
      value: "Trip/photos/photo.jpg"
    });
    Object.defineProperty(note, "webkitRelativePath", {
      value: "Trip/notes/note.txt"
    });

    const manifest = createTransferManifest([photo, note]);

    expect(manifest.folderRoots).toEqual(["Trip"]);
    expect(manifest.files.map((file) => file.relativePath)).toEqual([
      "Trip/photos/photo.jpg",
      "Trip/notes/note.txt"
    ]);
    expect(getTransferSelectionLabel(manifest)).toBe("1 Folder Selected");
    expect(getTransferItemLabel(manifest)).toBe("1 Folder");
    expect(getTransferDisplayName(manifest)).toBe("Trip");
  });

  it("formats byte counts for transfer prompts", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(12 * 1024 * 1024)).toBe("12 MB");
  });
});
