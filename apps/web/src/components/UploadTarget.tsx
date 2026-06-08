import { FolderUp, Upload } from "lucide-react";
import React from "react";

type UploadTargetProps = {
  selectedCount: number;
  isDragActive: boolean;
  onFilesSelected: (files: FileList) => void;
  onDragActiveChange: (isActive: boolean) => void;
};

export function UploadTarget({
  selectedCount,
  isDragActive,
  onFilesSelected,
  onDragActiveChange
}: UploadTargetProps) {
  return (
    <section
      className="flex flex-col items-center"
      aria-label="Upload files"
      onDragEnter={(event) => {
        event.preventDefault();
        onDragActiveChange(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDragActiveChange(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        onDragActiveChange(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDragActiveChange(false);

        if (event.dataTransfer.files.length > 0) {
          onFilesSelected(event.dataTransfer.files);
        }
      }}
    >
      <label className="group relative flex size-48 cursor-pointer items-center justify-center rounded-full bg-white text-center outline-none sm:size-56 md:size-64">
        <input
          className="file-input-control"
          type="file"
          multiple
          aria-label="Choose files"
          onChange={(event) => {
            if (event.currentTarget.files) {
              onFilesSelected(event.currentTarget.files);
            }
          }}
        />
        <span
          className={`absolute inset-0 rounded-full border-[14px] shadow-[0_24px_70px_rgba(91,130,246,0.22)] transition group-hover:scale-[1.02] group-focus-within:ring-4 group-focus-within:ring-[#5b82f6]/30 ${
            isDragActive ? "border-[#2f9e44]" : "border-[#5b82f6]"
          }`}
        />
        <span className="relative z-10 flex flex-col items-center gap-2 px-8">
          <Upload aria-hidden="true" className="size-8 text-[#5b82f6]" />
          <span className="text-2xl font-semibold leading-tight text-[#3c4043]">Upload Files</span>
          <span className="text-sm font-semibold text-[#3c4043]">
            {selectedCount > 0 ? `${selectedCount} selected` : "Click Here"}
          </span>
        </span>
      </label>

      <label className="mt-7 inline-flex h-12 cursor-pointer items-center justify-center gap-3 rounded-lg bg-white px-8 text-base font-medium text-[#3c4043] shadow-[0_18px_55px_rgba(32,33,36,0.1)] ring-1 ring-[#eef0f4] outline-none transition hover:-translate-y-0.5 hover:shadow-[0_22px_65px_rgba(32,33,36,0.13)] focus-within:ring-2 focus-within:ring-[#5b82f6]">
        <input
          className="file-input-control"
          type="file"
          aria-label="Choose folder"
          multiple
          {...{ webkitdirectory: "", directory: "" }}
          onChange={(event) => {
            if (event.currentTarget.files) {
              onFilesSelected(event.currentTarget.files);
            }
          }}
        />
        <FolderUp aria-hidden="true" className="size-5 text-[#5b82f6]" />
        Upload Folder
      </label>
    </section>
  );
}
