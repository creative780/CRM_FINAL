"use client";

import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Trash2, 
  Edit3, 
  Eye, 
  FileText, 
  Image, 
  File,
  Check,
  X,
  Save
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  uploadOrderFile, 
  getOrderFiles, 
  deleteOrderFile, 
  updateOrderFile,
  OrderFile 
} from '@/lib/workflowApi';

interface FileManagerProps {
  orderId: number;
  stage: string;
  fileType: string;
  visibleToRoles?: string[];
  onFilesChange?: (files: OrderFile[]) => void;
  className?: string;
}

interface FileWithPreview extends OrderFile {
  previewUrl?: string;
  isImage?: boolean;
}

const FileManager: React.FC<FileManagerProps> = ({
  orderId,
  stage,
  fileType,
  visibleToRoles = ['admin', 'sales', 'designer', 'production', 'delivery'],
  onFilesChange,
  className = ""
}) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingFile, setEditingFile] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editProductRelated, setEditProductRelated] = useState('');

  const currentUsername = typeof window !== 'undefined' ? localStorage.getItem('admin_username') || '' : '';
  const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('admin_role') || 'admin' : 'admin';

  // Load files on mount
  useEffect(() => {
    loadFiles();
  }, [orderId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const orderFiles = await getOrderFiles(orderId);
      
      // Filter files by type and stage
      const filteredFiles = orderFiles.filter(file => 
        file.file_type === fileType && file.stage === stage
      );

      // Add preview URLs for images
      const filesWithPreview = await Promise.all(
        filteredFiles.map(async (file) => {
          const isImage = file.mime_type.startsWith('image/');
          return {
            ...file,
            isImage,
            previewUrl: isImage ? file.file_url : undefined
          };
        })
      );

      setFiles(filesWithPreview);
      onFilesChange?.(filesWithPreview);
    } catch (error: any) {
      console.error('Failed to load files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    setUploading(true);

    try {
      const uploadedFile = await uploadOrderFile(
        orderId,
        file,
        fileType,
        stage,
        `File uploaded by ${currentUsername}`,
        '',
        visibleToRoles
      );

      // Add to local state
      const newFile: FileWithPreview = {
        ...uploadedFile,
        isImage: uploadedFile.mime_type.startsWith('image/'),
        previewUrl: uploadedFile.mime_type.startsWith('image/') ? uploadedFile.file_url : undefined
      };

      setFiles(prev => [newFile, ...prev]);
      onFilesChange?.([newFile, ...files]);
      toast.success('File uploaded successfully!');
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await deleteOrderFile(orderId, fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      onFilesChange?.(files.filter(f => f.id !== fileId));
      toast.success('File deleted successfully!');
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast.error(`Delete failed: ${error.message}`);
    }
  };

  const handleEditFile = (file: FileWithPreview) => {
    setEditingFile(file.id);
    setEditDescription(file.description || '');
    setEditProductRelated(file.product_related || '');
  };

  const handleSaveEdit = async (fileId: number) => {
    try {
      const updatedFile = await updateOrderFile(orderId, fileId, {
        description: editDescription,
        product_related: editProductRelated
      });

      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, ...updatedFile } : f
      ));
      onFilesChange?.(files.map(f => 
        f.id === fileId ? { ...f, ...updatedFile } : f
      ));

      setEditingFile(null);
      toast.success('File updated successfully!');
    } catch (error: any) {
      console.error('Update failed:', error);
      toast.error(`Update failed: ${error.message}`);
    }
  };

  const handleCancelEdit = () => {
    setEditingFile(null);
    setEditDescription('');
    setEditProductRelated('');
  };

  const getFileIcon = (file: FileWithPreview) => {
    if (file.isImage) return <Image className="w-4 h-4" />;
    if (file.mime_type.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canEditFile = (file: FileWithPreview) => {
    return currentUserRole === 'admin' || file.uploaded_by === currentUsername;
  };

  if (loading) {
    return (
      <div className={`p-4 border rounded-lg ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border rounded-lg bg-white ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {fileType.charAt(0).toUpperCase() + fileType.slice(1)} Files
        </h3>
        <label className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload File'}
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.ai,.psd,.sketch,.figma"
          />
        </label>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No {fileType} files uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div key={file.id} className="border rounded-lg p-3 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {file.isImage && file.previewUrl ? (
                    <img
                      src={file.previewUrl}
                      alt={file.file_name}
                      className="w-12 h-12 object-cover rounded border"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                      {getFileIcon(file)}
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {file.file_name}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(file.file_size)}
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      Uploaded by {file.uploaded_by} ({file.uploaded_by_role}) • {formatDate(file.uploaded_at)}
                    </p>

                    {editingFile === file.id ? (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Description"
                          className="w-full px-2 py-1 text-xs border rounded"
                        />
                        <input
                          type="text"
                          value={editProductRelated}
                          onChange={(e) => setEditProductRelated(e.target.value)}
                          placeholder="Related Product"
                          className="w-full px-2 py-1 text-xs border rounded"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSaveEdit(file.id)}
                            className="flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1">
                        {file.description && (
                          <p className="text-xs text-gray-600">{file.description}</p>
                        )}
                        {file.product_related && (
                          <p className="text-xs text-blue-600">Product: {file.product_related}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1 ml-2">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="View/Download"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  
                  {canEditFile(file) && (
                    <>
                      <button
                        onClick={() => handleEditFile(file)}
                        className="p-1 text-gray-400 hover:text-yellow-600"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileManager;


