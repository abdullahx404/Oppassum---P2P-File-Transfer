import { describe, expect, it } from "vitest";

import { SocketRateLimiter } from "./rate-limiter.js";

describe("SocketRateLimiter", () => {
  it("limits event volume per socket window", () => {
    const limiter = new SocketRateLimiter({ windowMs: 1000, maxEvents: 2, maxInvalidEvents: 2 });

    expect(limiter.consume("socket-a", 0)).toBe(true);
    expect(limiter.consume("socket-a", 10)).toBe(true);
    expect(limiter.consume("socket-a", 20)).toBe(false);
    expect(limiter.consume("socket-a", 1100)).toBe(true);
  });

  it("tracks invalid event volume separately", () => {
    const limiter = new SocketRateLimiter({ windowMs: 1000, maxEvents: 10, maxInvalidEvents: 1 });

    expect(limiter.recordInvalid("socket-a", 0)).toBe(true);
    expect(limiter.recordInvalid("socket-a", 10)).toBe(false);
  });
});
