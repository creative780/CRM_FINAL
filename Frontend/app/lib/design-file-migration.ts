/**
 * Design File Migration Utilities
 * Handles migration from localStorage to secure backend storage
 */

import { loadFilesFromStorageSafe } from './fileStorage';

export interface StoredFileMeta {
  name: string;
  size: number;
  type: string;
  url: string;
  lastModified: number;
}

/**
 * Extract design files from localStorage for a specific product
 */
export function extractDesignFilesFromStorage(productId: string): StoredFileMeta[] {
  try {
    const storageKey = `designFiles_${productId}`;
    const files = loadFilesFromStorageSafe(storageKey);
    console.log(`Extracted ${files.length} design files from localStorage for product ${productId}`);
    return files;
  } catch (error) {
    console.error(`Failed to extract design files for product ${productId}:`, error);
    return [];
  }
}

/**
 * Convert StoredFileMeta array to File objects
 */
export function convertStorageFilesToFiles(storageFiles: StoredFileMeta[]): File[] {
  const files: File[] = [];
  
  for (const storageFile of storageFiles) {
    try {
      // For base64 data URLs, we need to fetch and convert to File
      if (storageFile.url.startsWith('data:')) {
        fetch(storageFile.url)
          .then(response => response.blob())
          .then(blob => {
            const file = new File([blob], storageFile.name, {
              type: storageFile.type,
              lastModified: storageFile.lastModified,
            });
            files.push(file);
          })
          .catch(error => {
            console.error(`Failed to convert file ${storageFile.name}:`, error);
          });
      } else {
        // For other URL types (blob URLs, regular URLs), create a File object
        const file = new File([''], storageFile.name, {
          type: storageFile.type,
          lastModified: storageFile.lastModified,
        });
        files.push(file);
      }
    } catch (error) {
      console.error(`Failed to convert storage file ${storageFile.name}:`, error);
    }
  }
  
  return files;
}

/**
 * Clean up localStorage after successful migration
 */
export function cleanupStorageAfterMigration(productId: string): void {
  try {
    const storageKey = `designFiles_${productId}`;
    localStorage.removeItem(storageKey);
    console.log(`Cleaned up localStorage for product ${productId}`);
  } catch (error) {
    console.error(`Failed to cleanup localStorage for product ${productId}:`, error);
  }
}

/**
 * Check if a product has files in localStorage
 */
export function hasStoredFiles(productId: string): boolean {
  const files = extractDesignFilesFromStorage(productId);
  return files.length > 0;
}
