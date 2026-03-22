type BinaryLike = ArrayBuffer | SharedArrayBuffer | Uint8Array | null;

const toArrayBuffer = (binary: Exclude<BinaryLike, null>) => {
  if (binary instanceof ArrayBuffer) return binary;

  const normalized = binary instanceof Uint8Array ? binary : new Uint8Array(binary);
  return new Uint8Array(normalized).buffer;
};

export const createBlobUrlFromBinary = (binary?: BinaryLike, type = 'image/jpeg') => {
  if (!binary) return null;

  return URL.createObjectURL(new Blob([toArrayBuffer(binary)], { type }));
};
