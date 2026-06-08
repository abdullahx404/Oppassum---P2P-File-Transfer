"use client";

import type { DeviceType } from "@oppassum/shared";
import { AlertTriangle, Info, Radio, RotateCcw } from "lucide-react";
import React from "react";

import { BrandMark } from "./BrandMark";
import { DevicePeerCard } from "./DevicePeerCard";
import { ProgressPanel } from "./ProgressPanel";
import { TransferDialog } from "./TransferDialog";
import { UploadTarget } from "./UploadTarget";
import { useFileTransfer } from "../hooks/useFileTransfer";
import { useWebRtcPeer, type PeerConnectionStatus } from "../hooks/useWebRtcPeer";
import { createFallbackRoomState, useSocketRoom, type SocketRoomState } from "../hooks/useSocketRoom";
import { getTransferPercent } from "../lib/chunked-transfer";
import { formatBytes } from "../lib/files";
import {
  getBrowserSupportState,
  getLargeTransferWarning,
  getProgressDetail
} from "../lib/transfer-health";

type TransferSurfaceProps = {
  roomState?: SocketRoomState;
};

const peerPositions = [
  "left-[22%] top-[36%]",
  "left-[78%] top-[38%]",
  "left-[31%] top-[55%]",
  "left-[69%] top-[55%]"
] as const;

