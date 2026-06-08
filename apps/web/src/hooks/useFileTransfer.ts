"use client";

import { useMemo, useState } from "react";

import { createTransferManifest, type TransferManifest } from "../lib/files";
import { createStoredZipFile } from "../lib/zip";

export type FolderSelectionMode = "files" | "zip";

export type PendingFolderSelection = {
  files: File[];
  folderRoots: string[];
  totalBytes: number;
};

export type FileSelectionState = {
  files: File[];
  manifest?: TransferManifest;
  isDragActive: boolean;
  pendingFolderSelection?: PendingFolderSelection;
  folderSelectionError?: string;
  isPreparingFolder: boolean;
  selectFiles: (files: FileList | File[]) => void;
  confirmFolderSelection: (mode: FolderSelectionMode) => Promise<void>;
  clearFiles: () => void;
  setDragActive: (isActive: boolean) => void;
};

export function useFileTransfer(): FileSelectionState {
  const [files, setFiles] = useState<File[]>([]);
  const [pendingFolderSelection, setPendingFolderSelection] = useState<
    PendingFolderSelection | undefined
  >();
  const [folderSelectionError, setFolderSelectionError] = useState<string | undefined>();
  const [isPreparingFolder, setPreparingFolder] = useState(false);
  const [isDragActive, setDragActive] = useState(false);
  const manifest = useMemo(
    () => (files.length > 0 ? createTransferManifest(files) : undefined),
    [files]
  );

  return {
    files,
    manifest,
    isDragActive,
    pendingFolderSelection,
    folderSelectionError,
    isPreparingFolder,
    selectFiles: (nextFiles) => {
      const selectedFiles = Array.from(nextFiles);
      const folderRoots = getFolderRoots(selectedFiles);

      setFolderSelectionError(undefined);
      if (folderRoots.length > 0) {
        setFiles([]);
        setPendingFolderSelection({
          files: selectedFiles,
          folderRoots,
          totalBytes: selectedFiles.reduce((total, file) => total + file.size, 0)
        });
        setDragActive(false);
        return;
      }

      setPendingFolderSelection(undefined);
      setFiles(selectedFiles);
      setDragActive(false);
    },
    confirmFolderSelection: async (mode) => {
      if (!pendingFolderSelection) {
        return;
      }

      setPreparingFolder(true);
      setFolderSelectionError(undefined);

      try {
        if (mode === "zip") {
          const zipFile = await createStoredZipFile(
            pendingFolderSelection.files,
            getZipName(pendingFolderSelection.folderRoots)
          );
          setFiles([zipFile]);
        } else {
          setFiles(pendingFolderSelection.files);
        }

        setPendingFolderSelection(undefined);
      } catch {
        setFolderSelectionError(
          "Could not package this folder as ZIP. Try uploading it as separate files."
        );
      } finally {
        setPreparingFolder(false);
        setDragActive(false);
      }
    },
    clearFiles: () => {
      setFiles([]);
      setPendingFolderSelection(undefined);
      setFolderSelectionError(undefined);
    },
    setDragActive
  };
}

type FileWithRelativePath = File & {
  webkitRelativePath?: string;
};

function getFolderRoots(files: File[]): string[] {
  return Array.from(
    new Set(
      files
        .map((file) => {
          const relativePath = (file as FileWithRelativePath).webkitRelativePath;
          return relativePath?.replaceAll("\\", "/").split("/").filter(Boolean)[0];
        })
        .filter((root): root is string => Boolean(root))
    )
  ).sort((first, second) => first.localeCompare(second));
}

function getZipName(folderRoots: string[]): string {
  if (folderRoots.length === 1) {
    return folderRoots[0] ?? "oppassum-folder";
  }

  return "oppassum-folders";
}
