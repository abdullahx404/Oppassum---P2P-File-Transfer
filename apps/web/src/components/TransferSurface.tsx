"use client";

import type { DeviceType, Peer } from "@oppassum/shared";
import {
  AlertTriangle,
  Download,
  HelpCircle,
  Info,
  Laptop,
  Monitor,
  RotateCcw,
  Smartphone,
  Tablet,
  X
} from "lucide-react";
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
import { formatBytes, getTransferSelectionLabel } from "../lib/files";
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

const mobileDeviceIcons = {
  laptop: Laptop,
  desktop: Monitor,
  phone: Smartphone,
  tablet: Tablet,
  unknown: HelpCircle
} satisfies Record<ReturnType<typeof toDeviceKind>, typeof Laptop>;

export function TransferSurface({ roomState }: TransferSurfaceProps) {
  const liveRoomState = useSocketRoom({ enabled: !roomState });
  const currentRoom = roomState ?? liveRoomState;
  const peerConnection = useWebRtcPeer(currentRoom);
  const fileTransfer = useFileTransfer();
  const [isInfoOpen, setInfoOpen] = React.useState(false);
  const [deviceNameDraft, setDeviceNameDraft] = React.useState(currentRoom.self.displayName);
  const [selectionPrompt, setSelectionPrompt] = React.useState<string | undefined>();
  const browserSupport = getBrowserSupportState();
  const largeTransferWarning = fileTransfer.manifest
    ? getLargeTransferWarning(fileTransfer.manifest.totalBytes)
    : undefined;
  const roomStatusText = getRoomStatusText(currentRoom);
  const connectionStatusText = getConnectionStatusText(
    peerConnection.activePeerId,
    peerConnection.statuses
  );
  const incomingSenderName = getPeerName(currentRoom, peerConnection.incomingOffer?.peerId) ?? "Nearby device";

  React.useEffect(() => {
    setDeviceNameDraft(currentRoom.self.displayName);
  }, [currentRoom.self.displayName]);

  const saveDeviceName = React.useCallback(() => {
    currentRoom.updateDeviceName?.(deviceNameDraft);
  }, [currentRoom, deviceNameDraft]);

  const handlePeerSelect = React.useCallback(
    (peer: Peer) => {
      if (!fileTransfer.manifest) {
        setSelectionPrompt("Select files or a folder first, then choose a device to send.");
        return;
      }

      setSelectionPrompt(undefined);
      void peerConnection.sendTransferManifest(peer, fileTransfer.manifest, fileTransfer.files);
    },
    [fileTransfer.files, fileTransfer.manifest, peerConnection]
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfbfc] text-[#202124]">
      <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <BrandMark />
        <div className="relative">
          <button
            className="flex size-10 items-center justify-center rounded-full bg-white/70 text-[#3c4043] outline-none ring-1 ring-[#ffe0cf] transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
            type="button"
            aria-label="Information"
            aria-expanded={isInfoOpen}
            onClick={() => setInfoOpen((current) => !current)}
            onMouseEnter={() => setInfoOpen(true)}
          >
            <Info aria-hidden="true" className="size-6" />
          </button>
          {isInfoOpen ? (
            <>
              <button
                className="fixed inset-0 z-30 cursor-default bg-transparent"
                type="button"
                aria-label="Close information"
                onClick={() => setInfoOpen(false)}
              />
              <section
                className="absolute right-0 top-12 z-40 w-[min(90vw,320px)] rounded-lg bg-white p-4 text-sm shadow-[0_24px_70px_rgba(32,33,36,0.16)] ring-1 ring-[#e4e8f0]"
                aria-label="How to use Oppassum"
                onMouseLeave={() => setInfoOpen(false)}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-[#202124]">How to use</p>
                  <button
                    className="flex size-7 items-center justify-center rounded-full text-[#6b7280] outline-none hover:bg-[#f6f7f9] focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
                    type="button"
                    aria-label="Close"
                    onClick={() => setInfoOpen(false)}
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>
                <ol className="mt-3 space-y-2 text-[#5f6673]">
                  <li>1. Open this page on both devices.</li>
                  <li>2. Select files or a folder.</li>
                  <li>3. Click Send on the receiving device.</li>
                  <li>4. Accept the request on the other device.</li>
                  <li>5. Download each received file.</li>
                  <li>6. Keep both devices awake. Do not close this website, lock your phone, or turn off the screen while transferring.</li>
                </ol>
                <label className="mt-4 block text-xs font-semibold text-[#3c4043]">
                  This device name
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[#ffd6c2] px-3 text-sm font-medium outline-none focus:border-[#ff7a1a] focus:ring-2 focus:ring-[#ff7a1a]/20"
                    value={deviceNameDraft}
                    onChange={(event) => setDeviceNameDraft(event.currentTarget.value)}
                    onBlur={saveDeviceName}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        saveDeviceName();
                        setInfoOpen(false);
                      }
                    }}
                  />
                </label>
              </section>
            </>
          ) : null}
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-[1440px] flex-col items-center px-5 pb-6 pt-2 sm:px-8 md:pt-8">
        {currentRoom.peers.slice(0, peerPositions.length).map((peer, index) => (
          <DevicePeerCard
            key={peer.peerId}
            name={peer.displayName}
            status={getPeerStatusLabel(peerConnection.statuses[peer.peerId])}
            kind={toDeviceKind(peer.deviceType)}
            positionClassName={peerPositions[index] ?? peerPositions[0]}
            canSend={Boolean(fileTransfer.manifest)}
            isSelected={peerConnection.activePeerId === peer.peerId}
            onSelect={() => handlePeerSelect(peer)}
          />
        ))}

        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <UploadTarget
            selectedCount={fileTransfer.files.length}
            isDragActive={fileTransfer.isDragActive}
            onFilesSelected={(files) => {
              setSelectionPrompt(undefined);
              fileTransfer.selectFiles(files);
            }}
            onDragActiveChange={fileTransfer.setDragActive}
          />

          <div className="mt-8 flex flex-col items-center gap-2 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-white text-[#ff5b38] shadow-[0_14px_40px_rgba(255,91,56,0.12)] ring-1 ring-[#ffe0cf]">
              <img src="/oppassum-logo.png" alt="" aria-hidden="true" className="size-12 object-contain" />
            </span>
            <p className="max-w-sm text-base font-medium text-[#3c4043]">
              The easiest way to transfer data across devices
            </p>
            <p className="text-sm font-medium text-[#ff5b38]">{roomStatusText}</p>
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
            {selectionPrompt ? (
              <StatusNotice title="Select files first" detail={selectionPrompt} tone="warning" />
            ) : null}
            {peerConnection.transferError ? (
              <StatusNotice
                title={peerConnection.transferError.title}
                detail={peerConnection.transferError.detail}
                tone="error"
                action={
                  peerConnection.transferError.canRetry ? (
                    <button
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#f2055c,#ff7a1a,#ffb000)] px-3 text-sm font-semibold text-white outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-2"
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
                className="relative z-20 w-full max-w-xl rounded-lg bg-white/96 px-4 py-3 text-sm shadow-[0_14px_36px_rgba(32,33,36,0.07)] ring-1 ring-[#eef0f4]"
                aria-label="Selected file manifest"
              >
                <p className="font-semibold text-[#202124]">
                  {getTransferSelectionLabel(fileTransfer.manifest)}
                </p>
                <p className="mt-1 text-[#6b7280]">
                  {formatBytes(fileTransfer.manifest.totalBytes)} ready to share. Click Send on a
                  device to share with.
                </p>
                <button
                  className="mt-2 text-sm font-semibold text-[#ff5b38] outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
                  type="button"
                  onClick={fileTransfer.clearFiles}
                >
                  Clear selection
                </button>
              </div>
            ) : null}
            {currentRoom.peers.length > 0 ? (
              <div className="relative z-20 grid w-full max-w-xl justify-items-center gap-2 md:hidden" aria-label="Nearby devices">
                {currentRoom.peers.map((peer) => (
                  <MobilePeerButton
                    key={peer.peerId}
                    peer={peer}
                    status={getPeerStatusLabel(peerConnection.statuses[peer.peerId])}
                    canSend={Boolean(fileTransfer.manifest)}
                    onSelect={() => handlePeerSelect(peer)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {peerConnection.transferProgress || peerConnection.outgoingStatus ? (
          <div className="relative z-20 mt-6 grid w-full max-w-xl gap-4">
            {peerConnection.transferProgress ? (
              <ProgressPanel
                title={getProgressTitle(peerConnection.transferProgress)}
                detail={getProgressDetail(peerConnection.transferProgress)}
                value={getTransferPercent(peerConnection.transferProgress)}
                tone={peerConnection.transferProgress.direction === "receiving" ? "green" : "blue"}
              />
            ) : null}
            {peerConnection.outgoingStatus ? (
              <TransferDialog
                title="Transfer request"
                statusText={getOutgoingStatusText(peerConnection.outgoingStatus)}
              />
            ) : null}
          </div>
        ) : null}

        {peerConnection.receivedFiles.length > 0 ? (
          <section
            id="received-files"
            className="relative z-20 mt-5 w-full max-w-[1120px] rounded-lg bg-white/96 p-4 shadow-[0_18px_48px_rgba(32,33,36,0.08)] ring-1 ring-[#eef0f4]"
            aria-label="Received files"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#202124]">Received files</p>
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#f6f7f9] px-3 text-sm font-semibold text-[#3c4043] outline-none transition hover:bg-[#eceff3] focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
                type="button"
                onClick={peerConnection.clearReceivedFiles}
              >
                Clear downloads
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              {peerConnection.receivedFiles.map((file) => (
                <a
                  key={`${file.id}-${file.url}`}
                  className="grid min-w-0 gap-3 rounded-lg bg-[#fffaf7] px-3 py-3 text-sm font-medium text-[#3c4043] outline-none ring-1 ring-[#ffe0cf] transition hover:bg-[#fff4ed] focus-visible:ring-2 focus-visible:ring-[#ff7a1a] sm:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)] sm:items-stretch"
                  href={file.url}
                  download={file.relativePath ?? file.name}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{file.relativePath ?? file.name}</span>
                    <span className="block text-xs text-[#6b7280]">
                      {formatBytes(file.size)} - Received {formatReceivedTime(file.receivedAt)}
                    </span>
                  </span>
                  <span className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#f2055c,#ff7a1a,#ffb000)] px-5 py-2 text-xs font-semibold text-white">
                    <Download aria-hidden="true" className="size-4" />
                    Download
                  </span>
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

      {peerConnection.incomingOffer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202124]/20 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl">
            <TransferDialog
              manifest={peerConnection.incomingOffer.manifest}
              senderName={incomingSenderName}
              title="Incoming files"
              onAccept={peerConnection.acceptIncomingTransfer}
              onReject={peerConnection.rejectIncomingTransfer}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function MobilePeerButton({
  peer,
  status,
  canSend,
  onSelect
}: {
  peer: Peer;
  status: string;
  canSend: boolean;
  onSelect: () => void;
}) {
  const DeviceIcon = mobileDeviceIcons[toDeviceKind(peer.deviceType)];

  return (
    <button
      className="flex min-h-20 w-full items-center justify-between gap-3 rounded-lg bg-white/96 px-4 py-3 text-left text-sm font-semibold text-[#202124] shadow-[0_18px_44px_rgba(255,91,56,0.12)] ring-1 ring-[#ffd6c2] outline-none transition active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
      type="button"
      aria-label={`${peer.displayName}, ${status}${canSend ? ", Send" : ""}`}
      onClick={onSelect}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f2055c,#ff7a1a,#ffb000)] text-white shadow-[0_10px_24px_rgba(255,91,56,0.2)]">
          <DeviceIcon aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base">{peer.displayName}</span>
          <span className="block truncate text-xs font-medium text-[#6b7280]">{status}</span>
        </span>
      </span>
      {canSend ? (
        <span className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f2055c,#ff7a1a,#ffb000)] px-3 text-xs font-semibold text-white">
          Send
        </span>
      ) : null}
    </button>
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

function formatReceivedTime(receivedAt: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(receivedAt);
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
      className="relative z-20 w-full max-w-xl rounded-lg bg-white/96 px-4 py-3 text-left shadow-[0_14px_36px_rgba(32,33,36,0.08)] ring-1 ring-[#eef0f4]"
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
