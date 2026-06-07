"use client";

import type { DeviceType } from "@oppassum/shared";
import { Download, Info, Radio } from "lucide-react";
import React from "react";

import { BrandMark } from "./BrandMark";
import { DevicePeerCard } from "./DevicePeerCard";
import { ProgressPanel } from "./ProgressPanel";
import { StatePreview } from "./StatePreview";
import { TransferDialog } from "./TransferDialog";
import { UploadTarget } from "./UploadTarget";
import { useFileTransfer } from "../hooks/useFileTransfer";
import { useWebRtcPeer, type PeerConnectionStatus } from "../hooks/useWebRtcPeer";
import { createFallbackRoomState, useSocketRoom, type SocketRoomState } from "../hooks/useSocketRoom";
import { formatBytes } from "../lib/files";

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
  const peerCount = currentRoom.peers.length;
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
                void peerConnection.sendTransferManifest(peer, fileTransfer.manifest);
                return;
              }

              void peerConnection.connectToPeer(peer);
            }}
          />
        ))}

        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <div className="rounded-full border border-dashed border-[#dfe4ef] bg-white/50 px-4 py-2 text-sm font-medium text-[#6b7280] shadow-[0_14px_40px_rgba(32,33,36,0.04)] md:hidden">
            {peerCount} nearby {peerCount === 1 ? "device" : "devices"}
          </div>

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
          </div>
        </div>

        <div className="mt-8 grid w-full max-w-[1120px] gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-3 sm:grid-cols-2">
            <ProgressPanel title="Sending portfolio.zip" detail="42 MB of 80 MB" value={52} />
            <ProgressPanel
              title="Received brand-kit"
              detail="Completed from Studio Laptop"
              value={100}
              tone="green"
            />
          </div>
          <TransferDialog
            manifest={peerConnection.incomingOffer?.manifest}
            senderName={getPeerName(currentRoom, peerConnection.incomingOffer?.peerId) ?? "Nearby device"}
            title={peerConnection.incomingOffer ? "Incoming files" : "Design assets"}
            statusText={getOutgoingStatusText(peerConnection.outgoingStatus)}
            onAccept={peerConnection.acceptIncomingTransfer}
            onReject={peerConnection.rejectIncomingTransfer}
          />
        </div>

        <div className="mt-5 w-full">
          <StatePreview />
        </div>

        <div className="sr-only" aria-live="polite">
          Drag-over state active. File selected. Sending progress. Receiving progress. Peer disconnected
          mid-transfer.
        </div>

        <a
          className="fixed bottom-5 right-5 z-30 hidden size-11 items-center justify-center rounded-full bg-[#5b82f6] text-white shadow-[0_16px_45px_rgba(91,130,246,0.35)] outline-none transition hover:bg-[#3658b6] focus-visible:ring-2 focus-visible:ring-[#5b82f6] focus-visible:ring-offset-4 sm:flex"
          href="#"
          aria-label="Download completed files"
        >
          <Download aria-hidden="true" className="size-5" />
        </a>
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
