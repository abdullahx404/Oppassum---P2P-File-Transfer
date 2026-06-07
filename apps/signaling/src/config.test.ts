import { describe, expect, it } from "vitest";

import { getConfig } from "./config.js";

describe("signaling config security", () => {
  it("allows local development origins when CLIENT_ORIGIN is not set", () => {
    const config = getConfig({});

    expect(config.clientOrigins).toContain("http://localhost:3000");
    expect(config.isProduction).toBe(false);
  });

  it("requires strict HTTPS production origins", () => {
    expect(() => getConfig({ NODE_ENV: "production" })).toThrow(
      "Production CLIENT_ORIGIN values must use HTTPS."
    );
    expect(() => getConfig({ NODE_ENV: "production", CLIENT_ORIGIN: "*" })).toThrow(
      "CLIENT_ORIGIN must be a strict production origin allowlist."
    );
    expect(
      getConfig({
        NODE_ENV: "production",
        CLIENT_ORIGIN: "https://oppassum.example.com,https://www.oppassum.example.com"
      }).clientOrigins
    ).toEqual(["https://oppassum.example.com", "https://www.oppassum.example.com"]);
  });
});
