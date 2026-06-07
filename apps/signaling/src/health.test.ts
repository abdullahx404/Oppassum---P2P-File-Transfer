import { describe, expect, it } from "vitest";

import { createHealthPayload } from "./health.js";

describe("health payload", () => {
  it("returns the signaling service status", () => {
    expect(createHealthPayload()).toEqual({
      status: "ok",
      service: "oppassum-signaling"
    });
  });
});
