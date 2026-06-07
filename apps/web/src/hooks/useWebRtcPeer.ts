"use client";

import { CLIENT_EVENTS, SERVER_EVENTS, type Peer, type SignalMessage } from "@oppassum/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SocketRoomState } from "./useSocketRoom";
import type { TransferManifest } from "../lib/files";
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
  incomingOffer?: IncomingTransferOffer;
  outgoingStatus?: TransferDecisionStatus;
  connectToPeer: (peer: Peer) => Promise<void>;
  sendTransferManifest: (peer: Peer, manifest: TransferManifest) => Promise<void>;
  acceptIncomingTransfer: () => void;
  rejectIncomingTransfer: () => void;
};

export type IncomingTransferOffer = {
  peerId: string;
  manifest: TransferManifest;
};

export type TransferDecisionStatus = {
  peerId: string;
  transferId: string;
  status: "pending" | "accepted" | "rejected";
};

type PeerConnectionSession = {
  connection: RTCPeerConnection;
  channel?: RTCDataChannel;
};

type ControlMessage =
  | { kind: "transfer-manifest"; manifest: TransferManifest }
  | { kind: "transfer-accepted"; transferId: string }
  | { kind: "transfer-rejected"; transferId: string };

const CONNECTION_TIMEOUT_MS = 15_000;

export function useWebRtcPeer(roomState: SocketRoomState): PeerConnectionSnapshot {
  const sessions = useRef(new Map<string, PeerConnectionSession>());
  const timeoutHandles = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [statuses, setStatuses] = useState<Record<string, PeerConnectionStatus>>({});
  const [activePeerId, setActivePeerId] = useState<string | undefined>();
  const [incomingOffer, setIncomingOffer] = useState<IncomingTransferOffer | undefined>();
  const [outgoingStatus, setOutgoingStatus] = useState<TransferDecisionStatus | undefined>();

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

  const handleControlMessage = useCallback((peerId: string, rawMessage: string) => {
    if (rawMessage === "oppassum:probe") {
      return;
    }

    const message = parseControlMessage(rawMessage);

    if (!message) {
      return;
    }

    if (message.kind === "transfer-manifest") {
      setIncomingOffer({
        peerId,
        manifest: message.manifest
      });
    }

    if (message.kind === "transfer-accepted") {
      setOutgoingStatus((current) =>
        current?.transferId === message.transferId
          ? {
              ...current,
              status: "accepted"
            }
          : current
      );
    }

    if (message.kind === "transfer-rejected") {
      setOutgoingStatus((current) =>
        current?.transferId === message.transferId
          ? {
              ...current,
              status: "rejected"
            }
          : current
      );
    }
  }, []);

  const attachControlChannel = useCallback(
    (peerId: string, channel: RTCDataChannel): RTCDataChannel =>
      attachDataChannelHandlers(
        channel,
        () => {
          clearConnectionTimeout(peerId);
          setPeerStatus(peerId, "data-channel-open");
          setActivePeerId(peerId);
        },
        (message) => handleControlMessage(peerId, message)
      ),
    [clearConnectionTimeout, handleControlMessage, setPeerStatus]
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
        session.channel = attachControlChannel(peerId, event.channel);
      };

      sessions.current.set(peerId, session);
      return session;
    },
    [attachControlChannel, clearConnectionTimeout, sendSignal, setPeerStatus]
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
      session.channel = attachControlChannel(
        peer.peerId,
        session.connection.createDataChannel("oppassum-control")
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
      attachControlChannel,
      roomState.socket,
      roomState.status,
      sendSignal,
      setPeerStatus,
      startConnectionTimeout
    ]
  );

  const sendTransferManifest = useCallback(
    async (peer: Peer, manifest: TransferManifest) => {
      await connectToPeer(peer);
      const session = createSession(peer.peerId);

      setOutgoingStatus({
        peerId: peer.peerId,
        transferId: manifest.transferId,
        status: "pending"
      });

      sendWhenChannelOpens(session, {
        kind: "transfer-manifest",
        manifest
      });
    },
    [connectToPeer, createSession]
  );

  const acceptIncomingTransfer = useCallback(() => {
    if (!incomingOffer) {
      return;
    }

    const session = sessions.current.get(incomingOffer.peerId);
    sendWhenChannelOpens(session, {
      kind: "transfer-accepted",
      transferId: incomingOffer.manifest.transferId
    });
    setIncomingOffer(undefined);
  }, [incomingOffer]);

  const rejectIncomingTransfer = useCallback(() => {
    if (!incomingOffer) {
      return;
    }

    const session = sessions.current.get(incomingOffer.peerId);
    sendWhenChannelOpens(session, {
      kind: "transfer-rejected",
      transferId: incomingOffer.manifest.transferId
    });
    setIncomingOffer(undefined);
  }, [incomingOffer]);

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
    incomingOffer,
    outgoingStatus,
    connectToPeer,
    sendTransferManifest,
    acceptIncomingTransfer,
    rejectIncomingTransfer
  };
}

function parseControlMessage(rawMessage: string): ControlMessage | undefined {
  try {
    const parsed = JSON.parse(rawMessage) as ControlMessage;

    if (
      parsed.kind === "transfer-manifest" ||
      parsed.kind === "transfer-accepted" ||
      parsed.kind === "transfer-rejected"
    ) {
      return parsed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function sendWhenChannelOpens(
  session: PeerConnectionSession | undefined,
  message: ControlMessage
): void {
  if (!session?.channel) {
    return;
  }

  const channel = session.channel;
  const serializedMessage = JSON.stringify(message);

  if (channel.readyState === "open") {
    channel.send(serializedMessage);
    return;
  }

  const existingOpenHandler = channel.onopen;
  channel.onopen = (event) => {
    existingOpenHandler?.call(channel, event);
    channel.send(serializedMessage);
  };
}
