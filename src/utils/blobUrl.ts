type BinaryLike = ArrayBuffer | SharedArrayBuffer | Uint8Array | null;

const toArrayBuffer = (binary: Exclude<BinaryLike, null>): ArrayBuffer => {
  if (binary instanceof ArrayBuffer) return binary;

  if (binary instanceof Uint8Array) {
    return Uint8Array.from(binary).buffer;
  }

  return Uint8Array.from(new Uint8Array(binary)).buffer;
};

export const createBlobUrlFromBinary = (binary?: BinaryLike, type = 'image/jpeg') => {
  if (!binary) return null;

  return URL.createObjectURL(new Blob([toArrayBuffer(binary)], { type }));
};
