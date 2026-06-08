import { CLIENT_EVENTS, SERVER_EVENTS, type Peer } from "@oppassum/shared";
import { createServer, type Server as HttpServer } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as createClient, type Socket as ClientSocket } from "socket.io-client";
import { Server } from "socket.io";

import type { RateLimitConfig } from "./rate-limiter.js";
import { registerSocketHandlers } from "./socket-server.js";

type TestServer = {
  httpServer: HttpServer;
  ioServer: Server;
  port: number;
  close: () => Promise<void>;
};

function peer(peerId: string, displayName = peerId): Peer {
  return {
    peerId,
    displayName,
    deviceType: "laptop"
  };
}

function waitFor<T>(socket: ClientSocket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });
}

async function createTestServer(rateLimit?: RateLimitConfig): Promise<TestServer> {
  const httpServer = createServer();
  const ioServer = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000"
    }
  });

  registerSocketHandlers(ioServer, undefined, rateLimit ? { rateLimit } : undefined);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, resolve);
  });

  const address = httpServer.address();

  if (!address || typeof address === "string") {
    throw new Error("Could not start test server.");
  }

  return {
    httpServer,
    ioServer,
    port: address.port,
    close: async () => {
      await ioServer.close();
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
    }
  };
}

function connectClient(port: number, forwardedFor?: string): ClientSocket {
  return createClient(`http://127.0.0.1:${port}`, {
    forceNew: true,
    reconnection: false,
    transports: ["websocket"],
    extraHeaders: forwardedFor
      ? {
          "x-forwarded-for": forwardedFor
        }
      : undefined
  });
}

