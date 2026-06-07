import { describe, expect, it, vi } from "vitest";

import { attachDataChannelHandlers } from "./webrtc";

describe("webrtc helpers", () => {
  it("marks the data channel as binary and reports open", () => {
    const send = vi.fn();
    const onOpen = vi.fn();
    const channel = {
      binaryType: "blob",
      send,
      onopen: null
    } as unknown as RTCDataChannel;

    const attached = attachDataChannelHandlers(channel, onOpen);
    attached.onopen?.(new Event("open"));

    expect(attached.binaryType).toBe("arraybuffer");
    expect(send).toHaveBeenCalledWith("oppassum:probe");
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
