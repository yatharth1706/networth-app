import type { StorageAdapter } from "./adapter";
import { LocalStorageAdapter } from "./local";

let instance: StorageAdapter | null = null;

/**
 * The app's single entry point to storage. When the cloud tier lands, this is
 * the only place that needs to know which backend is active.
 */
export function getStorage(): StorageAdapter {
  if (!instance) {
    instance = new LocalStorageAdapter();
  }
  return instance;
}

export type { StorageAdapter };