describe("socket room discovery", () => {
  let server: TestServer;
  const clients: ClientSocket[] = [];

  beforeEach(async () => {
    server = await createTestServer();
  });

  afterEach(async () => {
    clients.forEach((client) => client.disconnect());
    clients.length = 0;
    await server.close();
  });

  it("confirms join and sends existing peers to later peers", async () => {
    const first = connectClient(server.port);
    const second = connectClient(server.port);
    clients.push(first, second);

    first.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "study", peer: peer("peer-a000") });
    const firstJoined = await waitFor<{ peers: Peer[] }>(first, SERVER_EVENTS.ROOM_JOINED);

    second.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "study", peer: peer("peer-b000") });
    const secondJoined = await waitFor<{ peers: Peer[] }>(second, SERVER_EVENTS.ROOM_JOINED);

    expect(firstJoined.peers.map((item) => item.peerId)).toEqual(["peer-a000"]);
    expect(secondJoined.peers.map((item) => item.peerId)).toEqual(["peer-a000", "peer-b000"]);
  });

  it("scopes default nearby discovery by forwarded network address", async () => {
    const first = connectClient(server.port, "203.0.113.10");
    const second = connectClient(server.port, "203.0.113.10");
    const farAway = connectClient(server.port, "198.51.100.44");
    clients.push(first, second, farAway);

    first.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "nearby", peer: peer("peer-a000") });
    const firstJoined = await waitFor<{ roomId: string; peers: Peer[] }>(
      first,
      SERVER_EVENTS.ROOM_JOINED
    );

    second.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "nearby", peer: peer("peer-b000") });
    const secondJoined = await waitFor<{ roomId: string; peers: Peer[] }>(
      second,
      SERVER_EVENTS.ROOM_JOINED
    );

    farAway.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "nearby", peer: peer("peer-c000") });
    const farAwayJoined = await waitFor<{ roomId: string; peers: Peer[] }>(
      farAway,
      SERVER_EVENTS.ROOM_JOINED
    );

    expect(firstJoined.roomId).toMatch(/^nearby-[a-f0-9]{16}$/);
    expect(secondJoined.roomId).toBe(firstJoined.roomId);
    expect(farAwayJoined.roomId).not.toBe(firstJoined.roomId);
    expect(secondJoined.peers.map((item) => item.peerId)).toEqual(["peer-a000", "peer-b000"]);
    expect(farAwayJoined.peers.map((item) => item.peerId)).toEqual(["peer-c000"]);
  });

  it("broadcasts peer join and leave events", async () => {
    const first = connectClient(server.port);
    const second = connectClient(server.port);
    clients.push(first, second);

    first.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "study", peer: peer("peer-a000") });
    await waitFor(first, SERVER_EVENTS.ROOM_JOINED);

    const joinedPromise = waitFor<{ peer: Peer }>(first, SERVER_EVENTS.PEER_JOINED);
    second.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "study", peer: peer("peer-b000") });
    await waitFor(second, SERVER_EVENTS.ROOM_JOINED);

    expect((await joinedPromise).peer.peerId).toBe("peer-b000");

    const leftPromise = waitFor<{ peerId: string }>(first, SERVER_EVENTS.PEER_LEFT);
    second.disconnect();

    expect((await leftPromise).peerId).toBe("peer-b000");
  });

  it("rejects invalid room join payloads", async () => {
    const client = connectClient(server.port);
    clients.push(client);

    client.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "../bad", peer: peer("peer-a000") });

    await expect(waitFor<{ code: string }>(client, SERVER_EVENTS.EVENT_ERROR)).resolves.toMatchObject({
      code: "invalid_room_join"
    });
  });

  it("routes peer signaling only to peers in the same room", async () => {
    const first = connectClient(server.port);
    const second = connectClient(server.port);
    clients.push(first, second);

    first.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "study", peer: peer("peer-a000") });
    second.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "study", peer: peer("peer-b000") });
    await waitFor(first, SERVER_EVENTS.ROOM_JOINED);
    await waitFor(second, SERVER_EVENTS.ROOM_JOINED);

    const signalPromise = waitFor<{ fromPeerId: string; toPeerId: string; type: string }>(
      second,
      SERVER_EVENTS.PEER_SIGNAL
    );

    first.emit(CLIENT_EVENTS.PEER_SIGNAL, {
      roomId: "study",
      fromPeerId: "peer-a000",
      toPeerId: "peer-b000",
      type: "offer",
      payload: { sdp: "offer-sdp", type: "offer" }
    });

    await expect(signalPromise).resolves.toMatchObject({
      fromPeerId: "peer-a000",
      toPeerId: "peer-b000",
      type: "offer"
    });
  });

  it("blocks cross-room signaling and peer id spoofing", async () => {
    const first = connectClient(server.port);
    const second = connectClient(server.port);
    clients.push(first, second);

    first.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "study", peer: peer("peer-a000") });
    second.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "other", peer: peer("peer-b000") });
    await waitFor(first, SERVER_EVENTS.ROOM_JOINED);
    await waitFor(second, SERVER_EVENTS.ROOM_JOINED);

    first.emit(CLIENT_EVENTS.PEER_SIGNAL, {
      roomId: "other",
      fromPeerId: "peer-a000",
      toPeerId: "peer-b000",
      type: "offer",
      payload: { sdp: "offer-sdp", type: "offer" }
    });

    await expect(waitFor<{ code: string }>(first, SERVER_EVENTS.EVENT_ERROR)).resolves.toMatchObject({
      code: "room_mismatch"
    });

    first.emit(CLIENT_EVENTS.PEER_SIGNAL, {
      roomId: "study",
      fromPeerId: "peer-b000",
      toPeerId: "peer-a000",
      type: "offer",
      payload: { sdp: "offer-sdp", type: "offer" }
    });

    await expect(waitFor<{ code: string }>(first, SERVER_EVENTS.EVENT_ERROR)).resolves.toMatchObject({
      code: "peer_spoofing_blocked"
    });
  });

  it("rejects oversized signaling payloads", async () => {
    const first = connectClient(server.port);
    const second = connectClient(server.port);
    clients.push(first, second);

    first.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "study", peer: peer("peer-a000") });
    second.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "study", peer: peer("peer-b000") });
    await waitFor(first, SERVER_EVENTS.ROOM_JOINED);
    await waitFor(second, SERVER_EVENTS.ROOM_JOINED);

    const errorPromise = waitFor<{ code: string }>(first, SERVER_EVENTS.EVENT_ERROR);

    first.emit(CLIENT_EVENTS.PEER_SIGNAL, {
      roomId: "study",
      fromPeerId: "peer-a000",
      toPeerId: "peer-b000",
      type: "offer",
      payload: { sdp: "x".repeat(70_000), type: "offer" }
    });

    await expect(errorPromise).resolves.toMatchObject({
      code: "invalid_signal"
    });
  });

  it("rate limits excessive signaling events", async () => {
    await server.close();
    server = await createTestServer({ windowMs: 10_000, maxEvents: 2, maxInvalidEvents: 10 });
    const client = connectClient(server.port);
    clients.push(client);

    const errors: Array<{ code: string }> = [];
    client.on(SERVER_EVENTS.EVENT_ERROR, (payload: { code: string }) => {
      errors.push(payload);
    });

    client.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId: "study", peer: peer("peer-a000") });
    await waitFor(client, SERVER_EVENTS.ROOM_JOINED);
    client.emit(CLIENT_EVENTS.ROOM_LEAVE, { roomId: "study" });
    client.emit(CLIENT_EVENTS.ROOM_LEAVE, { roomId: "study" });

    await expect
      .poll(() => errors.some((error) => error.code === "rate_limited"))
      .toBe(true);
  });
});
