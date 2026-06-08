"use client";

import { CLIENT_EVENTS, SERVER_EVENTS, type Peer, type SignalMessage } from "@oppassum/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SocketRoomState } from "./useSocketRoom";
import {
  createReceivedFileUrl,
  createTransferProgress,
  DEFAULT_CHUNK_SIZE,
  readFileChunks,
  waitForDataChannelBackpressure,
  type ReceivedTransferFile,
  type TransferProgressSnapshot
} from "../lib/chunked-transfer";
import type { TransferFileMetadata, TransferManifest } from "../lib/files";
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
  transferProgress?: TransferProgressSnapshot;
  transferError?: TransferError;
  receivedFiles: ReceivedTransferFile[];
  clearReceivedFiles: () => void;
  clearTransferError: () => void;
  clearTransferProgress: () => void;
  connectToPeer: (peer: Peer) => Promise<void>;
  sendTransferManifest: (peer: Peer, manifest: TransferManifest, files: File[]) => Promise<void>;
  retryLastTransfer: () => Promise<void>;
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

export type TransferError = {
  title: string;
  detail: string;
  canRetry: boolean;
};

type PeerConnectionSession = {
  connection: RTCPeerConnection;
  channel?: RTCDataChannel;
};

type ControlMessage =
  | { kind: "transfer-manifest"; manifest: TransferManifest }
  | { kind: "transfer-accepted"; transferId: string }
  | { kind: "transfer-rejected"; transferId: string }
  | { kind: "file-start"; transferId: string; fileId: string }
  | { kind: "file-complete"; transferId: string; fileId: string }
  | { kind: "transfer-complete"; transferId: string };

type PendingOutgoingTransfer = {
  peer: Peer;
  peerId: string;
  manifest: TransferManifest;
  files: File[];
};

type ReceivingFile = {
  metadata: TransferFileMetadata;
  chunks: ArrayBuffer[];
  receivedBytes: number;
};

type ActiveReceivingTransfer = {
  peerId: string;
  manifest: TransferManifest;
  startedAt: number;
  currentFile?: ReceivingFile;
  receivedBytes: number;
  completedFiles: number;
  files: ReceivedTransferFile[];
};

const CONNECTION_TIMEOUT_MS = 15_000;

