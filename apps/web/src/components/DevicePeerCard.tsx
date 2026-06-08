import { HelpCircle, Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import React from "react";

type DeviceKind = "laptop" | "desktop" | "phone" | "tablet" | "unknown";

type DevicePeerCardProps = {
  name: string;
  status: string;
  kind: DeviceKind;
  positionClassName: string;
  canSend?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
};

const deviceIcons = {
  laptop: Laptop,
  desktop: Monitor,
  phone: Smartphone,
  tablet: Tablet,
  unknown: HelpCircle
} satisfies Record<DeviceKind, typeof Laptop>;

export function DevicePeerCard({
  name,
  status,
  kind,
  positionClassName,
  canSend = false,
  isSelected = false,
  onSelect
}: DevicePeerCardProps) {
  const DeviceIcon = deviceIcons[kind];

  return (
    <button
      className={`absolute z-30 hidden w-[160px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-lg bg-white/92 px-4 py-3 text-center shadow-[0_18px_45px_rgba(32,33,36,0.08)] ring-1 ring-[#ffe0cf] backdrop-blur outline-none transition duration-200 hover:-translate-y-[calc(50%+4px)] hover:scale-[1.03] hover:bg-white hover:shadow-[0_24px_60px_rgba(255,91,56,0.18)] hover:ring-[#ffb38b] focus-visible:ring-2 focus-visible:ring-[#ff7a1a] md:flex ${positionClassName}`}
      type="button"
      aria-label={`${name}, ${status}`}
      onClick={onSelect}
    >
      <span
        className={`flex size-12 items-center justify-center rounded-full ${
          isSelected
            ? "bg-[linear-gradient(135deg,#f2055c,#ff7a1a,#ffb000)] text-white"
            : "bg-[#fff4ed] text-[#ff5b38]"
        }`}
      >
        <DeviceIcon aria-hidden="true" className="size-6" />
      </span>
      <span className="w-full truncate text-sm font-semibold text-[#202124]">{name}</span>
      <span className="w-full truncate text-xs text-[#6b7280]">{status}</span>
      {canSend ? (
        <span className="mt-1 inline-flex h-8 w-full items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f2055c,#ff7a1a,#ffb000)] text-xs font-semibold text-white shadow-[0_10px_24px_rgba(255,91,56,0.2)]">
          Send
        </span>
      ) : null}
    </button>
  );
}
