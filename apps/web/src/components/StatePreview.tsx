import { AlertTriangle, CheckCircle2, CircleOff, Loader2, PlugZap, XCircle } from "lucide-react";
import React from "react";

const states = [
  { label: "Connecting", icon: Loader2, className: "text-[#5b82f6]" },
  { label: "Drag over", icon: CheckCircle2, className: "text-[#2f9e44]" },
  { label: "Receiver selected", icon: PlugZap, className: "text-[#3658b6]" },
  { label: "Rejected", icon: CircleOff, className: "text-[#6b7280]" },
  { label: "Connection failed", icon: XCircle, className: "text-[#b42318]" },
  { label: "Browser limited", icon: AlertTriangle, className: "text-[#b7791f]" }
];

export function StatePreview() {
  return (
    <div
      className="mx-auto grid w-full max-w-[920px] grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
      aria-label="Transfer states"
    >
      {states.map((state) => {
        const Icon = state.icon;

        return (
          <div
            className="flex min-h-11 items-center gap-2 rounded-lg bg-white/86 px-3 text-xs font-medium text-[#3c4043] shadow-[0_10px_30px_rgba(32,33,36,0.05)] ring-1 ring-[#eef0f4]"
            key={state.label}
          >
            <Icon aria-hidden="true" className={`size-4 shrink-0 ${state.className}`} />
            <span className="whitespace-nowrap">{state.label}</span>
          </div>
        );
      })}
    </div>
  );
}
