import { z } from "zod";

export const MAX_SIGNAL_PAYLOAD_BYTES = 64 * 1024;

export const CLIENT_EVENTS = {
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  PEER_SIGNAL: "peer:signal",
  PEER_PING: "peer:ping"
} as const;

export const SERVER_EVENTS = {
  ROOM_JOINED: "room:joined",
  PEER_JOINED: "peer:joined",
  PEER_LEFT: "peer:left",
  PEER_SIGNAL: "peer:signal",
  EVENT_ERROR: "error:event"
} as const;

export const deviceTypeSchema = z.enum(["desktop", "laptop", "tablet", "phone", "unknown"]);

export const peerSchema = z.object({
  peerId: z.string().min(8).max(64),
  displayName: z.string().min(1).max(80),
  deviceType: deviceTypeSchema
});

export const roomIdSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const roomJoinSchema = z.object({
  roomId: roomIdSchema,
  peer: peerSchema
});

export const roomLeaveSchema = z.object({
  roomId: roomIdSchema
});

export const roomJoinedSchema = z.object({
  roomId: roomIdSchema,
  self: peerSchema,
  peers: z.array(peerSchema)
});

export const peerJoinedSchema = z.object({
  roomId: roomIdSchema,
  peer: peerSchema
});

export const peerLeftSchema = z.object({
  roomId: roomIdSchema,
  peerId: z.string().min(8).max(64)
});

export const eventErrorSchema = z.object({
  code: z.string().min(1).max(80),
  message: z.string().min(1).max(200)
});

export const signalTypeSchema = z.enum(["offer", "answer", "ice-candidate"]);

const signalPayloadSchema = z
  .unknown()
  .refine((payload) => !isBinaryPayload(payload), "Binary signal payloads are not allowed.")
  .refine((payload) => getJsonByteLength(payload) <= MAX_SIGNAL_PAYLOAD_BYTES, {
    message: "Signal payload is too large."
  });

export const signalMessageSchema = z.object({
  roomId: roomIdSchema,
  fromPeerId: z.string().min(8).max(64),
  toPeerId: z.string().min(8).max(64),
  type: signalTypeSchema,
  payload: signalPayloadSchema
});

export type DeviceType = z.infer<typeof deviceTypeSchema>;
export type EventErrorPayload = z.infer<typeof eventErrorSchema>;
export type Peer = z.infer<typeof peerSchema>;
export type PeerJoinedPayload = z.infer<typeof peerJoinedSchema>;
export type PeerLeftPayload = z.infer<typeof peerLeftSchema>;
export type RoomJoinedPayload = z.infer<typeof roomJoinedSchema>;
export type RoomJoinPayload = z.infer<typeof roomJoinSchema>;
export type RoomLeavePayload = z.infer<typeof roomLeaveSchema>;
export type SignalMessage = z.infer<typeof signalMessageSchema>;
export type SignalType = z.infer<typeof signalTypeSchema>;

function getJsonByteLength(payload: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function isBinaryPayload(payload: unknown): boolean {
  if (
    payload instanceof ArrayBuffer ||
    payload instanceof Blob ||
    ArrayBuffer.isView(payload)
  ) {
    return true;
  }

  if (!payload || typeof payload !== "object") {
    return false;
  }

  return Object.values(payload).some((value) => isBinaryPayload(value));
}
