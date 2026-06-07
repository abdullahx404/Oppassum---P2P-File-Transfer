import { z } from "zod";

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

export const signalTypeSchema = z.enum(["offer", "answer", "ice-candidate"]);

export const signalMessageSchema = z.object({
  roomId: roomIdSchema,
  fromPeerId: z.string().min(8).max(64),
  toPeerId: z.string().min(8).max(64),
  type: signalTypeSchema,
  payload: z.unknown()
});

export type DeviceType = z.infer<typeof deviceTypeSchema>;
export type Peer = z.infer<typeof peerSchema>;
export type RoomJoinPayload = z.infer<typeof roomJoinSchema>;
export type SignalMessage = z.infer<typeof signalMessageSchema>;
export type SignalType = z.infer<typeof signalTypeSchema>;
