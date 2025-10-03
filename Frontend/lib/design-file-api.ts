/**
 * Design File API Integration
 * Provides secure functions to upload, download, and manage design files
 * INTEGRATES WITH: Secure backend storage system
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface DesignFileMeta {
  id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
  product_related?: string;
  description?: string;
}

export interface UploadResponse {
  uploaded_files: Array<{
    file_id: number;
    file_url: string;
    file_name: string;
    file_size: number;
    mime_type: string;
  }>;
  total_files: number;
  status: string;
  message: string;
}

/**
 * Upload design files to backend storage
 * SECURE: Validates file types, sizes, and stores with complete metadata
 */
export async function uploadDesignFiles(
  orderId: string | number,
  files: File[],
  productId?: string,
  description?: string
): Promise<UploadResponse> {
  // Validate files before upload
  const validationResult = validateDesignFiles(files);
  if (!validationResult.valid) {
    throw new Error(validationResult.error);
  }

  // Create form data
  const formData = new FormData();
  
  // Add files
  files.forEach(file => {
    formData.append('files', file);
  });
  
  // Add metadata
  formData.append('order_id', orderId.toString());
  if (productId) {
    formData.append('product_id', productId);
  }
  if (description) {
    formData.append('description', description);
  }

  try {
    const response = await fetch(`${API_BASE}/api/orders/${orderId}/design-files/upload/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const result: UploadResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Design file upload error:', error);
    throw error;
  }
}

/**
 * Download design file securely
 */
export async function downloadDesignFile(
  orderId: string | number,
  fileId: number
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/orders/${orderId}/design-files/${fileId}/download/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    // Get filename from response headers
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : 'design_file';

    // Create download link
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Design file download error:', error);
    throw error;
  }
}

/**
 * Get design file URL for preview
 */
export async function getDesignFileUrl(
  orderId: string | number,
  fileId: number
): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/api/orders/${orderId}/design-files/${fileId}/url/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get file URL: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url || null;
  } catch (error) {
    console.error('Get design file URL error:', error);
    return null;
  }
}

/**
 * List all design files for an order
 */
export async function listDesignFiles(orderId: string | number): Promise<DesignFileMeta[]> {
  try {
    const response = await fetch(`${API_BASE}/api/orders/${orderId}/design-files/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list design files');
    }

    const data = await response.json();
    return data.design_files || [];
  } catch (error) {
    console.error('List design files error:', error);
    throw error;
  }
}

/**
 * Delete a design file
 */
export async function deleteDesignFile(
  orderId: string | number,
  fileId: number
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/api/orders/${orderId}/design-files/${fileId}/delete/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete design file');
    }
  } catch (error) {
    console.error('Delete design file error:', error);
    throw error;
  }
}

/**
 * Validate design files before upload
 */
function validateDesignFiles(files: File[]): { valid: boolean; error?: string } {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/svg+xml'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.doc', '.docx'];
  
  const maxSize = 50 * 1024 * 1024; // 50MB

  for (const file of files) {
    // Check file size
    if (file.size > maxSize) {
      return { valid: false, error: `File "${file.name}" exceeds 50MB limit` };
    }

    // Check file type
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      return { valid: false, error: `File type "${fileExt}" not allowed` };
    }

    // Check MIME type
    if (file.type && !allowedTypes.includes(file.type)) {
      return { valid: false, error: `File "${file.name}" has invalid MIME type: ${file.type}` };
    }
  }

  return { valid: true };
}

/**
 * Migrate local storage files to backend storage
 * HELPER: Converts localStorage files to properly stored backend files
 */
export async function migrateFilesToBackendStorage(
  orderId: string | number,
  productId: string,
  localStorageFiles: Array<{name: string, size: number, type: string, data: any}>
): Promise<UploadResponse> {
  // Convert localStorage data to File objects
  const files: File[] = [];
  
  for (const localFile of localStorageFiles) {
    // Create File object from localStorage data
    // Note: This is a simplified implementation - in practice, you'd need to handle different storage formats
    const blob = new Blob([localFile.data], { type: localFile.type });
    const file = new File([blob], localFile.name, { type: localFile.type });
    files.push(file);
  }

  if (files.length === 0) {
    throw new Error('No valid files to migrate');
  }

  // Upload files to backend
  return await uploadDesignFiles(orderId, files, productId, 'Migrated from localStorage');
}

/**
 * Enhanced browser file access utilities
 */
export function getUserFiles(): File[] {
  // Helper function to get files from browser File API
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.accept = '.jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.doc,.docx';
  
  return []; // This would be populated when user selects files
}
