import type { TransferFileMetadata } from "./files";

export const DEFAULT_CHUNK_SIZE = 64 * 1024;
export const BUFFERED_AMOUNT_HIGH_WATER_MARK = DEFAULT_CHUNK_SIZE * 16;
const BACKPRESSURE_POLL_MS = 20;

export type TransferProgressSnapshot = {
  direction: "sending" | "receiving";
  status: "transferring" | "completed" | "failed";
  transferId: string;
  fileName: string;
  bytesTransferred: number;
  totalBytes: number;
  completedFiles: number;
  totalFiles: number;
  startedAt?: number;
};

export type ReceivedTransferFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  relativePath?: string;
  url: string;
};

export async function* readFileChunks(
  file: File,
  chunkSize = DEFAULT_CHUNK_SIZE
): AsyncGenerator<ArrayBuffer> {
  let offset = 0;

  while (offset < file.size) {
    const nextOffset = Math.min(offset + chunkSize, file.size);
    yield await file.slice(offset, nextOffset).arrayBuffer();
    offset = nextOffset;
  }
}

export async function waitForDataChannelBackpressure(channel: RTCDataChannel): Promise<void> {
  while (channel.bufferedAmount > BUFFERED_AMOUNT_HIGH_WATER_MARK) {
    await delay(BACKPRESSURE_POLL_MS);
  }
}

export function createTransferProgress(params: {
  direction: TransferProgressSnapshot["direction"];
  status: TransferProgressSnapshot["status"];
  transferId: string;
  fileName: string;
  bytesTransferred: number;
  totalBytes: number;
  completedFiles: number;
  totalFiles: number;
  startedAt?: number;
}): TransferProgressSnapshot {
  return params;
}

export function getTransferPercent(progress: TransferProgressSnapshot): number {
  if (progress.totalBytes === 0) {
    return 100;
  }

  return Math.min(100, Math.round((progress.bytesTransferred / progress.totalBytes) * 100));
}

export function createReceivedFileUrl(
  file: TransferFileMetadata,
  chunks: ArrayBuffer[]
): ReceivedTransferFile {
  const blob = new Blob(chunks, { type: file.type });

  return {
    id: file.id,
    name: file.name,
    size: file.size,
    type: file.type,
    relativePath: file.relativePath,
    url: URL.createObjectURL(blob)
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
