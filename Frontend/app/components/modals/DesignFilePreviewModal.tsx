"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Download, FileText, Image as ImageIcon, File, ChevronLeft, ChevronRight, Eye, AlertCircle, Loader } from 'lucide-react';
import { getDesignFileUrl, downloadDesignFile } from '@/lib/design-file-api';

interface DesignFile {
  file_id: number | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  url?: string; // For backend files
  content?: string; // For localStorage/temporary files (base64)
  blob?: Blob; // For blob objects
}

interface DesignFilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  files: DesignFile[];
  orderCode: string;
}

export default function DesignFilePreviewModal({
  isOpen,
  onClose,
  orderId,
  files,
  orderCode
}: DesignFilePreviewModalProps) {
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());

  const currentFile = files[currentFileIndex];

  // Load file URLs when modal opens
  const loadFileUrls = useCallback(async () => {
    if (files.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
          try {
            // Check if this is a backend file (has valid numeric ID)
            if (typeof file.file_id === 'number' && file.file_id > 0 && !file.content && !file.url) {
              const backendUrl = await getDesignFileUrl(orderId, file.file_id);
              if (backendUrl) {
                return backendUrl;
              }
            }
            
            // Handle localStorage/temporary files
            if (file.content) {
              // Convert base64 to blob URL
              const blob = new Blob([file.content], { type: file.mime_type });
              return URL.createObjectURL(blob);
            }
            
            // Has direct URL
            if (file.url) {
              return file.url;
            }
            
            // Handle blob objects
            if (file.blob) {
              return URL.createObjectURL(file.blob);
            }
            
            console.warn(`No valid file source found for ${file.file_name}`);
            return null;
          } catch (error) {
            console.error(`Failed to load URL for file ${file.file_name}:`, error);
            return null;
          }
        })
      );
      
      setFileUrls(urls.filter(Boolean) as string[]);
    } catch (error) {
      console.error('Failed to load file URLs:', error);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [files, orderId]);

  useEffect(() => {
    if (isOpen && files.length > 0) {
      loadFileUrls();
    } else {
      setFileUrls([]);
      setCurrentFileIndex(0);
      setError(null);
    }
  }, [isOpen, loadFileUrls]);

  // Cleanup blob URLs when modal closes
  useEffect(() => {
    return () => {
      fileUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [fileUrls]);

  const handlePrevFile = () => {
    setCurrentFileIndex(prev => prev === 0 ? files.length - 1 : prev - 1);
  };

  const handleNextFile = () => {
    setCurrentFileIndex(prev => prev === files.length - 1 ? 0 : prev + 1);
  };

  const handleDownload = async (file: DesignFile) => {
    setDownloadingFiles(prev => new Set(prev).add(file.file_name));
    console.log("🔽 Downloading file:", file.file_name);
    console.log("📄 File properties:", {
      file_id: file.file_id,
      hasContent: !!file.content,
      hasBlob: !!file.blob,
      hasUrl: !!file.url,
      mimeType: file.mime_type
    });
    
    try {
      // Handle different file sources for download
      if (file.content) {
        // Download localStorage/temporary files (base64 content)
        console.log("📦 Downloading from base64 content");
        downloadBase64File(file.content, file.file_name, file.mime_type);
      } else if (file.blob) {
        // Download blob files
        console.log("🗃️ Downloading from blob object");
        downloadBlobFile(file.blob, file.file_name);
      } else if (file.url) {
        // Download from direct URL
        console.log("🌐 Downloading from direct URL");
        downloadDirectFile(file.url, file.file_name);
      } else if (file.file_id && typeof file.file_id === 'number' && file.file_id > 0) {
        // Download backend files
        console.log("⚙️ Downloading from backend API, file_id:", file.file_id, "orderId:", orderId);
        await downloadDesignFile(orderId, file.file_id);
      } else {
        console.error("❌ No valid file source available for download:", file);
        alert(`Cannot download "${file.file_name}". File source not available.`);
      }
    } catch (error) {
      console.error('💥 Download failed for', file.file_name, ':', error);
      alert(`Failed to download "${file.file_name}". Please try again.`);
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.file_name);
        return newSet;
      });
    }
  };

  // Helper function to download base64 files
  const downloadBase64File = (base64Content: string, fileName: string, mimeType: string) => {
    try {
      // Convert base64 to blob
      const byteCharacters = atob(base64Content);
      const byteArrays = new Uint8Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays[i] = byteCharacters.charCodeAt(i);
      }
      
      const blob = new Blob([byteArrays], { type: mimeType });
      downloadBlobFile(blob, fileName);
    } catch (error) {
      console.error('Failed to convert base64 to blob:', error);
      throw error;
    }
  };

  // Helper function to download blob files
  // Helper function to download direct URL files
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
  };

    const downloadBlobFile = (blob: Blob, fileName: string) => {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download blob:', error);
      throw error;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-green-600" />;
    }
    if (mimeType.includes('pdf')) {
      return <FileText className="w-8 h-8 text-red-600" />;
    }
    return <File className="w-8 h-8 text-blue-600" />;
  };

  const renderFilePreview = () => {
    const currentUrl = fileUrls[currentFileIndex];
    
    if (!currentUrl) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <AlertCircle className="w-8 h-8 mr-2" />
          No preview available
        </div>
      );
    }

    if (currentFile.mime_type.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <img
            src={currentUrl}
            alt={currentFile.file_name}
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center h-64 text-gray-500"><AlertCircle class="w-8 h-8 mr-2"/>Image failed to load</div>';
            }}
          />
        </div>
      );
    }

    if (currentFile.mime_type.includes('pdf')) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <iframe
            src={currentUrl}
            className="w-full h-full rounded-lg"
            title={currentFile.file_name}
          />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          {getFileIcon(currentFile.mime_type)}
          <p className="mt-2 text-sm">{currentFile.file_name}</p>
          <p className="text-xs text-gray-400">Preview not available for this file type</p>
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Transition show={isOpen}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-6xl max-h-[90vh] transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all flex flex-col">
              {/* Header */}
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center">
                Design Files Preview - {orderCode}
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-2 py-1 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Title>

              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-gray-600">Loading files...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                    <p className="text-red-600">{error}</p>
                    <button
                      onClick={loadFileUrls}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm underline"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* File Navigation */}
                  {files.length > 1 && (
                    <div className="flex items-center justify-between mt-4 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          File {currentFileIndex + 1} of {files.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handlePrevFile}
                          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                          disabled={loading}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleNextFile}
                          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                          disabled={loading}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* File Preview */}
                  <div className="flex-1 min-h-0">
                    <div className="h-full">
                      {renderFilePreview()}
                    </div>
                  </div>

                  {/* File Info and Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          {getFileIcon(currentFile.mime_type)}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {currentFile.file_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(currentFile.file_size)} • {currentFile.mime_type}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleDownload(currentFile)}
                          disabled={downloadingFiles.has(currentFile.file_name)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {downloadingFiles.has(currentFile.file_name) ? (
                            <>
                              <Loader className="w-4 h-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* File List */}
                  {files.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-900 mb-2">All Files ({files.length})</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                        {files.map((file, index) => (
                          <div
                            key={file.file_id}
                            onClick={() => setCurrentFileIndex(index)}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                              index === currentFileIndex
                                ? 'bg-blue-50 border border-blue-200'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            {getFileIcon(file.mime_type)}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {file.file_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.file_size)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}