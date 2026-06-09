"use client";

import type { DeviceType, Peer } from "@oppassum/shared";
import {
  AlertTriangle,
  Download,
  HelpCircle,
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
import { getTransferPercent, type ReceivedTransferFile } from "../lib/chunked-transfer";
import { formatBytes, getTransferDisplayName, getTransferSelectionLabel } from "../lib/files";
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

function HeaderSunIcon() {
  return (
    <svg aria-hidden="true" className="header-control-icon size-5" fill="none" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="header-sun-gradient" x1="3" x2="21" y1="3" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f2055c" />
          <stop offset="0.56" stopColor="#ff5b38" />
          <stop offset="1" stopColor="#ffb000" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="4" stroke="url(#header-sun-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      <path d="M12 2v2" stroke="url(#header-sun-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      <path d="M12 20v2" stroke="url(#header-sun-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      <path d="m4.93 4.93 1.41 1.41" stroke="url(#header-sun-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      <path d="m17.66 17.66 1.41 1.41" stroke="url(#header-sun-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      <path d="M2 12h2" stroke="url(#header-sun-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      <path d="M20 12h2" stroke="url(#header-sun-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      <path d="m6.34 17.66-1.41 1.41" stroke="url(#header-sun-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      <path d="m19.07 4.93-1.41 1.41" stroke="url(#header-sun-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </svg>
  );
}

function HeaderMoonIcon() {
  return (
    <svg aria-hidden="true" className="header-control-icon size-5" fill="none" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="header-moon-gradient" x1="4" x2="20" y1="3" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f2055c" />
          <stop offset="0.56" stopColor="#ff5b38" />
          <stop offset="1" stopColor="#ffb000" />
        </linearGradient>
      </defs>
      <path
        d="M20.9 14.4A8.5 8.5 0 0 1 9.6 3.1 8.7 8.7 0 1 0 20.9 14.4Z"
        stroke="url(#header-moon-gradient)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function HeaderInfoIcon() {
  return (
    <svg aria-hidden="true" className="header-control-icon size-6" fill="none" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="header-info-gradient" x1="3" x2="21" y1="3" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f2055c" />
          <stop offset="0.56" stopColor="#ff5b38" />
          <stop offset="1" stopColor="#ffb000" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9" stroke="url(#header-info-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
      <path d="M12 11v5" stroke="url(#header-info-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
      <path d="M12 8h.01" stroke="url(#header-info-gradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  );
}

const mobileDeviceIcons = {
  laptop: Laptop,
  desktop: Monitor,
  phone: Smartphone,
  tablet: Tablet,
  unknown: HelpCircle
} satisfies Record<ReturnType<typeof toDeviceKind>, typeof Laptop>;

const socialLinks = [
  {
    label: "GitHub",
    href: "https://github.com/abdullahx404/Oppassum---P2P-File-Transfer",
    icon: "/github-logo.png"
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/abdullah.wtf/",
    icon: "/insta-logo.webp"
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/abdullahzia-linked",
    icon: "/linkedin-logo.webp"
  }
] as const;

export function TransferSurface({ roomState }: TransferSurfaceProps) {
  const liveRoomState = useSocketRoom({ enabled: !roomState });
  const currentRoom = roomState ?? liveRoomState;
  const peerConnection = useWebRtcPeer(currentRoom);
  const fileTransfer = useFileTransfer();
  const [isInfoOpen, setInfoOpen] = React.useState(false);
  const [isInfoClosing, setInfoClosing] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [deviceNameDraft, setDeviceNameDraft] = React.useState(currentRoom.self.displayName);
  const [selectionPrompt, setSelectionPrompt] = React.useState<string | undefined>();
  const [selectionPromptShakeKey, setSelectionPromptShakeKey] = React.useState(0);
  const [showWakeNotice, setShowWakeNotice] = React.useState(false);
  const [isWakeNoticeLong, setWakeNoticeLong] = React.useState(false);
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
    const savedTheme = window.localStorage.getItem("oppassum.theme");

    if (savedTheme === "dark") {
      setTheme("dark");
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem("oppassum.theme", theme);
  }, [theme]);

  React.useEffect(() => {
    setDeviceNameDraft(currentRoom.self.displayName);
  }, [currentRoom.self.displayName]);

  React.useEffect(() => {
    if (roomState || currentRoom.status === "connected") {
      setShowWakeNotice(false);
      setWakeNoticeLong(false);
      return undefined;
    }

    const wakeTimer = window.setTimeout(() => setShowWakeNotice(true), 5_000);
    const longTimer = window.setTimeout(() => {
      setShowWakeNotice(true);
      setWakeNoticeLong(true);
    }, 45_000);

    return () => {
      window.clearTimeout(wakeTimer);
      window.clearTimeout(longTimer);
    };
  }, [currentRoom.status, roomState]);

  const saveDeviceName = React.useCallback(() => {
    currentRoom.updateDeviceName?.(deviceNameDraft);
  }, [currentRoom, deviceNameDraft]);

  const toggleTheme = React.useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const openInfo = React.useCallback(() => {
    setInfoClosing(false);
    setInfoOpen(true);
  }, []);

  const closeInfo = React.useCallback(() => {
    setInfoClosing(true);
    window.setTimeout(() => {
      setInfoOpen(false);
      setInfoClosing(false);
    }, 1000);
  }, []);

  const handlePeerSelect = React.useCallback(
    (peer: Peer) => {
      if (!fileTransfer.manifest) {
        setSelectionPrompt("Select files or a folder first, then choose a device to send.");
        setSelectionPromptShakeKey((current) => current + 1);
        return;
      }

      setSelectionPrompt(undefined);
      void peerConnection.sendTransferManifest(peer, fileTransfer.manifest, fileTransfer.files);
    },
    [fileTransfer.files, fileTransfer.manifest, peerConnection]
  );

  return (
    <main className={`relative min-h-screen overflow-hidden bg-[#fbfbfc] text-[#202124] ${theme === "dark" ? "theme-dark" : ""}`}>
      <header
        className={`relative flex items-center justify-between gap-4 px-5 py-5 sm:px-8 ${
          isInfoOpen ? "z-[60]" : "z-20"
        }`}
      >
        <div className={isInfoOpen ? "pointer-events-none opacity-0" : ""}>
          <BrandMark />
        </div>
        <div className="relative flex items-center gap-3">
          {!isInfoOpen ? (
            <button
              className="header-control flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#ffffff]/70 text-[#3c4043] shadow-[0_8px_24px_rgba(32,33,36,0.08)] ring-1 ring-[#ffe0cf] outline-none transition focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
              type="button"
              aria-label={theme === "dark" ? "Switch To Light Theme" : "Switch To Dark Theme"}
              aria-pressed={theme === "dark"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <HeaderMoonIcon />
              ) : (
                <HeaderSunIcon />
              )}
            </button>
          ) : null}
          <button
            className={`flex size-10 cursor-pointer items-center justify-center rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-[#ff7a1a] ${
              isInfoOpen
                ? "fixed right-5 top-5 z-[60] bg-transparent text-white hover:bg-[rgba(255,255,255,0.14)] hover:ring-1 hover:ring-white/35 sm:right-8"
                : "header-control bg-[#ffffff]/70 text-[#3c4043] ring-1 ring-[#ffe0cf]"
            }`}
            type="button"
            aria-label={isInfoOpen ? "Close information" : "Information"}
            aria-expanded={isInfoOpen}
            onClick={isInfoOpen ? closeInfo : openInfo}
          >
            {isInfoOpen ? (
              <X aria-hidden="true" className="info-close-icon size-5" />
            ) : (
              <HeaderInfoIcon />
            )}
          </button>
          {isInfoOpen ? (
            <InfoOverlay
              deviceNameDraft={deviceNameDraft}
              isClosing={isInfoClosing}
              onDeviceNameChange={setDeviceNameDraft}
              onSaveDeviceName={saveDeviceName}
            />
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
            <span className="flex size-16 items-center justify-center rounded-full bg-white text-[#ff5b38] shadow-[0_14px_40px_rgba(255,91,56,0.12)] ring-1 ring-[#ffe0cf] transition duration-200 hover:-translate-y-1 hover:scale-110">
              <img
                src="/oppassum-logo.png"
                alt=""
                aria-hidden="true"
                className="size-12 object-contain"
              />
            </span>
            <p className="max-w-sm text-center text-base font-medium text-[#3c4043] md:max-w-none md:whitespace-nowrap md:text-lg">
              The Simpliest Peer to Peer Data Transfer Across Devices
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
                title="Browser Limited"
                detail={browserSupport.message}
                tone="warning"
              />
            ) : null}
            {showWakeNotice ? (
              <StatusNotice
                title={
                  isWakeNoticeLong
                    ? "Connection Is Taking Longer Than Expected"
                    : "Secure Connection Is Waking Up"
                }
                detail={
                  isWakeNoticeLong
                    ? "Please retry while we keep reconnecting in the background."
                    : "This can take up to 45 seconds."
                }
                tone="warning"
                action={
                  isWakeNoticeLong ? (
                    <button
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#f2055c,#ff7a1a,#ffb000)] px-3 text-sm font-semibold text-white outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-2"
                      type="button"
                      onClick={currentRoom.reconnect}
                    >
                      <RotateCcw aria-hidden="true" className="size-4" />
                      Retry
                    </button>
                  ) : undefined
                }
              />
            ) : null}
            {largeTransferWarning ? (
              <StatusNotice title="Large Transfer" detail={largeTransferWarning} tone="warning" />
            ) : null}
            {selectionPrompt ? (
              <StatusNotice
                key={selectionPromptShakeKey}
                title="Select Files First"
                detail={selectionPrompt}
                tone="warning"
                onDismiss={() => setSelectionPrompt(undefined)}
                isAttention
              />
            ) : null}
            {fileTransfer.pendingFolderSelection ? (
              <div
                className="relative z-20 w-full max-w-xl rounded-lg bg-white/96 px-4 py-3 text-sm shadow-[0_14px_36px_rgba(32,33,36,0.07)] ring-1 ring-[#eef0f4]"
                aria-label="Folder upload options"
              >
                <p className="font-semibold text-[#202124]">
                  {fileTransfer.pendingFolderSelection.folderRoots.length}{" "}
                  {fileTransfer.pendingFolderSelection.folderRoots.length === 1 ? "Folder" : "Folders"} Selected
                </p>
                <p className="mt-1 text-[#6b7280]">
                  {formatBytes(fileTransfer.pendingFolderSelection.totalBytes)} ready. Upload as one ZIP
                  file or as separate files.
                </p>
                {fileTransfer.folderSelectionError ? (
                  <p className="mt-2 text-xs font-semibold text-[#c92a2a]">
                    {fileTransfer.folderSelectionError}
                  </p>
                ) : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f2055c,#ff7a1a,#ffb000)] px-3 text-sm font-semibold text-white outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
                    type="button"
                    disabled={fileTransfer.isPreparingFolder}
                    onClick={() => {
                      void fileTransfer.confirmFolderSelection("zip");
                    }}
                  >
                    Upload as ZIP
                  </button>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#fff4ed] px-3 text-sm font-semibold text-[#ff5b38] outline-none ring-1 ring-[#ffd6c2] transition hover:bg-[#ffeade] focus-visible:ring-2 focus-visible:ring-[#ff7a1a] disabled:cursor-wait disabled:opacity-70"
                    type="button"
                    disabled={fileTransfer.isPreparingFolder}
                    onClick={() => {
                      void fileTransfer.confirmFolderSelection("files");
                    }}
                  >
                    Upload Only Files
                  </button>
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#f6f7f9] px-3 text-sm font-semibold text-[#3c4043] outline-none transition hover:bg-[#eceff3] focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
                    type="button"
                    onClick={fileTransfer.clearFiles}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            {peerConnection.transferError ? (
              <StatusNotice
                title={peerConnection.transferError.title}
                detail={peerConnection.transferError.detail}
                tone="error"
                onDismiss={peerConnection.clearTransferError}
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
                className="relative z-20 w-full max-w-xl rounded-lg bg-white/96 px-4 py-3 text-sm shadow-[0_16px_42px_rgba(255,91,56,0.1)] ring-1 ring-[#ffd6c2]"
                aria-label="Selected file manifest"
              >
                <p className="font-semibold text-[#202124]">
                  {getTransferSelectionLabel(fileTransfer.manifest)}
                </p>
                <p className="mt-1 text-[#6b7280]">
                  {getTransferDisplayName(fileTransfer.manifest)} -{" "}
                  {formatBytes(fileTransfer.manifest.totalBytes)} ready to share. Click Send on a device
                  to share with.
                </p>
                <button
                  className="mt-2 text-sm font-semibold text-[#ff5b38] outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
                  type="button"
                  onClick={fileTransfer.clearFiles}
                >
                  Clear Selection
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
                onDismiss={peerConnection.clearTransferProgress}
              />
            ) : null}
            {peerConnection.outgoingStatus ? (
              <TransferDialog
                title="Transfer Request"
                statusText={getOutgoingStatusText(peerConnection.outgoingStatus)}
              />
            ) : null}
          </div>
        ) : null}

        {peerConnection.receivedFiles.length > 0 ? (
          <section
            id="received-files"
            className="relative z-20 mt-5 w-full max-w-[1120px] rounded-lg bg-white/96 p-4 shadow-[0_18px_48px_rgba(32,33,36,0.08)] ring-1 ring-[#eef0f4]"
            aria-label="Received Files"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#202124]">Received Files</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#f2055c,#ff7a1a,#ffb000)] px-3 text-sm font-semibold text-white outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
                  type="button"
                  onClick={() => downloadFiles(peerConnection.receivedFiles)}
                >
                  <Download aria-hidden="true" className="size-4" />
                  Download All
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#f6f7f9] px-3 text-sm font-semibold text-[#3c4043] outline-none transition hover:bg-[#eceff3] focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
                  type="button"
                  onClick={peerConnection.clearReceivedFiles}
                >
                  Clear Downloads
                </button>
              </div>
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
          Drag-over state active. File selected. Sending progress. Receiving progress. Peer Disconnected
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

function downloadFiles(files: ReceivedTransferFile[]): void {
  for (const file of files) {
    const link = document.createElement("a");

    link.href = file.url;
    link.download = file.relativePath ?? file.name;
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();
  }
}

function InfoOverlay({
  deviceNameDraft,
  isClosing,
  onDeviceNameChange,
  onSaveDeviceName
}: {
  deviceNameDraft: string;
  isClosing: boolean;
  onDeviceNameChange: (value: string) => void;
  onSaveDeviceName: () => void;
}) {
  return (
    <section
      className={`info-panel fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[linear-gradient(135deg,#f2055c,#ff7a1a,#ffb000)] px-5 py-8 text-white ${
        isClosing ? "info-collapse" : "info-expand"
      }`}
      aria-label="How to use Oppassum"
    >
      <div className="flex w-full max-w-xl flex-col items-center text-center">
        <img
          src="/oppassum-logo-white.png"
          alt=""
          aria-hidden="true"
          className="size-20 object-contain sm:size-24"
        />
        <img
          src="/oppassum-white.png"
          alt="Oppassum"
          className="mt-4 h-12 w-auto object-contain sm:h-16"
        />
        <div className="mt-8 w-full rounded-lg bg-white/10 p-5 text-left ring-1 ring-white/20 backdrop-blur">
          <p className="text-lg font-bold text-white">Instructions</p>
          <ol className="mt-3 space-y-2 text-sm leading-6 text-white/90 sm:text-base">
            <li>1. Open this page on both devices.</li>
            <li>2. Select files or a folder.</li>
            <li>3. Click Send on the receiving device.</li>
            <li>4. Accept the request on the other device.</li>
            <li>5. Keep both devices awake until the transfer finishes.</li>
          </ol>
        </div>
        <div className="mt-5 grid w-full gap-3 rounded-lg bg-white/10 p-4 text-left ring-1 ring-white/20 backdrop-blur sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block text-sm font-semibold text-white">
            This Device Name
            <input
              className="mt-2 h-11 w-full rounded-lg border border-white/30 bg-white/15 px-3 text-sm font-medium text-white outline-none placeholder:text-white/60 focus:border-white focus:ring-2 focus:ring-white/30"
              placeholder="Enter device name"
              value={deviceNameDraft}
              onChange={(event) => onDeviceNameChange(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSaveDeviceName();
                }
              }}
            />
          </label>
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-bold text-[#ff5b38] outline-none transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(255,255,255,0.2)] focus-visible:ring-2 focus-visible:ring-white"
            type="button"
            onClick={onSaveDeviceName}
          >
            Save
          </button>
        </div>
        <div className="mt-6 flex items-center justify-center gap-5">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              className="flex size-11 items-center justify-center rounded-full bg-white/12 p-2 outline-none ring-1 ring-white/20 transition hover:-translate-y-1 hover:scale-110 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white"
              href={link.href}
              target="_blank"
              rel="noreferrer"
              aria-label={link.label}
            >
              <img src={link.icon} alt="" aria-hidden="true" className="size-full object-contain" />
            </a>
          ))}
        </div>
      </div>
    </section>
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
    return progress.direction === "sending" ? "Sent Files" : "Received Files";
  }

  if (progress.status === "failed") {
    return "Transfer Failed";
  }

  return `${progress.direction === "sending" ? "Sending" : "Receiving"} ${progress.fileName}`;
}

function getPeerStatusLabel(status: PeerConnectionStatus | undefined): string {
  if (status === "connecting") {
    return "Connecting";
  }

  if (status === "data-channel-open") {
    return "Data Channel Open";
  }

  if (status === "failed") {
    return "Connection Failed";
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
    return "Data Channel Open";
  }

  if (status === "failed") {
    return "Peer connection failed";
  }

  if (status === "disconnected") {
    return "Peer Disconnected";
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
    return "No Devices Connected Yet";
  }

  return `${roomState.peers.length} ${roomState.peers.length === 1 ? "Device" : "Devices"} Connected`;
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
  action,
  onDismiss,
  isAttention = false
}: {
  title: string;
  detail: string;
  tone: "warning" | "error";
  action?: React.ReactNode;
  onDismiss?: () => void;
  isAttention?: boolean;
}) {
  const color = tone === "error" ? "#c92a2a" : "#b7791f";
  const ringColor = isAttention ? "ring-[#f2055c]" : "ring-[#eef0f4]";

  return (
    <section
      className={`relative z-20 w-full max-w-xl rounded-lg bg-white/96 px-4 py-3 text-left shadow-[0_14px_36px_rgba(32,33,36,0.08)] ring-1 ${ringColor} ${
        isAttention ? "attention-shake" : ""
      }`}
      aria-label={title}
    >
      {onDismiss ? (
        <button
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-[#6b7280] outline-none transition hover:bg-[#f6f7f9] hover:text-[#202124] focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
          type="button"
          aria-label={`Dismiss ${title}`}
          onClick={onDismiss}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" style={{ color }} />
        <div className={onDismiss ? "min-w-0 flex-1 pr-8" : "min-w-0 flex-1"}>
          <p className="text-sm font-semibold text-[#202124]">{title}</p>
          <p className="mt-1 text-sm text-[#6b7280]">{detail}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </section>
  );
}
