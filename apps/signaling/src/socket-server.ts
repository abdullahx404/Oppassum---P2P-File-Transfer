import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  roomJoinSchema,
  roomLeaveSchema,
  signalMessageSchema,
  type EventErrorPayload,
  type Peer
} from "@oppassum/shared";
import { createHash } from "node:crypto";
import type { Server, Socket } from "socket.io";

import { DEFAULT_RATE_LIMIT, SocketRateLimiter, type RateLimitConfig } from "./rate-limiter.js";
import { RoomService } from "./room-service.js";

const MAX_SIGNAL_PAYLOAD_BYTES = 64 * 1024;
const DEFAULT_DISCOVERY_ROOM_IDS = new Set(["local-room", "nearby"]);

type SocketSecurityOptions = {
  rateLimit?: RateLimitConfig;
};

function emitError(socket: Socket, code: string, message: string): void {
  const payload: EventErrorPayload = { code, message };
  socket.emit(SERVER_EVENTS.EVENT_ERROR, payload);
}

export function registerSocketHandlers(
  io: Server,
  roomService = new RoomService(),
  options: SocketSecurityOptions = {}
): RoomService {
  const rateLimiter = new SocketRateLimiter(options.rateLimit ?? DEFAULT_RATE_LIMIT);

  io.on("connection", (socket) => {
    socket.on(CLIENT_EVENTS.ROOM_JOIN, (payload: unknown) => {
      if (!allowEvent(socket, rateLimiter)) {
        return;
      }

      const result = roomJoinSchema.safeParse(payload);

      if (!result.success) {
        recordInvalidEvent(socket, rateLimiter);
        emitError(socket, "invalid_room_join", "Could not join this room.");
        return;
      }

      const { roomId: requestedRoomId, peer } = result.data;
      const roomId = resolveRoomId(socket, requestedRoomId);
      const joinResult = roomService.joinRoom(roomId, socket.id, peer);
      socket.join(roomId);

      socket.emit(SERVER_EVENTS.ROOM_JOINED, {
        roomId,
        self: peer,
        peers: joinResult.peers
      });

      socket.to(roomId).emit(SERVER_EVENTS.PEER_JOINED, {
        roomId,
        peer
      });
    });

    socket.on(CLIENT_EVENTS.ROOM_LEAVE, (payload: unknown) => {
      if (!allowEvent(socket, rateLimiter)) {
        return;
      }

      const result = roomLeaveSchema.safeParse(payload);

      if (!result.success) {
        recordInvalidEvent(socket, rateLimiter);
        emitError(socket, "invalid_room_leave", "Could not leave this room.");
        return;
      }

      const activeRoom = roomService.getSocketRoom(socket.id);
      const requestedRoomId = resolveRoomId(socket, result.data.roomId);

      if (activeRoom && activeRoom !== requestedRoomId) {
        recordInvalidEvent(socket, rateLimiter);
        emitError(socket, "room_mismatch", "This device is not in that room.");
        return;
      }

      leaveRoom(io, socket, roomService);
    });

    socket.on(CLIENT_EVENTS.PEER_SIGNAL, (payload: unknown) => {
      if (!allowEvent(socket, rateLimiter)) {
        return;
      }

      const result = signalMessageSchema.safeParse(payload);

      if (!result.success) {
        recordInvalidEvent(socket, rateLimiter);
        emitError(socket, "invalid_signal", "Could not send this connection message.");
        return;
      }

      const signal = result.data;

      if (getPayloadByteLength(signal.payload) > MAX_SIGNAL_PAYLOAD_BYTES) {
        recordInvalidEvent(socket, rateLimiter);
        emitError(socket, "invalid_signal", "Could not send this connection message.");
        return;
      }

      const activeRoom = roomService.getSocketRoom(socket.id);
      const activePeerId = roomService.getSocketPeerId(socket.id);
      const signalRoomId = resolveRoomId(socket, signal.roomId);

      if (activeRoom !== signalRoomId) {
        recordInvalidEvent(socket, rateLimiter);
        emitError(socket, "room_mismatch", "This device is not in that room.");
        return;
      }

      if (activePeerId !== signal.fromPeerId) {
        recordInvalidEvent(socket, rateLimiter);
        emitError(socket, "peer_spoofing_blocked", "This device cannot send as another peer.");
        return;
      }

      const targetSocketId = roomService.getPeerSocketId(signalRoomId, signal.toPeerId);

      if (!targetSocketId) {
        recordInvalidEvent(socket, rateLimiter);
        emitError(socket, "target_peer_missing", "That device is no longer connected.");
        return;
      }

      io.to(targetSocketId).emit(SERVER_EVENTS.PEER_SIGNAL, {
        ...signal,
        roomId: signalRoomId
      });
    });

    socket.on("disconnect", () => {
      rateLimiter.clear(socket.id);
      leaveRoom(io, socket, roomService);
    });
  });

  return roomService;
}

function allowEvent(socket: Socket, rateLimiter: SocketRateLimiter): boolean {
  if (rateLimiter.consume(socket.id)) {
    return true;
  }

  emitError(socket, "rate_limited", "Too many signaling events. Please wait and try again.");
  return false;
}

function recordInvalidEvent(socket: Socket, rateLimiter: SocketRateLimiter): void {
  if (rateLimiter.recordInvalid(socket.id)) {
    return;
  }

  emitError(socket, "too_many_invalid_events", "Too many invalid signaling events.");
  socket.disconnect(true);
}

function getPayloadByteLength(payload: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function leaveRoom(io: Server, socket: Socket, roomService: RoomService): void {
  const left = roomService.leaveBySocket(socket.id);

  if (!left) {
    return;
  }

  socket.leave(left.roomId);
  io.to(left.roomId).emit(SERVER_EVENTS.PEER_LEFT, left);
}

function resolveRoomId(socket: Socket, requestedRoomId: string): string {
  if (!DEFAULT_DISCOVERY_ROOM_IDS.has(requestedRoomId)) {
    return requestedRoomId;
  }

  return `nearby-${hashNetworkAddress(getClientAddress(socket))}`;
}

function getClientAddress(socket: Socket): string {
  const forwardedFor = socket.handshake.headers["x-forwarded-for"];
  const firstForwardedAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(",")[0];
  const address = firstForwardedAddress?.trim() || socket.handshake.address || "unknown";

  return address.replace(/^::ffff:/, "");
}

function hashNetworkAddress(address: string): string {
  return createHash("sha256").update(address).digest("hex").slice(0, 16);
}

export function createPeer(overrides: Partial<Peer> = {}): Peer {
  return {
    peerId: "peer-000000",
    displayName: "Device",
    deviceType: "unknown",
    ...overrides
  };
}
