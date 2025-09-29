/**
 * File storage utilities for localStorage persistence
 * Handles serialization and deserialization of File objects
 */

export interface StoredFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  data: string; // base64 encoded file data
}

export interface StoredFileMeta {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  url?: string; // blob URL for preview
}

/**
 * Convert File object to StoredFile for localStorage
 */
export async function fileToStoredFile(file: File): Promise<StoredFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = result.split(',')[1];
      
      resolve({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        data: base64Data
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert StoredFile back to File object
 */
export function storedFileToFile(storedFile: StoredFile): File {
  const byteCharacters = atob(storedFile.data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: storedFile.type });
  
  return new File([blob], storedFile.name, {
    type: storedFile.type,
    lastModified: storedFile.lastModified
  });
}

/**
 * Convert File to StoredFileMeta (without data, for lightweight storage)
 */
export function fileToStoredFileMeta(file: File, url?: string): StoredFileMeta {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    url
  };
}

/**
 * Save files to localStorage with a given key
 */
export async function saveFilesToStorage(key: string, files: File[]): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    const storedFiles = await Promise.all(files.map(fileToStoredFile));
    localStorage.setItem(key, JSON.stringify(storedFiles));
  } catch (error) {
    console.error('Failed to save files to localStorage:', error);
  }
}

/**
 * Load files from localStorage with a given key
 */
export function loadFilesFromStorage(key: string): File[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    
    const storedFiles: StoredFile[] = JSON.parse(stored);
    return storedFiles.map(storedFileToFile);
  } catch (error) {
    console.error('Failed to load files from localStorage:', error);
    return [];
  }
}

/**
 * Save file metadata to localStorage (lightweight version)
 */
export function saveFileMetaToStorage(key: string, files: File[], urls?: string[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    const fileMetas = files.map((file, index) => 
      fileToStoredFileMeta(file, urls?.[index])
    );
    localStorage.setItem(key, JSON.stringify(fileMetas));
  } catch (error) {
    console.error('Failed to save file metadata to localStorage:', error);
  }
}

/**
 * Save files to localStorage with size validation and fallback to metadata only
 */
export async function saveFilesToStorageSafe(key: string, files: File[]): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    // Check total size before attempting to save
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxSize = 2 * 1024 * 1024; // 2MB limit for localStorage
    
    if (totalSize > maxSize) {
      console.warn(`Files too large (${(totalSize / 1024 / 1024).toFixed(2)}MB), storing metadata only`);
      saveFileMetaToStorage(key, files);
      return;
    }
    
    const storedFiles = await Promise.all(files.map(fileToStoredFile));
    const serialized = JSON.stringify(storedFiles);
    
    // Check if serialized size is still too large
    if (serialized.length > maxSize) {
      console.warn(`Serialized files too large (${(serialized.length / 1024 / 1024).toFixed(2)}MB), storing metadata only`);
      saveFileMetaToStorage(key, files);
      return;
    }
    
    localStorage.setItem(key, serialized);
    console.log(`Files saved successfully (${(serialized.length / 1024).toFixed(2)}KB)`);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, falling back to metadata only');
      saveFileMetaToStorage(key, files);
    } else {
      console.error('Failed to save files to localStorage:', error);
    }
  }
}

/**
 * Load file metadata from localStorage
 */
export function loadFileMetaFromStorage(key: string): StoredFileMeta[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load file metadata from localStorage:', error);
    return [];
  }
}

/**
 * Load files from localStorage with fallback to metadata
 */
export function loadFilesFromStorageSafe(key: string): File[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    
    // Check if it's full file data or just metadata
    if (parsed.length > 0 && parsed[0].data) {
      // Full file data
      return parsed.map(storedFileToFile);
    } else {
      // Just metadata - return empty files with proper names
      console.log('Loading file metadata only (files too large for localStorage)');
      return parsed.map((meta: StoredFileMeta) => {
        const file = new File([], meta.name, { 
          type: meta.type,
          lastModified: meta.lastModified
        });
        Object.defineProperty(file, 'name', {
          value: meta.name,
          writable: false
        });
        return file;
      });
    }
  } catch (error) {
    console.error('Failed to load files from localStorage:', error);
    return [];
  }
}

/**
 * Clear files from localStorage
 */
export function clearFilesFromStorage(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

/**
 * Get storage size for a given key (in bytes)
 */
export function getStorageSize(key: string): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const stored = localStorage.getItem(key);
    return stored ? new Blob([stored]).size : 0;
  } catch (error) {
    console.error('Failed to get storage size:', error);
    return 0;
  }
}
