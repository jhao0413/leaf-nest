import { isTauri } from '@tauri-apps/api/core';

export function isTauriRuntime() {
  try {
    return isTauri();
  } catch {
    return false;
  }
}
