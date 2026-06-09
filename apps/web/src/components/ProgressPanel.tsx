import { X } from "lucide-react";
import React from "react";

type ProgressPanelProps = {
  title: string;
  detail: string;
  value: number;
  tone?: "blue" | "green";
  onDismiss?: () => void;
};

export function ProgressPanel({
  title,
  detail,
  value,
  tone = "blue",
  onDismiss
}: ProgressPanelProps) {
  const color = tone === "green" ? "#2f9e44" : "#ff5b38";

  return (
    <div className="relative min-w-0 rounded-lg bg-white/92 p-4 shadow-[0_18px_45px_rgba(32,33,36,0.08)] ring-1 ring-[#eef0f4]">
      {onDismiss ? (
        <button
          className="absolute right-3 top-3 flex size-8 cursor-pointer items-center justify-center text-[#6b7280] outline-none transition hover:text-[#202124] focus-visible:ring-2 focus-visible:ring-[#ff7a1a]"
          type="button"
          aria-label={`Dismiss ${title}`}
          onClick={onDismiss}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
      <div className="flex items-center justify-between gap-3 pr-8">
        <p className="truncate text-sm font-semibold text-[#202124]">{title}</p>
        <p className="shrink-0 text-sm font-semibold" style={{ color }}>
          {value}%
        </p>
      </div>
      <p className="mt-1 truncate text-xs text-[#6b7280]">{detail}</p>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef0f4]"
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: tone === "green" ? color : "linear-gradient(90deg,#f2055c,#ff7a1a,#ffb000)"
          }}
        />
      </div>
    </div>
  );
}
