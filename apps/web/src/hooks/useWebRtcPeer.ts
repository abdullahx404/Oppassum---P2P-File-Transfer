"use client";

import { CLIENT_EVENTS, SERVER_EVENTS, type Peer, type SignalMessage } from "@oppassum/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SocketRoomState } from "./useSocketRoom";
import {
  attachDataChannelHandlers,
  createAnswer,
  createOffer,
  createPeerConnection
} from "../lib/webrtc";

export type PeerConnectionStatus =
  | "idle"
  | "connecting"
  | "data-channel-open"
  | "failed"
  | "disconnected";

export type PeerConnectionSnapshot = {
  statuses: Record<string, PeerConnectionStatus>;
  activePeerId?: string;
  connectToPeer: (peer: Peer) => Promise<void>;
};

type PeerConnectionSession = {
  connection: RTCPeerConnection;
  channel?: RTCDataChannel;
};

const CONNECTION_TIMEOUT_MS = 15_000;

export function useWebRtcPeer(roomState: SocketRoomState): PeerConnectionSnapshot {
  const sessions = useRef(new Map<string, PeerConnectionSession>());
  const timeoutHandles = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [statuses, setStatuses] = useState<Record<string, PeerConnectionStatus>>({});
  const [activePeerId, setActivePeerId] = useState<string | undefined>();

  const setPeerStatus = useCallback((peerId: string, status: PeerConnectionStatus) => {
    setStatuses((current) => ({
      ...current,
      [peerId]: status
    }));
  }, []);

  const clearConnectionTimeout = useCallback((peerId: string) => {
    const timeout = timeoutHandles.current.get(peerId);

    if (timeout) {
      clearTimeout(timeout);
      timeoutHandles.current.delete(peerId);
    }
  }, []);

  const startConnectionTimeout = useCallback(
    (peerId: string) => {
      clearConnectionTimeout(peerId);
      timeoutHandles.current.set(
        peerId,
        setTimeout(() => {
          setPeerStatus(peerId, "failed");
        }, CONNECTION_TIMEOUT_MS)
      );
    },
    [clearConnectionTimeout, setPeerStatus]
  );

  const sendSignal = useCallback(
    (toPeerId: string, signal: Omit<SignalMessage, "roomId" | "fromPeerId" | "toPeerId">) => {
      roomState.socket?.emit(CLIENT_EVENTS.PEER_SIGNAL, {
        roomId: roomState.roomId,
        fromPeerId: roomState.self.peerId,
        toPeerId,
        ...signal
      });
    },
    [roomState.roomId, roomState.self.peerId, roomState.socket]
  );

  const createSession = useCallback(
    (peerId: string): PeerConnectionSession => {
      const existing = sessions.current.get(peerId);

      if (existing) {
        return existing;
      }

      const connection = createPeerConnection({
        onLocalSignal: (message) => sendSignal(peerId, message),
        onDataChannelOpen: () => {
          clearConnectionTimeout(peerId);
          setPeerStatus(peerId, "data-channel-open");
          setActivePeerId(peerId);
        },
        onConnectionStateChange: (state) => {
          if (state === "failed" || state === "closed") {
            clearConnectionTimeout(peerId);
            setPeerStatus(peerId, "failed");
          }

          if (state === "disconnected") {
            setPeerStatus(peerId, "disconnected");
          }
        }
      });

      const session: PeerConnectionSession = { connection };
      connection.ondatachannel = (event) => {
        session.channel = attachDataChannelHandlers(event.channel, () => {
          clearConnectionTimeout(peerId);
          setPeerStatus(peerId, "data-channel-open");
          setActivePeerId(peerId);
        });
      };

      sessions.current.set(peerId, session);
      return session;
    },
    [clearConnectionTimeout, sendSignal, setPeerStatus]
  );

  const connectToPeer = useCallback(
    async (peer: Peer) => {
      if (!roomState.socket || roomState.status !== "connected") {
        return;
      }

      setPeerStatus(peer.peerId, "connecting");
      setActivePeerId(peer.peerId);
      startConnectionTimeout(peer.peerId);

      const session = createSession(peer.peerId);
      session.channel = attachDataChannelHandlers(
        session.connection.createDataChannel("oppassum-control"),
        () => {
          clearConnectionTimeout(peer.peerId);
          setPeerStatus(peer.peerId, "data-channel-open");
          setActivePeerId(peer.peerId);
        }
      );

      const offer = await createOffer(session.connection);
      sendSignal(peer.peerId, {
        type: "offer",
        payload: offer
      });
    },
    [
      clearConnectionTimeout,
      createSession,
      roomState.socket,
      roomState.status,
      sendSignal,
      setPeerStatus,
      startConnectionTimeout
    ]
  );

  useEffect(() => {
    const socket = roomState.socket;

    if (!socket) {
      return undefined;
    }

    const handleSignal = async (message: SignalMessage) => {
      if (message.roomId !== roomState.roomId || message.toPeerId !== roomState.self.peerId) {
        return;
      }

      const session = createSession(message.fromPeerId);
      setActivePeerId(message.fromPeerId);

      if (message.type === "offer") {
        setPeerStatus(message.fromPeerId, "connecting");
        startConnectionTimeout(message.fromPeerId);
        await session.connection.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
        const answer = await createAnswer(session.connection);
        sendSignal(message.fromPeerId, {
          type: "answer",
          payload: answer
        });
      }

      if (message.type === "answer") {
        await session.connection.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
      }

      if (message.type === "ice-candidate") {
        try {
          await session.connection.addIceCandidate(message.payload as RTCIceCandidateInit);
        } catch {
          setPeerStatus(message.fromPeerId, "failed");
        }
      }
    };

    socket.on(SERVER_EVENTS.PEER_SIGNAL, handleSignal);

    return () => {
      socket.off(SERVER_EVENTS.PEER_SIGNAL, handleSignal);
    };
  }, [
    createSession,
    roomState.roomId,
    roomState.self.peerId,
    roomState.socket,
    sendSignal,
    setPeerStatus,
    startConnectionTimeout
  ]);

  useEffect(() => {
    const knownPeerIds = new Set(roomState.peers.map((peer) => peer.peerId));

    for (const [peerId, session] of sessions.current) {
      if (!knownPeerIds.has(peerId)) {
        session.channel?.close();
        session.connection.close();
        sessions.current.delete(peerId);
        clearConnectionTimeout(peerId);
        setPeerStatus(peerId, "disconnected");
      }
    }
  }, [clearConnectionTimeout, roomState.peers, setPeerStatus]);

  useEffect(() => {
    const currentSessions = sessions.current;
    const currentTimeouts = timeoutHandles.current;

    return () => {
      currentTimeouts.forEach((timeout) => clearTimeout(timeout));
      currentTimeouts.clear();
      currentSessions.forEach((session) => {
        session.channel?.close();
        session.connection.close();
      });
      currentSessions.clear();
    };
  }, []);

  return {
    statuses,
    activePeerId,
    connectToPeer
  };
}
