import { describe, expect, it } from "vitest";

import { getAppTagline } from "./app-copy";

describe("app copy", () => {
  it("describes direct WebRTC transfer", () => {
    expect(getAppTagline()).toContain("WebRTC");
  });
});
