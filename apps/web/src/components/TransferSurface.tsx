import { Download, Info, Radio } from "lucide-react";
import React from "react";

import { BrandMark } from "./BrandMark";
import { DevicePeerCard } from "./DevicePeerCard";
import { ProgressPanel } from "./ProgressPanel";
import { StatePreview } from "./StatePreview";
import { TransferDialog } from "./TransferDialog";
import { UploadTarget } from "./UploadTarget";

const peers = [
  {
    name: "Studio Laptop",
    status: "Ready",
    kind: "laptop",
    positionClassName: "left-[22%] top-[36%]"
  },
  {
    name: "Amina Phone",
    status: "Selected",
    kind: "phone",
    positionClassName: "left-[78%] top-[38%]",
    isSelected: true
  },
  {
    name: "Desk Monitor",
    status: "Online",
    kind: "desktop",
    positionClassName: "left-[31%] top-[55%]"
  },
  {
    name: "Tablet",
    status: "Receiving",
    kind: "tablet",
    positionClassName: "left-[69%] top-[55%]"
  }
] as const;

export function TransferSurface() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfbfc] text-[#202124]">
      <div className="radar-rings" aria-hidden="true" />

      <header className="relative z-20 flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <BrandMark />
        <button
          className="flex size-10 items-center justify-center rounded-full bg-white/70 text-[#3c4043] outline-none ring-1 ring-[#eef0f4] transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#5b82f6]"
          type="button"
          aria-label="Information"
        >
          <Info aria-hidden="true" className="size-6" />
        </button>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-[1440px] flex-col items-center px-5 pb-8 pt-8 sm:px-8 md:pt-16">
        {peers.map((peer) => (
          <DevicePeerCard key={peer.name} {...peer} />
        ))}

        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <div className="rounded-full border border-dashed border-[#dfe4ef] bg-white/50 px-4 py-2 text-sm font-medium text-[#6b7280] shadow-[0_14px_40px_rgba(32,33,36,0.04)] md:hidden">
            4 nearby devices
          </div>

          <UploadTarget />

          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <span className="flex size-20 items-center justify-center rounded-full text-[#5b82f6] ring-1 ring-[#eef0f4]">
              <Radio aria-hidden="true" className="size-12" strokeWidth={2.4} />
            </span>
            <p className="max-w-sm text-base font-medium text-[#3c4043]">
              The easiest way to transfer data across devices
            </p>
            <p className="text-sm font-medium text-[#5b82f6]">No devices connected yet</p>
          </div>
        </div>

        <div className="mt-8 grid w-full max-w-[1120px] gap-4 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-3 sm:grid-cols-2">
            <ProgressPanel title="Sending portfolio.zip" detail="42 MB of 80 MB" value={52} />
            <ProgressPanel
              title="Received brand-kit"
              detail="Completed from Studio Laptop"
              value={100}
              tone="green"
            />
          </div>
          <TransferDialog />
        </div>

        <div className="mt-5 w-full">
          <StatePreview />
        </div>

        <div className="sr-only" aria-live="polite">
          Drag-over state active. File selected. Sending progress. Receiving progress. Peer disconnected
          mid-transfer.
        </div>

        <a
          className="fixed bottom-5 right-5 z-30 hidden size-11 items-center justify-center rounded-full bg-[#5b82f6] text-white shadow-[0_16px_45px_rgba(91,130,246,0.35)] outline-none transition hover:bg-[#3658b6] focus-visible:ring-2 focus-visible:ring-[#5b82f6] focus-visible:ring-offset-4 sm:flex"
          href="#"
          aria-label="Download completed files"
        >
          <Download aria-hidden="true" className="size-5" />
        </a>
      </section>
    </main>
  );
}
