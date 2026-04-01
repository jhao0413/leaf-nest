export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassDictionary
  | ClassValue[];

type ClassDictionary = Record<string, boolean | null | undefined>;

const collectClassNames = (value: ClassValue, classNames: string[]) => {
  if (!value) {
    return;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    classNames.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectClassNames(item, classNames));
    return;
  }

  Object.entries(value).forEach(([className, isEnabled]) => {
    if (isEnabled) {
      classNames.push(className);
    }
  });
};

export function cn(...inputs: ClassValue[]) {
  const classNames: string[] = [];
  inputs.forEach((input) => collectClassNames(input, classNames));
  return classNames.join(' ');
}

export const resolvePath = (basePath: string, relativePath: string): string => {
  const stack = basePath.split('/');
  const parts = relativePath.split('/');

  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
};

const toCamelCase = (str: string) => {
  return str.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
};

export const convertKeysToCamelCase = <T>(obj: Record<string, T>) => {
  const newObj: Record<string, T> = {} as Record<string, T>;
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
      reject(new Error('Error reading file'));
    };

    reader.readAsArrayBuffer(file);
  });
}
