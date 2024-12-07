const toCamelCase = (str: string) => {
  return str.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
};

export const convertKeysToCamelCase = (obj: Record<string, unknown>) => {
  const newObj: Record<string, unknown> = {};
  for (const key in obj) {
    const newKey = toCamelCase(key);
    newObj[newKey] = obj[key];
  }
  return newObj;
};

export function getFileBinary(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const arrayBuffer = reader.result;
      resolve(arrayBuffer);
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    reader.readAsArrayBuffer(file);
  });
}
