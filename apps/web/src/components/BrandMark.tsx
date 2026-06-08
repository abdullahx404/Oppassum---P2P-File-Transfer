import React from "react";

export function BrandMark() {
  return (
    <a
      className="inline-flex items-center gap-3 rounded-full text-[#202124] outline-none transition focus-visible:ring-2 focus-visible:ring-[#ff7a1a] focus-visible:ring-offset-4"
      href="/"
      aria-label="Oppassum home"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(255,91,56,0.18)] ring-1 ring-[#ffe0cf]">
        <img
          src="/oppassum-logo.png"
          alt=""
          aria-hidden="true"
          className="size-7 object-contain"
        />
      </span>
      <img
        src="/oppassum-name.png"
        alt="Oppassum"
        className="h-8 w-auto object-contain sm:h-10"
      />
    </a>
  );
}
