import { Radio } from "lucide-react";
import React from "react";

export function BrandMark() {
  return (
    <a
      className="inline-flex items-center gap-3 rounded-full text-[#202124] outline-none transition focus-visible:ring-2 focus-visible:ring-[#5b82f6] focus-visible:ring-offset-4"
      href="/"
      aria-label="Oppassum home"
    >
      <span className="flex size-11 items-center justify-center rounded-full border-4 border-[#5b82f6] bg-white text-[#5b82f6] shadow-[0_10px_30px_rgba(91,130,246,0.16)]">
        <Radio aria-hidden="true" className="size-6" strokeWidth={2.6} />
      </span>
      <span className="text-2xl font-semibold tracking-normal sm:text-3xl">Oppassum</span>
    </a>
  );
}
