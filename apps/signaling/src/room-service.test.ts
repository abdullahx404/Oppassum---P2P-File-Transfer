import { describe, expect, it } from "vitest";

import { RoomService } from "./room-service.js";
import { createPeer } from "./socket-server.js";

describe("RoomService", () => {
  it("joins peers and lists room peers", () => {
    const rooms = new RoomService();

    rooms.joinRoom("study", "socket-a", createPeer({ peerId: "peer-a000" }));
    rooms.joinRoom("study", "socket-b", createPeer({ peerId: "peer-b000" }));

    expect(rooms.getRoomCount()).toBe(1);
    expect(rooms.getPeerCount("study")).toBe(2);
    expect(rooms.listPeers("study").map((peer) => peer.peerId)).toEqual(["peer-a000", "peer-b000"]);
  });

  it("cleans up empty rooms when peers leave", () => {
    const rooms = new RoomService();

    rooms.joinRoom("study", "socket-a", createPeer({ peerId: "peer-a000" }));
    expect(rooms.leaveBySocket("socket-a")).toEqual({ roomId: "study", peerId: "peer-a000" });

    expect(rooms.getRoomCount()).toBe(0);
    expect(rooms.getPeerCount("study")).toBe(0);
  });

  it("moves a socket to one active room at a time", () => {
    const rooms = new RoomService();

    rooms.joinRoom("first", "socket-a", createPeer({ peerId: "peer-a000" }));
    rooms.joinRoom("second", "socket-a", createPeer({ peerId: "peer-a000" }));

    expect(rooms.getPeerCount("first")).toBe(0);
    expect(rooms.getPeerCount("second")).toBe(1);
    expect(rooms.getSocketRoom("socket-a")).toBe("second");
  });

  it("keeps the latest socket when a browser reuses the same peer id", () => {
    const rooms = new RoomService();

    rooms.joinRoom("study", "socket-old", createPeer({ peerId: "peer-a000" }));
    rooms.joinRoom("study", "socket-new", createPeer({ peerId: "peer-a000" }));

    expect(rooms.getPeerCount("study")).toBe(1);
    expect(rooms.getPeerSocketId("study", "peer-a000")).toBe("socket-new");
    expect(rooms.leaveBySocket("socket-old")).toBeUndefined();
    expect(rooms.getPeerCount("study")).toBe(1);
    expect(rooms.leaveBySocket("socket-new")).toEqual({ roomId: "study", peerId: "peer-a000" });
    expect(rooms.getRoomCount()).toBe(0);
  });
});
