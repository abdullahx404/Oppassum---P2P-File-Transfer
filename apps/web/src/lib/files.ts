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
  folderRoots?: string[];
  totalBytes: number;
  createdAt: number;
};

type FileWithRelativePath = File & {
  webkitRelativePath?: string;
};

export function createTransferManifest(files: File[]): TransferManifest {
  const metadata = files.map((file, index) => {
    const fileWithPath = file as FileWithRelativePath;
    const relativePath = normalizeRelativePath(fileWithPath.webkitRelativePath);

    return {
      id: `${index}-${relativePath ?? file.name}-${file.size}-${file.lastModified}`,
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
    folderRoots: getFolderRoots(metadata),
    totalBytes: metadata.reduce((total, file) => total + file.size, 0),
    createdAt: Date.now()
  };
}

export function getTransferSelectionLabel(manifest: TransferManifest): string {
  const folderRoots = getManifestFolderRoots(manifest);

  if (folderRoots.length > 0) {
    return `${folderRoots.length} ${
      folderRoots.length === 1 ? "Folder" : "Folders"
    } Selected`;
  }

  return `${manifest.files.length} ${manifest.files.length === 1 ? "File" : "Files"} Selected`;
}

export function getTransferItemLabel(manifest: TransferManifest): string {
  const folderRoots = getManifestFolderRoots(manifest);

  if (folderRoots.length > 0) {
    return `${folderRoots.length} ${
      folderRoots.length === 1 ? "Folder" : "Folders"
    }`;
  }

  return `${manifest.files.length} ${manifest.files.length === 1 ? "File" : "Files"}`;
}

export function getTransferDisplayName(manifest: TransferManifest, fallback = "Transfer"): string {
  const folderRoots = getManifestFolderRoots(manifest);
  const firstFolderRoot = folderRoots[0];

  if (firstFolderRoot && folderRoots.length === 1) {
    return firstFolderRoot;
  }

  if (folderRoots.length > 1) {
    return `${folderRoots.length} folders`;
  }

  return manifest.files[0]?.name ?? fallback;
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

function normalizeRelativePath(path: string | undefined): string | undefined {
  const parts = path
    ?.replaceAll("\\", "/")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts && parts.length > 1 ? parts.join("/") : undefined;
}

function getFolderRoots(files: TransferFileMetadata[]): string[] {
  return Array.from(
    new Set(
      files
        .map((file) => file.relativePath?.split("/")[0])
        .filter((root): root is string => Boolean(root))
    )
  ).sort((first, second) => first.localeCompare(second));
}

function getManifestFolderRoots(manifest: TransferManifest): string[] {
  return manifest.folderRoots ?? getFolderRoots(manifest.files);
}

function createTransferId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `transfer-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