export function TransferSurface({ roomState }: TransferSurfaceProps) {
  const liveRoomState = useSocketRoom({ enabled: !roomState });
  const currentRoom = roomState ?? liveRoomState;
  const peerConnection = useWebRtcPeer(currentRoom);
  const fileTransfer = useFileTransfer();
  const browserSupport = getBrowserSupportState();
  const largeTransferWarning = fileTransfer.manifest
    ? getLargeTransferWarning(fileTransfer.manifest.totalBytes)
    : undefined;
  const roomStatusText = getRoomStatusText(currentRoom);
  const connectionStatusText = getConnectionStatusText(
    peerConnection.activePeerId,
    peerConnection.statuses
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfbfc] text-[#202124]">
      <div className="radar-rings" aria-hidden="true" />

      <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <BrandMark />
        <button
          className="flex size-10 items-center justify-center rounded-full bg-white/70 text-[#3c4043] outline-none ring-1 ring-[#eef0f4] transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#5b82f6]"
          type="button"
          aria-label="Information"
        >
          <Info aria-hidden="true" className="size-6" />
        </button>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-[1440px] flex-col items-center px-5 pb-8 pt-8 sm:px-8 md:pt-16">
        {currentRoom.peers.slice(0, peerPositions.length).map((peer, index) => (
          <DevicePeerCard
            key={peer.peerId}
            name={peer.displayName}
            status={getPeerStatusLabel(peerConnection.statuses[peer.peerId])}
            kind={toDeviceKind(peer.deviceType)}
            positionClassName={peerPositions[index] ?? peerPositions[0]}
            isSelected={peerConnection.activePeerId === peer.peerId}
            onSelect={() => {
              if (fileTransfer.manifest) {
                void peerConnection.sendTransferManifest(peer, fileTransfer.manifest, fileTransfer.files);
                return;
              }

              void peerConnection.connectToPeer(peer);
            }}
          />
        ))}

        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <UploadTarget
            selectedCount={fileTransfer.files.length}
            isDragActive={fileTransfer.isDragActive}
            onFilesSelected={fileTransfer.selectFiles}
            onDragActiveChange={fileTransfer.setDragActive}
          />

          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <span className="flex size-20 items-center justify-center rounded-full text-[#5b82f6] ring-1 ring-[#eef0f4]">
              <Radio aria-hidden="true" className="size-12" strokeWidth={2.4} />
            </span>
            <p className="max-w-sm text-base font-medium text-[#3c4043]">
              The easiest way to transfer data across devices
            </p>
            <p className="text-sm font-medium text-[#5b82f6]">{roomStatusText}</p>
            <p
              className="min-h-5 text-sm font-semibold text-[#2f9e44]"
              aria-live="polite"
              data-testid="webrtc-connection-status"
            >
              {connectionStatusText}
            </p>
            {!browserSupport.isSupported && browserSupport.message ? (
              <StatusNotice
                title="Browser limited"
                detail={browserSupport.message}
                tone="warning"
              />
            ) : null}
            {largeTransferWarning ? (
              <StatusNotice title="Large transfer" detail={largeTransferWarning} tone="warning" />
            ) : null}
            {peerConnection.transferError ? (
              <StatusNotice
                title={peerConnection.transferError.title}
                detail={peerConnection.transferError.detail}
                tone="error"
                action={
                  peerConnection.transferError.canRetry ? (
                    <button
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#5b82f6] px-3 text-sm font-semibold text-white outline-none transition hover:bg-[#3658b6] focus-visible:ring-2 focus-visible:ring-[#5b82f6] focus-visible:ring-offset-2"
                      type="button"
                      onClick={() => {
                        void peerConnection.retryLastTransfer();
                      }}
                    >
                      <RotateCcw aria-hidden="true" className="size-4" />
                      Retry
                    </button>
                  ) : undefined
                }
              />
            ) : null}
            {fileTransfer.manifest ? (
              <div
                className="rounded-lg bg-white/90 px-4 py-3 text-sm shadow-[0_14px_36px_rgba(32,33,36,0.07)] ring-1 ring-[#eef0f4]"
                aria-label="Selected file manifest"
              >
                <p className="font-semibold text-[#202124]">
                  {fileTransfer.manifest.files.length}{" "}
                  {fileTransfer.manifest.files.length === 1 ? "file" : "files"} selected
                </p>
                <p className="mt-1 text-[#6b7280]">
                  {formatBytes(fileTransfer.manifest.totalBytes)} ready for manifest approval
                </p>
                <button
                  className="mt-2 text-sm font-semibold text-[#5b82f6] outline-none focus-visible:ring-2 focus-visible:ring-[#5b82f6]"
                  type="button"
                  onClick={fileTransfer.clearFiles}
                >
                  Clear selection
                </button>
              </div>
            ) : null}
            {currentRoom.peers.length > 0 ? (
              <div className="grid w-full max-w-sm gap-2 md:hidden" aria-label="Nearby devices">
                {currentRoom.peers.map((peer) => (
                  <button
                    key={peer.peerId}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-white/94 px-4 text-left text-sm font-semibold text-[#202124] shadow-[0_14px_36px_rgba(32,33,36,0.07)] ring-1 ring-[#eef0f4] outline-none transition active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#5b82f6]"
                    type="button"
                    aria-label={`${peer.displayName}, ${getPeerStatusLabel(peerConnection.statuses[peer.peerId])}`}
                    onClick={() => {
                      if (fileTransfer.manifest) {
                        void peerConnection.sendTransferManifest(peer, fileTransfer.manifest, fileTransfer.files);
                        return;
                      }

                      void peerConnection.connectToPeer(peer);
                    }}
                  >
                    <span className="truncate">{peer.displayName}</span>
                    <span className="shrink-0 text-xs font-medium text-[#6b7280]">
                      {getPeerStatusLabel(peerConnection.statuses[peer.peerId])}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {peerConnection.transferProgress ||
        peerConnection.incomingOffer ||
        peerConnection.outgoingStatus ? (
          <div className="mt-8 grid w-full max-w-[1120px] gap-4 lg:grid-cols-[1fr_360px]">
            {peerConnection.transferProgress ? (
              <ProgressPanel
                title={getProgressTitle(peerConnection.transferProgress)}
                detail={getProgressDetail(peerConnection.transferProgress)}
                value={getTransferPercent(peerConnection.transferProgress)}
                tone={peerConnection.transferProgress.direction === "receiving" ? "green" : "blue"}
              />
            ) : null}
            {peerConnection.incomingOffer || peerConnection.outgoingStatus ? (
              <TransferDialog
                manifest={peerConnection.incomingOffer?.manifest}
                senderName={
                  getPeerName(currentRoom, peerConnection.incomingOffer?.peerId) ?? "Nearby device"
                }
                title={peerConnection.incomingOffer ? "Incoming files" : "Transfer request"}
                statusText={getOutgoingStatusText(peerConnection.outgoingStatus)}
                onAccept={peerConnection.acceptIncomingTransfer}
                onReject={peerConnection.rejectIncomingTransfer}
              />
            ) : null}
          </div>
        ) : null}

        {peerConnection.receivedFiles.length > 0 ? (
          <section
            id="received-files"
            className="mt-5 w-full max-w-[1120px] rounded-lg bg-white/94 p-4 shadow-[0_18px_48px_rgba(32,33,36,0.08)] ring-1 ring-[#eef0f4]"
            aria-label="Received files"
          >
            <p className="text-sm font-semibold text-[#202124]">Received files</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {peerConnection.receivedFiles.map((file) => (
                <a
                  key={`${file.id}-${file.url}`}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-[#f8fafc] px-3 py-2 text-sm font-medium text-[#3c4043] outline-none ring-1 ring-[#eef0f4] transition hover:bg-[#f2f5ff] focus-visible:ring-2 focus-visible:ring-[#5b82f6]"
                  href={file.url}
                  download={file.relativePath ?? file.name}
                >
                  <span className="truncate">{file.relativePath ?? file.name}</span>
                  <span className="shrink-0 text-xs text-[#6b7280]">{formatBytes(file.size)}</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <div className="sr-only" aria-live="polite">
          Drag-over state active. File selected. Sending progress. Receiving progress. Peer disconnected
          mid-transfer.
        </div>
      </section>
    </main>
  );
}

function getPeerName(roomState: SocketRoomState, peerId: string | undefined): string | undefined {
  if (!peerId) {
    return undefined;
  }

  return roomState.peers.find((peer) => peer.peerId === peerId)?.displayName;
}

function getOutgoingStatusText(
  status: { status: "pending" | "accepted" | "rejected" } | undefined
): string | undefined {
  if (!status) {
    return undefined;
  }

  if (status.status === "accepted") {
    return "Transfer manifest accepted";
  }

  if (status.status === "rejected") {
    return "Transfer manifest rejected";
  }

  return "Waiting for receiver approval";
}

function getProgressTitle(progress: {
  direction: "sending" | "receiving";
  status: "transferring" | "completed" | "failed";
  fileName: string;
}): string {
  if (progress.status === "completed") {
    return progress.direction === "sending" ? "Sent files" : "Received files";
  }

  if (progress.status === "failed") {
    return "Transfer failed";
  }

  return `${progress.direction === "sending" ? "Sending" : "Receiving"} ${progress.fileName}`;
}

function getPeerStatusLabel(status: PeerConnectionStatus | undefined): string {
  if (status === "connecting") {
    return "Connecting";
  }

  if (status === "data-channel-open") {
    return "Data channel open";
  }

  if (status === "failed") {
    return "Connection failed";
  }

  if (status === "disconnected") {
    return "Disconnected";
  }

  return "Ready";
}

function getConnectionStatusText(
  activePeerId: string | undefined,
  statuses: Record<string, PeerConnectionStatus>
): string {
  if (!activePeerId) {
    return "";
  }

  const status = statuses[activePeerId];

  if (status === "connecting") {
    return "Creating secure peer connection...";
  }

  if (status === "data-channel-open") {
    return "Data channel open";
  }

  if (status === "failed") {
    return "Peer connection failed";
  }

  if (status === "disconnected") {
    return "Peer disconnected";
  }

  return "";
}

function getRoomStatusText(roomState: SocketRoomState): string {
  if (roomState.status === "connecting") {
    return "Connecting to nearby devices...";
  }

  if (roomState.status === "error") {
    return roomState.errorMessage ?? "Could not connect to the signaling server.";
  }

  if (roomState.status === "disconnected") {
    return "Disconnected from the signaling server.";
  }

  if (roomState.peers.length === 0) {
    return "No devices connected yet";
  }

  return `${roomState.peers.length} ${roomState.peers.length === 1 ? "device" : "devices"} connected`;
}

function toDeviceKind(deviceType: DeviceType): "laptop" | "desktop" | "phone" | "tablet" | "unknown" {
  return deviceType;
}

export const previewRoomState = createFallbackRoomState({
  peers: [
    { peerId: "peer-studio-laptop", displayName: "Studio Laptop", deviceType: "laptop" },
    { peerId: "peer-amina-phone", displayName: "Amina Phone", deviceType: "phone" },
    { peerId: "peer-desk-monitor", displayName: "Desk Monitor", deviceType: "desktop" },
    { peerId: "peer-tablet", displayName: "Tablet", deviceType: "tablet" }
  ]
});

function StatusNotice({
  title,
  detail,
  tone,
  action
}: {
  title: string;
  detail: string;
  tone: "warning" | "error";
  action?: React.ReactNode;
}) {
  const color = tone === "error" ? "#c92a2a" : "#b7791f";

  return (
    <section
      className="w-full max-w-md rounded-lg bg-white/94 px-4 py-3 text-left shadow-[0_14px_36px_rgba(32,33,36,0.08)] ring-1 ring-[#eef0f4]"
      aria-label={title}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" style={{ color }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#202124]">{title}</p>
          <p className="mt-1 text-sm text-[#6b7280]">{detail}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}
