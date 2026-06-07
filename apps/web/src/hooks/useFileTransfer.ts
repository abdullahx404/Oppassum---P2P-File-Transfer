"use client";

import { useMemo, useState } from "react";

import { createTransferManifest, type TransferManifest } from "../lib/files";

export type FileSelectionState = {
  files: File[];
  manifest?: TransferManifest;
  isDragActive: boolean;
  selectFiles: (files: FileList | File[]) => void;
  clearFiles: () => void;
  setDragActive: (isActive: boolean) => void;
};

export function useFileTransfer(): FileSelectionState {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setDragActive] = useState(false);
  const manifest = useMemo(
    () => (files.length > 0 ? createTransferManifest(files) : undefined),
    [files]
  );

  return {
    files,
    manifest,
    isDragActive,
    selectFiles: (nextFiles) => {
      setFiles(Array.from(nextFiles));
      setDragActive(false);
    },
    clearFiles: () => setFiles([]),
    setDragActive
  };
}
