import { HelpCircle, Laptop, Monitor, Smartphone, Tablet } from "lucide-react";
import React from "react";

type DeviceKind = "laptop" | "desktop" | "phone" | "tablet" | "unknown";

type DevicePeerCardProps = {
  name: string;
  status: string;
  kind: DeviceKind;
  positionClassName: string;
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
  isSelected = false,
  onSelect
}: DevicePeerCardProps) {
  const DeviceIcon = deviceIcons[kind];

  return (
    <button
      className={`absolute hidden w-[148px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-lg bg-white/88 px-4 py-3 text-center shadow-[0_18px_45px_rgba(32,33,36,0.08)] ring-1 ring-[#ffe0cf] backdrop-blur outline-none transition hover:-translate-y-[calc(50%+2px)] hover:shadow-[0_22px_55px_rgba(255,91,56,0.13)] focus-visible:ring-2 focus-visible:ring-[#ff7a1a] md:flex ${positionClassName}`}
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
    </button>
  );
}
