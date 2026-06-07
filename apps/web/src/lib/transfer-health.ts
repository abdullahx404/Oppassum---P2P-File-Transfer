import type { TransferProgressSnapshot } from "./chunked-transfer";
import { formatBytes } from "./files";

export const LARGE_TRANSFER_WARNING_BYTES = 512 * 1024 * 1024;

export type BrowserSupportState = {
  isSupported: boolean;
  message?: string;
};

export function getBrowserSupportState(): BrowserSupportState {
  if (typeof window === "undefined") {
    return { isSupported: true };
  }

  if (!("RTCPeerConnection" in window) || !("RTCDataChannelEvent" in window)) {
    return {
      isSupported: false,
      message: "This browser does not fully support WebRTC file transfer."
    };
  }

  return { isSupported: true };
}

export function getLargeTransferWarning(totalBytes: number): string | undefined {
  if (totalBytes < LARGE_TRANSFER_WARNING_BYTES) {
    return undefined;
  }

  return `Large transfer selected: ${formatBytes(totalBytes)}. Keep both devices awake until it finishes.`;
}

export function getProgressDetail(progress: TransferProgressSnapshot, now = Date.now()): string {
  if (progress.status === "completed") {
    return `${progress.totalFiles} ${progress.totalFiles === 1 ? "file" : "files"} completed`;
  }

  if (progress.status === "failed") {
    return `${formatBytes(progress.bytesTransferred)} of ${formatBytes(progress.totalBytes)} before failure`;
  }

  const remainingBytes = Math.max(progress.totalBytes - progress.bytesTransferred, 0);
  const speedBytesPerSecond = getSpeedBytesPerSecond(progress, now);
  const speedText = speedBytesPerSecond
    ? ` at ${formatBytes(speedBytesPerSecond)}/s`
    : "";

  return `${formatBytes(progress.bytesTransferred)} of ${formatBytes(progress.totalBytes)} - ${formatBytes(remainingBytes)} left${speedText}`;
}

export function getSpeedBytesPerSecond(
  progress: TransferProgressSnapshot,
  now = Date.now()
): number | undefined {
  if (!progress.startedAt || progress.bytesTransferred === 0) {
    return undefined;
  }

  const elapsedSeconds = Math.max((now - progress.startedAt) / 1000, 0.1);
  return Math.round(progress.bytesTransferred / elapsedSeconds);
}
