import React from "react";

export function BrandMark() {
  return (
    <a
      className="inline-flex items-center gap-3 rounded-full text-[#202124] outline-none transition focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-4"
      href="/"
      aria-label="Oppassum home"
    >
      <img
        src="/oppassum-logo-raw.png"
        alt=""
        aria-hidden="true"
        className="size-14 object-contain"
      />
      <img src="/oppassum-name.png" alt="Oppassum" className="h-8 w-auto object-contain sm:h-10" />
    </a>
  );
}
