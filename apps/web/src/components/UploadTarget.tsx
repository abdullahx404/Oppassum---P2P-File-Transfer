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
      className="upload-area relative flex w-full max-w-[72rem] flex-col items-center"
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
      <div className="radar-rings" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <label className="upload-target-circle group relative z-10 flex size-48 cursor-pointer items-center justify-center rounded-full bg-white text-center outline-none sm:size-56 md:size-64">
        <input
          className="file-input-control"
          type="file"
          multiple
          aria-label="Choose files"
          onChange={(event) => {
            if (event.currentTarget.files) {
              onFilesSelected(event.currentTarget.files);
              event.currentTarget.value = "";
            }
          }}
        />
        <span className="upload-gradient-ring absolute inset-0 z-10 rounded-full bg-[linear-gradient(135deg,#f2055c_0%,#ff4d35_48%,#ffb000_100%)] p-[14px] shadow-[0_24px_70px_rgba(255,91,56,0.22)] transition group-hover:scale-[1.02] group-focus-within:ring-4 group-focus-within:ring-[#ff7a1a]/30">
          <span
            className={`block size-full rounded-full bg-white ${
              isDragActive ? "ring-4 ring-[#2f9e44]/60" : ""
            }`}
          />
        </span>
        <span className="relative z-20 flex flex-col items-center gap-2 px-8">
          <Upload aria-hidden="true" className="size-8 text-[#ff5b38]" />
          <span className="text-2xl font-semibold leading-tight text-[#3c4043]">Upload Files</span>
          <span className="text-sm font-semibold text-[#3c4043]">
            {selectedCount > 0 ? `${selectedCount} Selected` : "Click Here"}
          </span>
        </span>
      </label>

      <label className="mt-7 inline-flex h-14 cursor-pointer items-center justify-center gap-3 rounded-lg bg-[linear-gradient(135deg,#f2055c,#ff7a1a,#ffb000)] px-10 text-lg font-semibold text-white shadow-[0_20px_60px_rgba(255,91,56,0.22)] outline-none transition hover:-translate-y-0.5 hover:brightness-95 hover:shadow-[0_24px_70px_rgba(255,91,56,0.28)] focus-within:ring-2 focus-within:ring-[#ff7a1a] focus-within:ring-offset-2">
        <input
          className="file-input-control"
          type="file"
          aria-label="Choose folder"
          multiple
          {...{ webkitdirectory: "", directory: "" }}
          onChange={(event) => {
            if (event.currentTarget.files) {
              onFilesSelected(event.currentTarget.files);
              event.currentTarget.value = "";
            }
          }}
        />
        <FolderUp aria-hidden="true" className="size-6 text-white" />
        Upload Folder
      </label>
    </section>
  );
}
