import { Check, FileArchive, X } from "lucide-react";
import React from "react";

export function TransferDialog() {
  return (
    <section
      className="w-full max-w-[360px] rounded-lg bg-white/94 p-4 shadow-[0_18px_48px_rgba(32,33,36,0.1)] ring-1 ring-[#eef0f4]"
      aria-label="Incoming transfer preview"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f2f5ff] text-[#5b82f6]">
          <FileArchive aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#202124]">Design assets</p>
          <p className="truncate text-xs text-[#6b7280]">3 files from Studio Laptop</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2f9e44] px-3 text-sm font-semibold text-white outline-none transition hover:bg-[#26843a] focus-visible:ring-2 focus-visible:ring-[#2f9e44] focus-visible:ring-offset-2"
          type="button"
        >
          <Check aria-hidden="true" className="size-4" />
          Accept
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#f6f7f9] px-3 text-sm font-semibold text-[#3c4043] outline-none transition hover:bg-[#eceff3] focus-visible:ring-2 focus-visible:ring-[#5b82f6] focus-visible:ring-offset-2"
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
          Reject
        </button>
      </div>
    </section>
  );
}