export function useWebRtcPeer(roomState: SocketRoomState): PeerConnectionSnapshot {
  const sessions = useRef(new Map<string, PeerConnectionSession>());
  const timeoutHandles = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingIceCandidates = useRef(new Map<string, RTCIceCandidateInit[]>());
  const pendingOutgoingTransfers = useRef(new Map<string, PendingOutgoingTransfer>());
  const receivingTransfers = useRef(new Map<string, ActiveReceivingTransfer>());
  const lastOutgoingTransfer = useRef<PendingOutgoingTransfer | undefined>(undefined);
  const receivedFileUrls = useRef<string[]>([]);
  const [statuses, setStatuses] = useState<Record<string, PeerConnectionStatus>>({});
  const [activePeerId, setActivePeerId] = useState<string | undefined>();
  const [incomingOffer, setIncomingOffer] = useState<IncomingTransferOffer | undefined>();
  const [outgoingStatus, setOutgoingStatus] = useState<TransferDecisionStatus | undefined>();
  const [transferProgress, setTransferProgress] = useState<TransferProgressSnapshot | undefined>();
  const [transferError, setTransferError] = useState<TransferError | undefined>();
  const [receivedFiles, setReceivedFiles] = useState<ReceivedTransferFile[]>([]);

  const setPeerStatus = useCallback((peerId: string, status: PeerConnectionStatus) => {
    setStatuses((current) => ({
      ...current,
      [peerId]: status
    }));
  }, []);

  const failPeerTransfers = useCallback((peerId: string, error: TransferError) => {
    let hasActiveTransfer = false;
    const outgoingTransfer = [...pendingOutgoingTransfers.current.values()].find(
      (transfer) => transfer.peerId === peerId
    );

    setIncomingOffer((current) => {
      if (current?.peerId !== peerId) {
        return current;
      }

      hasActiveTransfer = true;
      return undefined;
    });

    if (outgoingTransfer) {
      hasActiveTransfer = true;
      setTransferProgress((current) =>
        current?.transferId === outgoingTransfer.manifest.transferId
          ? {
              ...current,
              status: "failed"
            }
          : createTransferProgress({
              direction: "sending",
              status: "failed",
              transferId: outgoingTransfer.manifest.transferId,
              fileName: "Transfer failed",
              bytesTransferred: 0,
              totalBytes: outgoingTransfer.manifest.totalBytes,
              completedFiles: 0,
              totalFiles: outgoingTransfer.manifest.files.length
            })
      );
      pendingOutgoingTransfers.current.delete(outgoingTransfer.manifest.transferId);
    }

    for (const [transferId, receivingTransfer] of receivingTransfers.current) {
      if (receivingTransfer.peerId !== peerId) {
        continue;
      }

      hasActiveTransfer = true;
      setTransferProgress({
        direction: "receiving",
        status: "failed",
        transferId,
        fileName: receivingTransfer.currentFile?.metadata.name ?? "Incoming transfer",
        bytesTransferred: receivingTransfer.receivedBytes,
        totalBytes: receivingTransfer.manifest.totalBytes,
        completedFiles: receivingTransfer.completedFiles,
        totalFiles: receivingTransfer.manifest.files.length
      });
      receivingTransfers.current.delete(transferId);
    }

    if (hasActiveTransfer) {
      setTransferError(error);
    }
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
          failPeerTransfers(peerId, {
            title: "Connection timed out",
            detail: "The peer connection did not open in time. Check that both devices are online and retry.",
            canRetry: true
          });
        }, CONNECTION_TIMEOUT_MS)
      );
    },
    [clearConnectionTimeout, failPeerTransfers, setPeerStatus]
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

  const addRemoteIceCandidate = useCallback(
    async (
      peerId: string,
      connection: RTCPeerConnection,
      candidate: RTCIceCandidateInit
    ): Promise<void> => {
      if (!connection.remoteDescription) {
        pendingIceCandidates.current.set(peerId, [
          ...(pendingIceCandidates.current.get(peerId) ?? []),
          candidate
        ]);
        return;
      }

      try {
        await connection.addIceCandidate(candidate);
      } catch {
        setPeerStatus(peerId, "failed");
      }
    },
    [setPeerStatus]
  );

  const flushRemoteIceCandidates = useCallback(
    async (peerId: string, connection: RTCPeerConnection): Promise<void> => {
      const candidates = pendingIceCandidates.current.get(peerId) ?? [];
      pendingIceCandidates.current.delete(peerId);

      for (const candidate of candidates) {
        await addRemoteIceCandidate(peerId, connection, candidate);
      }
    },
    [addRemoteIceCandidate]
  );

  const sendTransferChunks = useCallback(async (peerId: string, transferId: string) => {
    const pendingTransfer = pendingOutgoingTransfers.current.get(transferId);
    const session = sessions.current.get(peerId);
    const channel = session?.channel;

    if (!pendingTransfer || !channel || channel.readyState !== "open") {
      return;
    }

    const { manifest, files } = pendingTransfer;
    let bytesSent = 0;
    const startedAt = Date.now();
    setTransferError(undefined);

    try {
      for (const [index, file] of files.entries()) {
        const metadata = manifest.files[index];

        if (!metadata) {
          continue;
        }

        channel.send(
          JSON.stringify({
            kind: "file-start",
            transferId,
            fileId: metadata.id
          } satisfies ControlMessage)
        );

        for await (const chunk of readFileChunks(file, DEFAULT_CHUNK_SIZE)) {
          await waitForDataChannelBackpressure(channel);
          channel.send(chunk);
          bytesSent += chunk.byteLength;
          setTransferProgress(
            createTransferProgress({
              direction: "sending",
              status: "transferring",
              transferId,
              fileName: metadata.name,
              bytesTransferred: bytesSent,
              totalBytes: manifest.totalBytes,
              completedFiles: index,
              totalFiles: manifest.files.length,
              startedAt
            })
          );
        }

        channel.send(
          JSON.stringify({
            kind: "file-complete",
            transferId,
            fileId: metadata.id
          } satisfies ControlMessage)
        );
      }

      channel.send(
        JSON.stringify({
          kind: "transfer-complete",
          transferId
        } satisfies ControlMessage)
      );
      setTransferProgress(
        createTransferProgress({
          direction: "sending",
          status: "completed",
          transferId,
          fileName: files[files.length - 1]?.name ?? "Transfer",
          bytesTransferred: manifest.totalBytes,
          totalBytes: manifest.totalBytes,
          completedFiles: manifest.files.length,
          totalFiles: manifest.files.length,
          startedAt
        })
      );
      pendingOutgoingTransfers.current.delete(transferId);
    } catch {
      setTransferError({
        title: "Transfer interrupted",
        detail: "The file stream stopped before completion. Keep both devices open and retry.",
        canRetry: true
      });
      setTransferProgress(
        createTransferProgress({
          direction: "sending",
          status: "failed",
          transferId,
          fileName: "Transfer failed",
          bytesTransferred: bytesSent,
          totalBytes: manifest.totalBytes,
          completedFiles: 0,
          totalFiles: manifest.files.length,
          startedAt
        })
      );
    }
  }, []);

  const startReceivingTransfer = useCallback((peerId: string, manifest: TransferManifest) => {
    const startedAt = Date.now();
    receivingTransfers.current.set(manifest.transferId, {
      peerId,
      manifest,
      startedAt,
      receivedBytes: 0,
      completedFiles: 0,
      files: []
    });
    setTransferProgress(
      createTransferProgress({
        direction: "receiving",
        status: "transferring",
        transferId: manifest.transferId,
        fileName: manifest.files[0]?.name ?? "Incoming files",
        bytesTransferred: 0,
        totalBytes: manifest.totalBytes,
        completedFiles: 0,
        totalFiles: manifest.files.length,
        startedAt
      })
    );
  }, []);

  const handleBinaryChunk = useCallback((peerId: string, chunk: ArrayBuffer) => {
    const receivingTransfer = [...receivingTransfers.current.values()].find(
      (transfer) => transfer.peerId === peerId && transfer.currentFile
    );

    if (!receivingTransfer?.currentFile) {
      return;
    }

    receivingTransfer.currentFile.chunks.push(chunk);
    receivingTransfer.currentFile.receivedBytes += chunk.byteLength;
    receivingTransfer.receivedBytes += chunk.byteLength;

    setTransferProgress(
      createTransferProgress({
        direction: "receiving",
        status: "transferring",
        transferId: receivingTransfer.manifest.transferId,
        fileName: receivingTransfer.currentFile.metadata.name,
        bytesTransferred: receivingTransfer.receivedBytes,
        totalBytes: receivingTransfer.manifest.totalBytes,
        completedFiles: receivingTransfer.completedFiles,
        totalFiles: receivingTransfer.manifest.files.length,
        startedAt: receivingTransfer.startedAt
      })
    );
  }, []);

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
      setTransferError(undefined);
      setOutgoingStatus((current) =>
        current?.transferId === message.transferId
          ? {
              ...current,
              status: "accepted"
            }
          : current
      );
      void sendTransferChunks(peerId, message.transferId);
    }

    if (message.kind === "transfer-rejected") {
      setTransferError({
        title: "Transfer Rejected",
        detail: "The receiver declined this transfer. You can try again with the same selection.",
        canRetry: true
      });
      setOutgoingStatus((current) =>
        current?.transferId === message.transferId
          ? {
              ...current,
              status: "rejected"
            }
          : current
      );
      pendingOutgoingTransfers.current.delete(message.transferId);
    }

    if (message.kind === "file-start") {
      const receivingTransfer = receivingTransfers.current.get(message.transferId);
      const metadata = receivingTransfer?.manifest.files.find((file) => file.id === message.fileId);

      if (!receivingTransfer || !metadata) {
        return;
      }

      receivingTransfer.currentFile = {
        metadata,
        chunks: [],
        receivedBytes: 0
      };
    }

    if (message.kind === "file-complete") {
      const receivingTransfer = receivingTransfers.current.get(message.transferId);

      if (!receivingTransfer?.currentFile) {
        return;
      }

      const receivedFile = createReceivedFileUrl(
        receivingTransfer.currentFile.metadata,
        receivingTransfer.currentFile.chunks
      );
      receivedFileUrls.current.push(receivedFile.url);
      receivingTransfer.files.push(receivedFile);
      receivingTransfer.completedFiles += 1;
      receivingTransfer.currentFile = undefined;
      setReceivedFiles((current) => [receivedFile, ...current]);
    }

    if (message.kind === "transfer-complete") {
      const receivingTransfer = receivingTransfers.current.get(message.transferId);

      if (!receivingTransfer) {
        return;
      }

      setTransferProgress(
        createTransferProgress({
          direction: "receiving",
          status: "completed",
          transferId: receivingTransfer.manifest.transferId,
          fileName: receivingTransfer.files[receivingTransfer.files.length - 1]?.name ?? "Transfer",
          bytesTransferred: receivingTransfer.manifest.totalBytes,
          totalBytes: receivingTransfer.manifest.totalBytes,
          completedFiles: receivingTransfer.manifest.files.length,
          totalFiles: receivingTransfer.manifest.files.length,
          startedAt: receivingTransfer.startedAt
        })
      );
      receivingTransfers.current.delete(message.transferId);
    }
  }, [handleBinaryChunk, sendTransferChunks]);

  const attachControlChannel = useCallback(
    (peerId: string, channel: RTCDataChannel): RTCDataChannel =>
      attachDataChannelHandlers(
        channel,
        () => {
          clearConnectionTimeout(peerId);
          setPeerStatus(peerId, "data-channel-open");
          setActivePeerId(peerId);
        },
        (message) => {
          if (typeof message === "string") {
            handleControlMessage(peerId, message);
            return;
          }

          handleBinaryChunk(peerId, message);
        },
        () => {
          failPeerTransfers(peerId, {
            title: "Peer connection closed",
            detail: "The browser data channel closed before the transfer finished.",
            canRetry: true
          });
          setPeerStatus(peerId, "disconnected");
        }
      ),
    [clearConnectionTimeout, failPeerTransfers, handleBinaryChunk, handleControlMessage, setPeerStatus]
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
            failPeerTransfers(peerId, {
              title: "Peer connection failed",
              detail: "The secure peer connection failed before the transfer completed.",
              canRetry: true
            });
          }

          if (state === "disconnected") {
            setPeerStatus(peerId, "disconnected");
            failPeerTransfers(peerId, {
              title: "Peer Disconnected",
              detail: "The other device disconnected before the transfer completed.",
              canRetry: true
            });
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
    [attachControlChannel, clearConnectionTimeout, failPeerTransfers, sendSignal, setPeerStatus]
  );

  const connectToPeer = useCallback(
    async (peer: Peer) => {
      if (!roomState.socket || roomState.status !== "connected") {
        return;
      }

      const existingSession = sessions.current.get(peer.peerId);

      if (existingSession?.channel?.readyState === "open") {
        clearConnectionTimeout(peer.peerId);
        setPeerStatus(peer.peerId, "data-channel-open");
        setActivePeerId(peer.peerId);
        return;
      }

      if (existingSession?.channel?.readyState === "connecting") {
        setPeerStatus(peer.peerId, "connecting");
        setActivePeerId(peer.peerId);
        startConnectionTimeout(peer.peerId);
        return;
      }

      if (
        existingSession &&
        (existingSession.connection.connectionState === "failed" ||
          existingSession.connection.connectionState === "closed" ||
          existingSession.connection.connectionState === "disconnected")
      ) {
        existingSession.channel?.close();
        existingSession.connection.close();
        sessions.current.delete(peer.peerId);
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
    async (peer: Peer, manifest: TransferManifest, files: File[]) => {
      const outgoingTransfer = {
        peer,
        peerId: peer.peerId,
        manifest,
        files
      };
      pendingOutgoingTransfers.current.set(manifest.transferId, outgoingTransfer);
      lastOutgoingTransfer.current = outgoingTransfer;
      setTransferError(undefined);

      setOutgoingStatus({
        peerId: peer.peerId,
        transferId: manifest.transferId,
        status: "pending"
      });

      await connectToPeer(peer);
      const session = createSession(peer.peerId);
      sendWhenChannelOpens(session, {
        kind: "transfer-manifest",
        manifest
      });
    },
    [connectToPeer, createSession]
  );

  const retryLastTransfer = useCallback(async () => {
    const transfer = lastOutgoingTransfer.current;

    if (!transfer) {
      return;
    }

    await sendTransferManifest(transfer.peer, transfer.manifest, transfer.files);
  }, [sendTransferManifest]);

  const acceptIncomingTransfer = useCallback(() => {
    if (!incomingOffer) {
      return;
    }

    const session = sessions.current.get(incomingOffer.peerId);
    startReceivingTransfer(incomingOffer.peerId, incomingOffer.manifest);
    sendWhenChannelOpens(session, {
      kind: "transfer-accepted",
      transferId: incomingOffer.manifest.transferId
    });
    setIncomingOffer(undefined);
  }, [incomingOffer, startReceivingTransfer]);

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

  const clearReceivedFiles = useCallback(() => {
    receivedFileUrls.current.forEach((url) => URL.revokeObjectURL(url));
    receivedFileUrls.current = [];
    setReceivedFiles([]);
  }, []);

  const clearTransferError = useCallback(() => {
    setTransferError(undefined);
  }, []);

  const clearTransferProgress = useCallback(() => {
    setTransferProgress(undefined);
    setOutgoingStatus(undefined);
  }, []);

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
        await flushRemoteIceCandidates(message.fromPeerId, session.connection);
        const answer = await createAnswer(session.connection);
        sendSignal(message.fromPeerId, {
          type: "answer",
          payload: answer
        });
      }

      if (message.type === "answer") {
        await session.connection.setRemoteDescription(message.payload as RTCSessionDescriptionInit);
        await flushRemoteIceCandidates(message.fromPeerId, session.connection);
      }

      if (message.type === "ice-candidate") {
        await addRemoteIceCandidate(
          message.fromPeerId,
          session.connection,
          message.payload as RTCIceCandidateInit
        );
      }
    };

    socket.on(SERVER_EVENTS.PEER_SIGNAL, handleSignal);

    return () => {
      socket.off(SERVER_EVENTS.PEER_SIGNAL, handleSignal);
    };
  }, [
    createSession,
    addRemoteIceCandidate,
    flushRemoteIceCandidates,
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
        failPeerTransfers(peerId, {
          title: "Peer Disconnected",
          detail: "The other device left the room before the transfer completed.",
          canRetry: true
        });
        session.channel?.close();
        session.connection.close();
        sessions.current.delete(peerId);
        pendingIceCandidates.current.delete(peerId);
        clearConnectionTimeout(peerId);
        setPeerStatus(peerId, "disconnected");
      }
    }
  }, [clearConnectionTimeout, failPeerTransfers, roomState.peers, setPeerStatus]);

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
      pendingIceCandidates.current.clear();
      receivedFileUrls.current.forEach((url) => URL.revokeObjectURL(url));
      receivedFileUrls.current = [];
    };
  }, []);

  return {
    statuses,
    activePeerId,
    incomingOffer,
    outgoingStatus,
    transferProgress,
    transferError,
    receivedFiles,
    clearReceivedFiles,
    clearTransferError,
    clearTransferProgress,
    connectToPeer,
    sendTransferManifest,
    retryLastTransfer,
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
      parsed.kind === "transfer-rejected" ||
      parsed.kind === "file-start" ||
      parsed.kind === "file-complete" ||
      parsed.kind === "transfer-complete"
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
