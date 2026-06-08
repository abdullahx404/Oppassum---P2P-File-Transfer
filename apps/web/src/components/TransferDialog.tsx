import { Check, FileArchive, X } from "lucide-react";
import React from "react";

import { formatBytes, type TransferManifest } from "../lib/files";

type TransferDialogProps = {
  manifest?: TransferManifest;
  senderName?: string;
  title?: string;
  statusText?: string;
  onAccept?: () => void;
  onReject?: () => void;
};

export function TransferDialog({
  manifest,
  senderName = "Nearby device",
  title = "Incoming files",
  statusText,
  onAccept,
  onReject
}: TransferDialogProps) {
  const fileCount = manifest?.files.length ?? 0;
  const detail =
    statusText ?? `${fileCount} ${fileCount === 1 ? "file" : "files"} from ${senderName}`;

  return (
    <section
      className="w-full rounded-lg bg-white/94 p-4 shadow-[0_18px_48px_rgba(32,33,36,0.1)] ring-1 ring-[#eef0f4]"
      aria-label="Incoming transfer preview"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fff4ed] text-[#ff5b38]">
          <FileArchive aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#202124]">{manifest?.files[0]?.name ?? title}</p>
          <p className="truncate text-xs text-[#6b7280]">
            {manifest ? `${detail} (${formatBytes(manifest.totalBytes)})` : detail}
          </p>
        </div>
      </div>
      {manifest && onAccept && onReject ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(135deg,#f2055c,#ff7a1a,#ffb000)] px-3 text-sm font-semibold text-white outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-2"
            type="button"
            onClick={onAccept}
          >
            <Check aria-hidden="true" className="size-4" />
            Accept
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#f6f7f9] px-3 text-sm font-semibold text-[#3c4043] outline-none transition hover:bg-[#eceff3] focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-2"
            type="button"
            onClick={onReject}
          >
            <X aria-hidden="true" className="size-4" />
            Reject
          </button>
        </div>
      ) : null}
    </section>
  );
}
