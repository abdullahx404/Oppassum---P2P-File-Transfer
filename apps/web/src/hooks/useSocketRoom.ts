"use client";

import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  type DeviceType,
  type EventErrorPayload,
  type Peer,
  type PeerJoinedPayload,
  type PeerLeftPayload,
  type RoomJoinedPayload
} from "@oppassum/shared";
import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";

export type RoomConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type SocketRoomState = {
  status: RoomConnectionStatus;
  roomId: string;
  self: Peer;
  peers: Peer[];
  socket?: Socket;
  errorMessage?: string;
};

type UseSocketRoomOptions = {
  enabled?: boolean;
  roomId?: string;
};

const DEFAULT_ROOM_ID = "local-room";
const DEFAULT_SIGNALING_URL = "http://localhost:4000";

export function useSocketRoom(options: UseSocketRoomOptions = {}): SocketRoomState {
  const { enabled = true, roomId = getInitialRoomId(options.roomId) } = options;
  const self = useMemo(() => createSessionPeer(), []);
  const [state, setState] = useState<SocketRoomState>({
    status: "connecting",
    roomId,
    self,
    peers: []
  });
  const [socketInstance, setSocketInstance] = useState<Socket | undefined>();

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const socket = io(process.env.NEXT_PUBLIC_SIGNALING_URL ?? DEFAULT_SIGNALING_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 2
    });
    setSocketInstance(socket);

    socket.on("connect", () => {
      socket.emit(CLIENT_EVENTS.ROOM_JOIN, { roomId, peer: self });
    });

    socket.on(SERVER_EVENTS.ROOM_JOINED, (payload: RoomJoinedPayload) => {
      setState({
        status: "connected",
        roomId: payload.roomId,
        self: payload.self,
        socket,
        peers: withoutSelf(payload.peers, payload.self.peerId)
      });
    });

    socket.on(SERVER_EVENTS.PEER_JOINED, (payload: PeerJoinedPayload) => {
      setState((current) => ({
        ...current,
        status: "connected",
        peers: mergePeer(current.peers, payload.peer, current.self.peerId)
      }));
    });

    socket.on(SERVER_EVENTS.PEER_LEFT, (payload: PeerLeftPayload) => {
      setState((current) => ({
        ...current,
        peers: current.peers.filter((peer) => peer.peerId !== payload.peerId)
      }));
    });

    socket.on(SERVER_EVENTS.EVENT_ERROR, (payload: EventErrorPayload) => {
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: payload.message
      }));
    });

    socket.on("disconnect", () => {
      setState((current) => ({
        ...current,
        status: "disconnected",
        peers: []
      }));
    });

    socket.on("connect_error", () => {
      setState((current) => ({
        ...current,
        status: "error",
        errorMessage: "Could not connect to the signaling server."
      }));
    });

    return () => {
      leaveRoom(socket, roomId);
      setSocketInstance(undefined);
    };
  }, [enabled, roomId, self]);

  return {
    ...state,
    socket: socketInstance
  };
}

export function createFallbackRoomState(overrides: Partial<SocketRoomState> = {}): SocketRoomState {
  const self = createPeer("peer-preview-self", "This Device", "laptop");

  return {
    status: "connected",
    roomId: DEFAULT_ROOM_ID,
    self,
    peers: [],
    ...overrides
  };
}

function leaveRoom(socket: Socket, roomId: string): void {
  if (socket.connected) {
    socket.emit(CLIENT_EVENTS.ROOM_LEAVE, { roomId });
  }

  socket.removeAllListeners();
  socket.disconnect();
}

function mergePeer(peers: Peer[], incomingPeer: Peer, selfPeerId: string): Peer[] {
  if (incomingPeer.peerId === selfPeerId) {
    return peers;
  }

  return [...peers.filter((peer) => peer.peerId !== incomingPeer.peerId), incomingPeer];
}

function withoutSelf(peers: Peer[], selfPeerId: string): Peer[] {
  return peers.filter((peer) => peer.peerId !== selfPeerId);
}

function createSessionPeer(): Peer {
  if (typeof window === "undefined") {
    return createPeer("peer-server", "This Device", "unknown");
  }

  const existingPeerId = window.sessionStorage.getItem("oppassum.peerId");
  const peerId = existingPeerId ?? `peer-${crypto.randomUUID()}`;
  window.sessionStorage.setItem("oppassum.peerId", peerId);

  return createPeer(peerId, getDeviceName(), getDeviceType());
}

function createPeer(peerId: string, displayName: string, deviceType: DeviceType): Peer {
  return {
    peerId,
    displayName,
    deviceType
  };
}

function getDeviceType(): DeviceType {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|android.*mobile/.test(userAgent)) {
    return "phone";
  }

  if (/ipad|tablet|android/.test(userAgent)) {
    return "tablet";
  }

  if (/macintosh|windows|linux/.test(userAgent)) {
    return "laptop";
  }

  return "unknown";
}

function getDeviceName(): string {
  const deviceType = getDeviceType();

  if (deviceType === "phone") {
    return "Phone";
  }

  if (deviceType === "tablet") {
    return "Tablet";
  }

  if (deviceType === "laptop") {
    return "Computer";
  }

  return "Device";
}

function getInitialRoomId(configuredRoomId: string | undefined): string {
  if (configuredRoomId) {
    return configuredRoomId;
  }

  if (typeof window === "undefined") {
    return DEFAULT_ROOM_ID;
  }

  const urlRoomId = new URLSearchParams(window.location.search).get("room");
  return urlRoomId && /^[a-zA-Z0-9_-]{3,64}$/.test(urlRoomId) ? urlRoomId : DEFAULT_ROOM_ID;
}
