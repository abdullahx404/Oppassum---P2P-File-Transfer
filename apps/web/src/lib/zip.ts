type FileWithRelativePath = File & {
  webkitRelativePath?: string;
};

const ZIP_STORE_METHOD = 0;
const ZIP_VERSION = 20;
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_MAX_UINT32 = 0xffffffff;

export async function createStoredZipFile(files: File[], zipName?: string): Promise<File> {
  const encoder = new TextEncoder();
  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  let offset = 0;

  for (const file of files) {
    const path = getZipEntryPath(file);
    const fileNameBytes = encoder.encode(path);
    const data = await file.arrayBuffer();
    const crc = getCrc32(new Uint8Array(data));
    const modifiedAt = getDosDateTime(file.lastModified);

    if (data.byteLength > ZIP_MAX_UINT32 || offset > ZIP_MAX_UINT32) {
      throw new Error("ZIP64 is not supported for this browser-side folder package.");
    }

    const localHeader = createLocalFileHeader({
      crc,
      fileNameBytes,
      modifiedAt,
      size: data.byteLength
    });
    localParts.push(localHeader, data);

    const centralHeader = createCentralDirectoryHeader({
      crc,
      fileNameBytes,
      modifiedAt,
      offset,
      size: data.byteLength
    });
    centralParts.push(centralHeader);

    offset += localHeader.byteLength + data.byteLength;
  }

  const centralDirectorySize = centralParts.reduce((total, part) => {
    if (part instanceof ArrayBuffer) {
      return total + part.byteLength;
    }

    return total;
  }, 0);
  const endRecord = createEndOfCentralDirectory({
    centralDirectoryOffset: offset,
    centralDirectorySize,
    entryCount: files.length
  });
  const outputName = ensureZipExtension(zipName ?? getDefaultZipName(files));

  return new File([...localParts, ...centralParts, endRecord], outputName, {
    lastModified: Date.now(),
    type: "application/zip"
  });
}

function createLocalFileHeader({
  crc,
  fileNameBytes,
  modifiedAt,
  size
}: {
  crc: number;
  fileNameBytes: Uint8Array;
  modifiedAt: DosDateTime;
  size: number;
}): ArrayBuffer {
  const header = new ArrayBuffer(30 + fileNameBytes.byteLength);
  const view = new DataView(header);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, ZIP_VERSION, true);
  view.setUint16(6, ZIP_UTF8_FLAG, true);
  view.setUint16(8, ZIP_STORE_METHOD, true);
  view.setUint16(10, modifiedAt.time, true);
  view.setUint16(12, modifiedAt.date, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, fileNameBytes.byteLength, true);
  view.setUint16(28, 0, true);
  new Uint8Array(header, 30).set(fileNameBytes);

  return header;
}

function createCentralDirectoryHeader({
  crc,
  fileNameBytes,
  modifiedAt,
  offset,
  size
}: {
  crc: number;
  fileNameBytes: Uint8Array;
  modifiedAt: DosDateTime;
  offset: number;
  size: number;
}): ArrayBuffer {
  const header = new ArrayBuffer(46 + fileNameBytes.byteLength);
  const view = new DataView(header);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, ZIP_VERSION, true);
  view.setUint16(6, ZIP_VERSION, true);
  view.setUint16(8, ZIP_UTF8_FLAG, true);
  view.setUint16(10, ZIP_STORE_METHOD, true);
  view.setUint16(12, modifiedAt.time, true);
  view.setUint16(14, modifiedAt.date, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, fileNameBytes.byteLength, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);
  new Uint8Array(header, 46).set(fileNameBytes);

  return header;
}

function createEndOfCentralDirectory({
  centralDirectoryOffset,
  centralDirectorySize,
  entryCount
}: {
  centralDirectoryOffset: number;
  centralDirectorySize: number;
  entryCount: number;
}): ArrayBuffer {
  const header = new ArrayBuffer(22);
  const view = new DataView(header);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);

  return header;
}

function getZipEntryPath(file: File): string {
  const relativePath = (file as FileWithRelativePath).webkitRelativePath;
  const path = relativePath && relativePath.trim().length > 0 ? relativePath : file.name;

  return path
    .replaceAll("\\", "/")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

function getDefaultZipName(files: File[]): string {
  const firstPath = getZipEntryPath(files[0] ?? new File([], "oppassum-files"));
  const rootName = firstPath.split("/")[0] ?? "oppassum-files";

  return rootName;
}

function ensureZipExtension(name: string): string {
  return name.toLowerCase().endsWith(".zip") ? name : `${name}.zip`;
}

type DosDateTime = {
  date: number;
  time: number;
};

function getDosDateTime(timestamp: number): DosDateTime {
  const date = new Date(timestamp);
  const year = Math.max(date.getFullYear(), 1980);

  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  };
}

const crcTable = createCrcTable();

function getCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = (crc >>> 8) ^ (crcTable[(crc ^ byte) & 0xff] ?? 0);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
}
