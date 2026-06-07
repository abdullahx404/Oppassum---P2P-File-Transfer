import { describe, expect, it } from "vitest";

import { CLIENT_EVENTS, roomJoinSchema } from "./index.js";

describe("shared foundation", () => {
  it("defines stable room join event names", () => {
    expect(CLIENT_EVENTS.ROOM_JOIN).toBe("room:join");
  });

  it("validates an anonymous room join payload", () => {
    const payload = {
      roomId: "study-room",
      peer: {
        peerId: "peer-123456",
        displayName: "Laptop",
        deviceType: "laptop"
      }
    };

    expect(roomJoinSchema.safeParse(payload).success).toBe(true);
  });
});
