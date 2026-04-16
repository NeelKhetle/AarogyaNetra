/**
 * AarogyaNetra AI - Simple Storage Module
 * Persistent storage using @react-native-async-storage/async-storage.
 * All data is saved to device storage and survives app restarts.
 *
 * Falls back to in-memory cache if native storage is unavailable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory cache for fast reads within the session
const memoryStore: Record<string, string> = {};

export const SimpleStorage = {
  async setItem(key: string, value: string): Promise<void> {
    memoryStore[key] = value;
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      // Data is still in memory for this session
      console.warn('[Storage] Save failed:', key, e);
    }
  },

  async getItem(key: string): Promise<string | null> {
    // Check memory first (fast)
    if (memoryStore[key] !== undefined) {
      return memoryStore[key];
    }

    // Try persistent storage
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        memoryStore[key] = value; // Cache it
      }
      return value;
    } catch (e) {
      console.warn('[Storage] Load failed:', key, e);
    }

    return null;
  },

  async removeItem(key: string): Promise<void> {
    delete memoryStore[key];
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // Silent
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

  // Get all keys (useful for debugging)
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys as string[];
    } catch (e) {
      return Object.keys(memoryStore);
    }
  },

  // Clear all stored data
  async clear(): Promise<void> {
    Object.keys(memoryStore).forEach(key => delete memoryStore[key]);
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.warn('[Storage] Clear failed:', e);
    }
  },
};
