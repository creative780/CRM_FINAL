/**
 * Design File Migration Utility
 * Migrates localStorage design files to secure backend storage
 */

import { uploadDesignFiles, DesignFileMeta } from './design-file-api';

export interface LocalStorageDesignFile {
  name: string;
  size: number;
  type: string;
  data: string; // Base64 encoded file data
  lastModified?: number;
}

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errorCount: number;
  errors: string[];
  uploadedFiles: DesignFileMeta[];
}

/**
 * Extract design files from localStorage for a specific product
 */
export function extractDesignFilesFromStorage(productId: string): LocalStorageDesignFile[] {
  try {
    const key = `productDesignFiles_${productId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return [];
    }
    
    const files: LocalStorageDesignFile[] = JSON.parse(stored);
    return Array.isArray(files) ? files : [];
  } catch (error) {
    console.error(`Failed to extract design files for product ${productId}:`, error);
    return [];
  }
}

/**
 * Convert localStorage file data to actual File objects
 */
export function convertStorageFilesToFiles(files: LocalStorageDesignFile[]): File[] {
  const convertedFiles: File[] = [];
  
  for (const file of files) {
    try {
      // Convert base64 data to binary
      const binaryString = atob(file.data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create File object
      const fileObj = new File([bytes], file.name, {
        type: file.type,
        lastModified: file.lastModified || Date.now()
      });
      
      convertedFiles.push(fileObj);
    } catch (error) {
      console.error(`Failed to convert file ${file.name}:`, error);
    }
  }
  
  return convertedFiles;
}

/**
 * Migrate design files from localStorage to backend storage
 */
export async function migrateDesignFilesToBackend(
  orderId: string | number,
  productId: string,
  description?: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    errorCount: 0,
    errors: [],
    uploadedFiles: []
  };
  
  try {
    console.log(`Starting migration for product ${productId} in order ${orderId}`);
    
    // Extract files from localStorage
    const localStorageFiles = extractDesignFilesFromStorage(productId);
    
    if (localStorageFiles.length === 0) {
      console.log('No files found in localStorage for migration');
      result.success = true;
      return result;
    }
    
    console.log(`Found ${localStorageFiles.length} files in localStorage`);
    
    // Convert to File objects
    const filesToUpload = convertStorageFilesToFiles(localStorageFiles);
    
    if (filesToUpload.length === 0) {
      result.errors.push('No valid files could be converted for upload');
      return result;
    }
    
    // Upload files to backend
    const uploadResult = await uploadDesignFiles(
      orderId,
      filesToUpload,
      productId,
      description || `Migrated from localStorage - ${new Date().toISOString()}`
    );
    
    result.migratedCount = uploadResult.total_files;
    result.uploadedFiles = uploadResult.uploaded_files.map(file => ({
      id: file.file_id,
      file_name: file.file_name,
      file_url: file.file_url,
      file_size: file.file_size,
      mime_type: file.mime_type,
      uploaded_by: 'migration',
      uploaded_at: new Date().toISOString()
    }));
    
    result.success = true;
    
    console.log(`Successfully migrated ${result.migratedCount} files`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    result.errorCount++;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }
  
  return result;
}

/**  
 * Clean up localStorage after successful migration
 */
export function cleanupStorageAfterMigration(productId: string): void {
  try {
    const keys = [
      `productDesignFiles_${productId}`,
      `design_files_manifest_${productId}`,
      `custom_requirements_${productId}`,
      `ready_design_${productId}`,
      `need_custom_design_${productId}`
    ];
    
    keys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`Cleaned up localStorage for product ${productId}`);
  } catch (error) {
    console.error('Failed to cleanup localStorage:', error);
  }
}

/**
 * Batch migrate all products in localStorage
 */
export async function migrateAllDesignFiles(
  orderId: string | number,
  productIds: string[]
): Promise<Record<string, MigrationResult>> {
  const results: Record<string, MigrationResult> = {};
  
  console.log(`Starting batch migration for ${productIds.length} products`);
  
  for (const productId of productIds) {
    try {
      console.log(`Migrating product ${productId}...`);
      
      const result = await migrateDesignFilesToBackend(orderId, productId);
      results[productId] = result;
      
      // Cleanup on success
      if (result.success && result.migratedCount > 0) {
        cleanupStorageAfterMigration(productId);
      }
      
    } catch (error) {
      results[productId] = {
        success: false,
        migratedCount: 0,
        errorCount: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        uploadedFiles: []
      };
    }
  }
  
  return results;
}

/**
 * Get migration statistics
 */
export function getMigrationStats(results: Record<string, MigrationResult>) {
  const stats = {
    totalProducts: Object.keys(results).length,
    successfulProducts: 0,
    totalFilesMigrated: 0,
    totalErrors: 0,
    productsWithErrors: 0
  };
  
  Object.values(results).forEach(result => {
    if (result.success) {
      stats.successfulProducts++;
    }
    
    stats.totalFilesMigrated += result.migratedCount;
    stats.totalErrors += result.errorCount;
    
    if (result.errorCount > 0) {
      stats.productsWithErrors++;
    }
  });
  
  return stats;
}

