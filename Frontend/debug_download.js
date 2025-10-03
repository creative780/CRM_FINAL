const fs = require('fs');
const path = 'app/components/modals/DesignFilePreviewModal.tsx';

// Read the file
let fileContent = fs.readFileSync(path, 'utf8');

// Add debugging and improve the condition checking
const oldLogic = `    try {
 orchestral Download Logic: 
      // Handle different file sources for download
      if (file.content) {
        // Download localStorage/temporary files (base64 content)
        downloadBase64File(file.content, file.file_name, file.mime_type);
      } else if (file.blob) {
        // Download blob files
        downloadBlobFile(file.blob, file.file_name);
      } else if (typeof file.file_id === 'number' && file.file_id > 0) {
        // Download backend files
        await downloadDesignFile(orderId, file.file_id);
      } else {
        console.error('No valid file source available for download');`;
        
const newLogic = `    // Debug: Log file structure to understand the issue
    console.log('🔍 Download Debug - File structure:', {
      fileName: file.file_name,
      fileId: file.file_id,
      fileIdType: typeof file.file_id,
      hasContent: !!file.content,
      hasBlob: !!file.blob,
      hasUrl: !!file.url,
      mimeType: file.mime_type,
      contentLength: file.content ? file.content.length : 0
    });
    
    try {
      // Handle different file sources for download - prioritize localStorage files
      if (file.content && file.content.length > 0) {
        // Download localStorage/temporary files (base64 content)
        console.log('📥 Using base64 content for download');
        downloadBase64File(file.content, file.file_name, file.mime_type);
      } else if (file.blob) {
        // Download blob files
        console.log('📥 Using blob data for download');
        downloadBlobFile(file.blob, file.file_name);
      } else if (file.url) {
        // Download files with direct URLs
        console.log('📥 Using direct URL for download');
        downloadDirectFile(file.url, file.file_name);
      } else if (file.file_id && typeof file.file_id === 'number' && file.file_id > 0) {
        // Only try backend for files with legit backend IDs (avoid null/0)
        console.log('📥 Using backend API for download');
        await downloadDesignFile(orderId, file.file_id);
      } else {
        console.error('❌ No valid file source available for download. File structure:', file);`;

fileContent = fileContent.replace(oldLogic, newLogic);

// Also update the else condition
fileContent = fileContent.replace(
  "        alert('This file cannot be downloaded.');",
  "        alert(`Cannot download file \"${file.file_name}\": No valid file source found.`);"
);

// Add the downloadDirectFile helper function if it doesn't exist
if (!fileContent.includes('downloadDirectFile')) {
  // Find a good place to insert the helper function
  const insertPoint = '  const downloadBlobFile = (blob: Blob, fileName: string) => {';
  const directUrlHelper = `  // Helper function to download direct URL files
  const downloadDirectFile = (url: string, fileName: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank'; // Open in new tab as fallback
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download direct URL:', error);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };`;

  fileContent = fileContent.replace(insertPoint, directUrlHelper + '\n\n  ' + insertPoint);
}

// Write back to file
fs.writeFileSync(path, fileContent, 'utf8');

console.log('✅ Added debugging and enhanced download logic');

