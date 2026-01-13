/**
 * FileTransferPanel Component
 * Handles file upload/download with drag-and-drop support
 */

import React, { useState, useRef } from 'react';
import { Upload, Download, X, File, CheckCircle, AlertCircle } from 'lucide-react';
import { formatBytes } from '../utils/helpers';

export function FileTransferPanel({
  uploads,
  downloads,
  queueUpload,
  removeUpload,
  removeDownload,
  clearCompletedUploads,
  clearCompletedDownloads
}) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => queueUpload(file));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => queueUpload(file));
    e.target.value = ''; // Reset input
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const renderTransferItem = (item, type) => {
    const isUpload = type === 'upload';
    const statusIcon = {
      queued: <File className="w-4 h-4 text-slate-400" />,
      uploading: <Upload className="w-4 h-4 text-blue-500 animate-pulse" />,
      downloading: <Download className="w-4 h-4 text-blue-500 animate-pulse" />,
      completed: <CheckCircle className="w-4 h-4 text-green-500" />,
      error: <AlertCircle className="w-4 h-4 text-red-500" />
    };

    return (
      <div
        key={item.id}
        className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg"
      >
        <div className="flex-shrink-0">{statusIcon[item.status]}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-slate-200 truncate">
              {item.file?.name || item.filename}
            </p>
            <span className="text-xs text-slate-400 ml-2">
              {Math.round(item.progress)}%
            </span>
          </div>

          <div className="progress-bar mb-1">
            <div
              className="progress-bar-fill"
              style={{ width: `${item.progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {formatBytes(item.loaded)} / {formatBytes(item.total)}
            </span>
            <span className="capitalize">{item.status}</span>
          </div>

          {item.error && (
            <p className="mt-1 text-xs text-red-400">{item.error}</p>
          )}
        </div>

        <button
          onClick={() => isUpload ? removeUpload(item.id) : removeDownload(item.id)}
          className="flex-shrink-0 p-1 hover:bg-slate-700 rounded"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    );
  };

  return (
    <div className="p-4 bg-slate-900 border-t border-slate-700">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          File Transfers
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Upload Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-300">Uploads</h4>
              {uploads.length > 0 && (
                <button
                  onClick={clearCompletedUploads}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear Completed
                </button>
              )}
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`drop-zone p-6 rounded-lg text-center mb-3 cursor-pointer ${
                dragOver ? 'drag-over' : 'bg-slate-800'
              }`}
              onClick={handleBrowse}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-300 mb-1">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-slate-500">
                Maximum file size: 100GB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Upload List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {uploads.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No uploads
                </p>
              ) : (
                uploads.map(upload => renderTransferItem(upload, 'upload'))
              )}
            </div>
          </div>

          {/* Download Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-300">Downloads</h4>
              {downloads.length > 0 && (
                <button
                  onClick={clearCompletedDownloads}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear Completed
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {downloads.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No downloads
                </p>
              ) : (
                downloads.map(download => renderTransferItem(download, 'download'))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
