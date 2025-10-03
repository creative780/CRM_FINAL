"use client";

import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Dialog as HeadlessDialog } from '@headlessui/react';
import { X, FileText, Image, File, Download, AlertCircle, Eye, FileImage, FileSpreadsheet } from 'lucide-react';
import { downloadDesignFile, getDesignFileUrl } from '../../lib/design-file-api';

interface DesignFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  id?: number;  // Backend file ID for secure downloads
  order_file_id?: number;  // Alternative ID format
  blob?: Blob;
  content?: string; // Base64 content for localStorage files
}

interface DesignFilePreviewProps {
  files: DesignFile[];
  onClose: () => void;
  initialFileIndex?: number;
  orderId?: string | number;  // Order ID for secure file operations
}

export default function DesignFilePreview({ files, onClose, initialFileIndex = 0, orderId }: DesignFilePreviewProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(initialFileIndex);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  useEffect(() => {
    setSelectedFileIndex(initialFileIndex);
    setLoading(true);
    setError(null);
  }, [initialFileIndex]);

  const selectedFile = files[selectedFileIndex];

  const getFileType = (fileName: string, mimeType: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Image files
    if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension || '')) {
      return 'image';
    }
    
    // Design files
    if (['ai', 'psd', 'eps', 'sketch'].includes(extension || '')) {
      return 'design';
    }
    
    // PDF files
    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return 'pdf';
    }
    
    // Document files
    if (mimeType.startsWith('application/vnd.openxmlformats-officedocument') || 
        mimeType.startsWith('application/msword') ||
        ['doc', 'docx'].includes(extension || '')) {
      return 'document';
    }
    
    // Vector graphics
    if (['svg'].includes(extension || '')) {
      return 'svg';
    }
    
    return 'unknown';
  };

  const getFileIcon = (fileName: string, mimeType: string) => {
    const fileType = getFileType(fileName, mimeType);
    
    switch (fileType) {
      case 'image':
        return <Image className="w-5 h-5 text-green-600" />;
      case 'design':
        return <FileImage className="w-5 h-5 text-purple-600" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-600" />;
      case 'document':
        return <FileSpreadsheet className="w-5 h-5 text-blue-600" />;
      case 'svg':
        return <FileImage className="w-5 h-5 text-yellow-600" />;
      default:
        return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generatePreviewUrl = (file: DesignFile) => {
    if (file.url) {
      // Ensure URL is valid and properly formatted
      try {
        const url = new URL(file.url, window.location.origin);
        return url.toString();
      } catch (error) {
        // If not a valid URL, treat as relative path
        const cleanUrl = file.url.startsWith('/') ? file.url : '/' + file.url;
        return `${window.location.origin}${cleanUrl}`;
      }
    }
    
    // Check if we have blob data for localStorage files
    if (file.blob) {
      return URL.createObjectURL(file.blob);
    }
    
    // Check if we have base64 content
    if (file.content) {
      const blob = new Blob([file.content], { type: file.type || 'application/octet-stream' });
      return URL.createObjectURL(blob);
    }
    
    return null;
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const clearNotification = () => {
    setNotification(null);
  };

  const renderImagePreview = (file: DesignFile) => {
    const url = generatePreviewUrl(file);
    
    return (
      <div className="flex items-center justify-center h-full">
        <img 
          src={url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNDAwIDMwMCI+PGRlZnM+PHBhdHRlcm4gaWQ9Im5vSW1hZ2UiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI0MTAiIGhlaWdodD0iMzEwIj48cmVjdCB3aWR0aD0iNDEwIiBoZWlnaHQ9IjMxMCIgZmlsbD0iI2U1ZTdlZCIvPjxnIGZpbGw9IiNkMWQ1ZGIiPjxyZWN0IHg9IjIwNSIgeT0iMTIyIiB3aWR0aD0iNDEwIiBoZWlnaHQ9IjIwIi8+PHJlY3QgeD0iMjA1IiB5PSIyNzAiIHdpZHRoPSI0MTAiIGhlaWdodD0iMjAiLz48L2c+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI25vSW1hZ2UpIi8+PC9zdmc+'} 
          alt={file.name}
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError('Failed to load image preview');
            setLoading(false);
          }}
        />
      </div>
    );
  };

  const renderPDFPreview = (file: DesignFile) => {
    const url = generatePreviewUrl(file);
    
    return (
      <div className="w-full h-full">
        <iframe
          src={url || '#'}
          className="w-full h-full border-0 rounded-lg"
          title={file.name}
          onLoad={() => setLoading(false)}
          onError={() => {
            setError('Failed to load PDF preview');
            setLoading(false);
          }}
        />
      </div>
    );
  };

  const renderSVGPreview = (file: DesignFile) => {
    const url = generatePreviewUrl(file);
    
    return (
      <div className="flex items-center justify-center h-full">
        <object
          data={url || '#'}
          type="image/svg+xml"
          className="max-w-full max-h-full"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError('Failed to load SVG preview');
            setLoading(false);
          }}
        >
          <div className="text-center text-gray-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>SVG preview not available</p>
          </div>
        </object>
      </div>
    );
  };

  const renderDesignFilePreview = (file: DesignFile) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
          extension === 'ai' ? 'bg-orange-100' : 'bg-purple-100'
        }`}>
          <FileImage className={`w-10 h-10 ${
            extension === 'ai' ? 'text-orange-600' : 'text-purple-600'
          }`} />
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {extension?.toUpperCase()} Design File
        </h3>
        
        <p className="text-gray-600 mb-4 max-w-md">
          {extension === 'ai' 
            ? 'Adobe Illustrator files require Adobe Illustrator or compatible software to view.'
            : extension === 'psd'
            ? 'Adobe Photoshop files require Adobe Photoshop or compatible software to view.'
            : 'This design format requires specialized software for preview.'
          }
        </p>
        
        <div className="space-y-3">
          <div className="bg-white border rounded-lg p-4 max-w-sm">
            <h4 className="font-medium text-gray-900 mb-2">Preview Options:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Download and open with Adobe software</li>
              <li>• Use online converters (CloudConvert, Zamzar)</li>
              <li>• Open with compatible design tools</li>
            </ul>
          </div>
          
          <button 
            onClick={() => handleDownload(file)}
            disabled={downloadingFiles.has(file.name)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 mx-auto transition-colors"
          >
            {downloadingFiles.has(file.name) ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download File
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderDocumentPreview = (file: DesignFile) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
          <FileSpreadsheet className="w-10 h-10 text-blue-600" />
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {extension?.toUpperCase()} Document
        </h3>
        
        <p className="text-gray-600 mb-4 max-w-md">
          Microsoft Word documents can be viewed online or downloaded for offline use.
        </p>
        
        <div className="space-y-3">
          <div className="bg-white border rounded-lg p-4 max-w-sm">
            <h4 className="font-medium text-gray-900 mb-2">Preview Options:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• View online with Office 365</li>
              <li>• Convert to PDF for preview</li>
              <li>• Download and open with Microsoft Word</li>
            </ul>
          </div>
          
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => handleOnlineView(file)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
            >
              <Eye className="w-4 h-4" />
              View Online
            </button>
            
            <button 
              onClick={() => handleDownload(file)}
              disabled={downloadingFiles.has(file.name)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {downloadingFiles.has(file.name) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFilePreview = (file: DesignFile) => {
    const fileType = getFileType(file.name, file.type);
    
    // Show loading state
    if (loading && fileType !== 'design' && fileType !== 'document' && fileType !== 'unknown') {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading preview...</p>
          </div>
        </div>
      );
    }
    
    // Show error state
    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                setLoading(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    
    switch (fileType) {
      case 'image':
        return renderImagePreview(file);
      case 'pdf':
        return renderPDFPreview(file);
      case 'svg':
        return renderSVGPreview(file);
      case 'design':
        return renderDesignFilePreview(file);
      case 'document':
        return renderDocumentPreview(file);
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <File className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium mb-2">Preview not available</p>
            <p className="text-sm text-gray-400 mb-4">This file type cannot be previewed</p>
            <button 
              onClick={() => handleDownload(file)}
              disabled={downloadingFiles.has(file.name)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {downloadingFiles.has(file.name) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download File
                </>
              )}
            </button>
          </div>
        );
    }
  };

  const handleFileOpen = (file: DesignFile) => {
    const url = generatePreviewUrl(file);
    if (url) {
      window.open(url, '_blank');
      showNotification('info', `Opening ${file.name} in new tab`);
    } else {
      showNotification('error', 'File URL not available');
    }
  };

  const handleDownload = async (file: DesignFile) => {
    setDownloadingFiles(prev => new Set(prev).add(file.name));
    
    try {
      // Check if we have backend file ID for secure download
      const fileId = file.id || file.order_file_id;
      
      if (fileId && orderId) {
        // Use secure backend download
        await downloadDesignFile(orderId, fileId);
        showNotification('success', `Download completed: ${file.name}`);
      } else {
        // Try multiple fallback approaches
        let downloadUrl = null;
        
        // 1. Try generatePreviewUrl first
        downloadUrl = generatePreviewUrl(file);
        
        // 2. If no URL from generatePreviewUrl, try file.url directly
        if (!downloadUrl && file.url) {
          downloadUrl = file.url;
        }
        
        // 3. If still no URL, try blob data (for localStorage files)
        if (!downloadUrl && file.blob) {
          downloadUrl = URL.createObjectURL(file.blob);
        }
        
        // 4. If we have file content in base64
        if (!downloadUrl && file.content) {
          const blob = new Blob([file.content], { type: file.type || 'application/octet-stream' });
          downloadUrl = URL.createObjectURL(blob);
        }
        
        if (!downloadUrl) {
          // Last resort: try to create a download from the file name
          showNotification('error', `Download not available for ${file.name}. File may not be accessible.`);
          return;
        }
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = file.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL if we created one
        if (downloadUrl.startsWith('blob:')) {
          URL.revokeObjectURL(downloadUrl);
        }
        
        showNotification('success', `Download started: ${file.name}`);
      }
      
      setTimeout(() => {
        setDownloadingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(file.name);
          return newSet;
        });
      }, 2000);
      
    } catch (error) {
      console.error('Download error:', error);
      showNotification('error', `Failed to download ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.name);
        return newSet;
      });
    }
  };

  const handleOnlineView = (file: DesignFile) => {
    const url = generatePreviewUrl(file);
    if (url) {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
      window.open(officeViewerUrl, '_blank');
      showNotification('info', `Opening ${file.name} in Office 365 viewer`);
    } else {
      showNotification('error', 'File URL not available for online viewing');
    }
  };

  return (
    <HeadlessDialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <HeadlessDialog.Panel className="relative w-full max-w-7xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gray-50">
            <HeadlessDialog.Title className="text-xl font-semibold text-gray-900">
              Design Files Preview ({files.length} files)
            </HeadlessDialog.Title>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* File List Sidebar */}
            <div className="w-80 border-r bg-gray-50 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Files</h3>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedFileIndex(index);
                        setLoading(true);
                        setError(null);
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                        selectedFileIndex === index
                          ? 'bg-blue-100 border-blue-300 text-blue-900 shadow-sm'
                          : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.name, file.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* File Preview */}
            <div className="flex-1 flex flex-col">
              {selectedFile ? (
                <>
                  {/* Preview Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b bg-white">
                    <div className="flex items-center gap-3">
                      {getFileIcon(selectedFile.name, selectedFile.type)}
                      <div>
                        <h3 className="font-medium text-gray-900">{selectedFile.name}</h3>
                        <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                     <div className="flex gap-2 mt-2 sm:mt-0">
                       <button
                         onClick={() => handleFileOpen(selectedFile)}
                         className="px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 flex items-center gap-2 text-sm transition-colors"
                       >
                         <Eye className="w-4 h-4" />
                         Open Original
                       </button>
                       <button
                         onClick={() => handleDownload(selectedFile)}
                         disabled={downloadingFiles.has(selectedFile.name)}
                         className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                       >
                         {downloadingFiles.has(selectedFile.name) ? (
                           <>
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                             Downloading...
                           </>
                         ) : (
                           <>
                             <Download className="w-4 h-4" />
                             Download
                           </>
                         )}
                       </button>
                     </div>
                  </div>

                  {/* Preview Content */}
                  <div className="flex-1 p-6 overflow-auto bg-gray-100">
                    {renderFilePreview(selectedFile)}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-100">
                  <div className="text-center">
                    <File className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-lg">No files to preview</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </HeadlessDialog.Panel>
      </div>

      {/* Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-[9999]">
          <div className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${
            notification.type === 'error' ? 'border-l-4 border-red-500' :
            notification.type === 'success' ? 'border-l-4 border-green-500' :
            'border-l-4 border-blue-500'
          }`}>
            <div className="p-4">
              <div className="flex items-start">
                <div className={`flex-shrink-0 ${
                  notification.type === 'error' ? 'text-red-400' :
                  notification.type === 'success' ? 'text-green-400' :
                  'text-blue-400'
                }`}>
                  {notification.type === 'error' ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : notification.type === 'success' ? (
                    <Download className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className={`text-sm font-medium ${
                    notification.type === 'error' ? 'text-red-800' :
                    notification.type === 'success' ? 'text-green-800' :
                    'text-blue-800'
                  }`}>
                    {notification.message}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    onClick={clearNotification}
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </HeadlessDialog>
  );
}
