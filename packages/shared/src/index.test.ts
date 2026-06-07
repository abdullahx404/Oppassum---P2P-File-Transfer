import { describe, expect, it } from "vitest";

import {
  CLIENT_EVENTS,
  MAX_SIGNAL_PAYLOAD_BYTES,
  roomJoinSchema,
  roomJoinedSchema,
  signalMessageSchema
} from "./index.js";

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

  it("validates room joined payloads with peers", () => {
    const peer = {
      peerId: "peer-123456",
      displayName: "Laptop",
      deviceType: "laptop"
    };

    expect(
      roomJoinedSchema.safeParse({
        roomId: "study-room",
        self: peer,
        peers: [peer]
      }).success
    ).toBe(true);
  });

  it("rejects oversized signaling payloads", () => {
    expect(
      signalMessageSchema.safeParse({
        roomId: "study-room",
        fromPeerId: "peer-123456",
        toPeerId: "peer-654321",
        type: "offer",
        payload: { sdp: "x".repeat(MAX_SIGNAL_PAYLOAD_BYTES + 1), type: "offer" }
      }).success
    ).toBe(false);
  });

  it("rejects binary signaling payloads so file bytes stay off the server", () => {
    expect(
      signalMessageSchema.safeParse({
        roomId: "study-room",
        fromPeerId: "peer-123456",
        toPeerId: "peer-654321",
        type: "offer",
        payload: { chunk: new Uint8Array([1, 2, 3]) }
      }).success
    ).toBe(false);
  });
});
