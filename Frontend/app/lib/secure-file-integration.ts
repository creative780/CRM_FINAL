/**
 * Secure File Integration
 * Provides seamless transition from localStorage to secure backend storage
 */

import { uploadDesignFiles } from '../../lib/design-file-api';
import { extractDesignFilesFromStorage, convertStorageFilesToFiles, cleanupStorageAfterMigration } from '../../lib/design-file-migration';

export interface IntegrationOptions {
  orderId: string | number;
  productId: string;
  description?: string;
  autoCleanup?: boolean;
}

export interface IntegrationResult {
  success: boolean;
  filesUploaded: number;
  filesSkipped: number;
  error?: string;
}

/**
 * Integrate design files: migrate from localStorage to backend
 */
export async function integrateDesignFiles(options: IntegrationOptions): Promise<IntegrationResult> {
  const { orderId, productId, description, autoCleanup = true } = options;
  
  try {
    console.log(`Integrating design files for product ${productId}...`);
    
    // Check if files exist in localStorage
    const storageFiles = extractDesignFilesFromStorage(productId);
    
    if (storageFiles.length === 0) {
      console.log('No files found in localStorage, skipping integration');
      return { success: true, filesUploaded: 0, filesSkipped: 0 };
    }
    
    console.log(`Found ${storageFiles.length} files in localStorage`);
    
    // Convert to File objects
    const filesToUpload = convertStorageFilesToFiles(storageFiles);
    
    if (filesToUpload.length === 0) {
      return { 
        success: false, 
        filesUploaded: 0, 
        filesSkipped: storageFiles.length,
        error: 'Failed to convert storage files' 
      };
    }
    
    // Upload to backend
    const uploadResult = await uploadDesignFiles(
      orderId,
      filesToUpload,
      productId,
      description || `Integrated design files - ${new Date().toISOString()}`
    );
    
    console.log(`Successfully uploaded ${uploadResult.total_files} files`);
    
    // Cleanup localStorage if enabled
    if (autoCleanup && uploadResult.total_files > 0) {
      cleanupStorageAfterMigration(productId);
      console.log('Cleaned up localStorage files');
    }
    
    return { 
      success: true, 
      filesUploaded: uploadResult.total_files,
      filesSkipped: 0 
    };
    
  } catch (error) {
    console.error('Design file integration failed:', error);
    return { 
      success: false, 
      filesUploaded: 0, 
      filesSkipped: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Enhanced save function for ProductConfigModal
 */
export async function enhancedProductSave(
  productData: {
    productId: string;
    orderId: string | number;
    files: File[];
    designReady: boolean;
    needCustom: boolean;
    customRequirements: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { productId, orderId, files, designReady, needCustom, customRequirements } = productData;
    
    // Check if there are files to integrate
    if (files.length > 0) {
      const integrationResult = await integrateDesignFiles({
        orderId,
        productId,
        description: `Design files: Ready=${designReady}, Custom=${needCustom}, Requirements="${customRequirements}"`
      });
      
      if (!integrationResult.success) {
        return { 
          success: false, 
          error: integrationResult.error || 'File integration failed' 
        };
      }
      
      console.log(`Integrated ${integrationResult.filesUploaded} design files`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Enhanced product save failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Check if files need migration for a product
 */
export function needsMigration(productId: string): boolean {
  const storageFiles = extractDesignFilesFromStorage(productId);
  return storageFiles.length > 0;
}

/**
 * Get migration status for all products in an order
 */
export function getMigrationStatus(productIds: string[]): Record<string, boolean> {
  const status: Record<string, boolean> = {};
  
  productIds.forEach(productId => {
    status[productId] = needsMigration(productId);
  });
  
  return status;
}

/**
 * Batch migrate all products that need migration
 */
export async function batchMigrateProducts(
  orderId: string | number,
  productIds: string[]
): Promise<Record<string, IntegrationResult>> {
  const results: Record<string, IntegrationResult> = {};
  
  for (const productId of productIds) {
    if (needsMigration(productId)) {
      try {
        results[productId] = await integrateDesignFiles({
          orderId,
          productId,
          autoCleanup: true
        });
      } catch (error) {
        results[productId] = {
          success: false,
          filesUploaded: 0,
          filesSkipped: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } else {
      results[productId] = {
        success: true,
        filesUploaded: 0,
        filesSkipped: 0
      };
    }
  }
  
  return results;
}
