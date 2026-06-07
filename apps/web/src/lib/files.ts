export type TransferFileMetadata = {
  id: string;
  name: string;
  size: number;
  type: string;
  relativePath?: string;
  lastModified: number;
};

export type TransferManifest = {
  transferId: string;
  files: TransferFileMetadata[];
  totalBytes: number;
  createdAt: number;
};

type FileWithRelativePath = File & {
  webkitRelativePath?: string;
};

export function createTransferManifest(files: File[]): TransferManifest {
  const metadata = files.map((file, index) => {
    const fileWithPath = file as FileWithRelativePath;
    const relativePath = fileWithPath.webkitRelativePath || undefined;

    return {
      id: `${index}-${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      relativePath,
      lastModified: file.lastModified
    };
  });

  return {
    transferId: createTransferId(),
    files: metadata,
    totalBytes: metadata.reduce((total, file) => total + file.size, 0),
    createdAt: Date.now()
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function createTransferId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `transfer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
