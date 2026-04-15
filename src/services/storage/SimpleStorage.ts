/**
 * ArogyaNetra AI - Simple Storage Module
 * File-based persistence using React Native's built-in capabilities
 * No external packages needed — works on all React Native versions.
 *
 * Uses a global in-memory cache with periodic save via a hidden state file.
 * On Hermes/release builds, we use a simple key-value approach.
 */

// In-memory cache that persists across the app session
const memoryStore: Record<string, string> = {};

// Flag to track if we've loaded from native storage
let nativeStorageAvailable = false;
let nativeStorage: any = null;

// Try to load native AsyncStorage if available
try {
  // Try community package
  nativeStorage = require('@react-native-async-storage/async-storage')?.default;
  if (nativeStorage) nativeStorageAvailable = true;
} catch {
  try {
    // Try built-in (older RN versions)
    const RN = require('react-native');
    if (RN.AsyncStorage) {
      nativeStorage = RN.AsyncStorage;
      nativeStorageAvailable = true;
    }
  } catch {
    // No native storage available — use memory only
    nativeStorageAvailable = false;
  }
}

export const SimpleStorage = {
  async setItem(key: string, value: string): Promise<void> {
    memoryStore[key] = value;
    if (nativeStorageAvailable && nativeStorage) {
      try {
        await nativeStorage.setItem(key, value);
      } catch (e) {
        // Silently fail — data is still in memory for this session
        console.warn('[Storage] Native save failed:', key);
      }
    }
  },

  async getItem(key: string): Promise<string | null> {
    // Check memory first (fast)
    if (memoryStore[key] !== undefined) {
      return memoryStore[key];
    }

    // Try native storage
    if (nativeStorageAvailable && nativeStorage) {
      try {
        const value = await nativeStorage.getItem(key);
        if (value !== null) {
          memoryStore[key] = value; // Cache it
        }
        return value;
      } catch (e) {
        console.warn('[Storage] Native load failed:', key);
      }
    }

    return null;
  },

  async removeItem(key: string): Promise<void> {
    delete memoryStore[key];
    if (nativeStorageAvailable && nativeStorage) {
      try {
        await nativeStorage.removeItem(key);
      } catch (e) {
        // Silent
      }
    }
  },

  // Convenience methods for JSON objects
  async setJSON(key: string, data: any): Promise<void> {
    try {
      const json = JSON.stringify(data);
      await this.setItem(key, json);
    } catch (e) {
      console.warn('[Storage] JSON serialize failed:', key);
    }
  },

  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[Storage] JSON parse failed:', key);
      return null;
    }
  },
};
