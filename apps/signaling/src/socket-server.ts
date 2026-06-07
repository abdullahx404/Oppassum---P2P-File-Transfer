import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  roomJoinSchema,
  roomLeaveSchema,
  type EventErrorPayload,
  type Peer
} from "@oppassum/shared";
import type { Server, Socket } from "socket.io";

import { RoomService } from "./room-service.js";

function emitError(socket: Socket, code: string, message: string): void {
  const payload: EventErrorPayload = { code, message };
  socket.emit(SERVER_EVENTS.EVENT_ERROR, payload);
}

export function registerSocketHandlers(io: Server, roomService = new RoomService()): RoomService {
  io.on("connection", (socket) => {
    socket.on(CLIENT_EVENTS.ROOM_JOIN, (payload: unknown) => {
      const result = roomJoinSchema.safeParse(payload);

      if (!result.success) {
        emitError(socket, "invalid_room_join", "Could not join this room.");
        return;
      }

      const { roomId, peer } = result.data;
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
      const result = roomLeaveSchema.safeParse(payload);

      if (!result.success) {
        emitError(socket, "invalid_room_leave", "Could not leave this room.");
        return;
      }

      const activeRoom = roomService.getSocketRoom(socket.id);

      if (activeRoom && activeRoom !== result.data.roomId) {
        emitError(socket, "room_mismatch", "This device is not in that room.");
        return;
      }

      leaveRoom(io, socket, roomService);
    });

    socket.on(CLIENT_EVENTS.PEER_SIGNAL, () => {
      emitError(socket, "not_implemented", "Peer signaling will be available in the next phase.");
    });

    socket.on("disconnect", () => {
      leaveRoom(io, socket, roomService);
    });
  });

  return roomService;
}

function leaveRoom(io: Server, socket: Socket, roomService: RoomService): void {
  const left = roomService.leaveBySocket(socket.id);

  if (!left) {
    return;
  }

  socket.leave(left.roomId);
  io.to(left.roomId).emit(SERVER_EVENTS.PEER_LEFT, left);
}

export function createPeer(overrides: Partial<Peer> = {}): Peer {
  return {
    peerId: "peer-000000",
    displayName: "Device",
    deviceType: "unknown",
    ...overrides
  };
}
