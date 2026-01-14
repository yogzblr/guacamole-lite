/**
 * useFileTransfer hook
 * Manages file upload/download operations
 */

import { useState, useCallback, useRef } from 'react';
import fileTransferService from '../services/fileTransferService';
import { generateId } from '../utils/helpers';

export function useFileTransfer(tunnelId) {
  const [uploads, setUploads] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const uploadQueue = useRef([]);

  /**
   * Add file to upload queue
   */
  const queueUpload = useCallback((file) => {
    const upload = {
      id: generateId(),
      file,
      status: 'queued',
      progress: 0,
      loaded: 0,
      total: file.size,
      error: null
    };

    setUploads(prev => [...prev, upload]);
    uploadQueue.current.push(upload);

    // Start processing queue
    processUploadQueue();

    return upload.id;
  }, []);

  /**
   * Process upload queue
   */
  const processUploadQueue = useCallback(async () => {
    if (uploadQueue.current.length === 0) return;

    const upload = uploadQueue.current[0];

    // Update status to uploading
    setUploads(prev => prev.map(u =>
      u.id === upload.id ? { ...u, status: 'uploading' } : u
    ));

    try {
      // Use a simple stream index for now
      const streamIndex = Date.now().toString();

      await fileTransferService.uploadFile(
        tunnelId,
        streamIndex,
        upload.file,
        (progress, loaded, total) => {
          setUploads(prev => prev.map(u =>
            u.id === upload.id
              ? { ...u, progress, loaded, total }
              : u
          ));
        }
      );

      // Mark as complete
      setUploads(prev => prev.map(u =>
        u.id === upload.id
          ? { ...u, status: 'completed', progress: 100 }
          : u
      ));

    } catch (error) {
      // Mark as error
      setUploads(prev => prev.map(u =>
        u.id === upload.id
          ? { ...u, status: 'error', error: error.message }
          : u
      ));
    }

    // Remove from queue and process next
    uploadQueue.current.shift();
    if (uploadQueue.current.length > 0) {
      processUploadQueue();
    }
  }, [tunnelId]);

  /**
   * Download file from remote
   */
  const downloadFile = useCallback(async (streamIndex, filename) => {
    const download = {
      id: generateId(),
      filename,
      status: 'downloading',
      progress: 0,
      loaded: 0,
      total: 0,
      error: null
    };

    setDownloads(prev => [...prev, download]);

    try {
      await fileTransferService.downloadFile(
        tunnelId,
        streamIndex,
        filename,
        (progress, loaded, total) => {
          setDownloads(prev => prev.map(d =>
            d.id === download.id
              ? { ...d, progress, loaded, total }
              : d
          ));
        }
      );

      // Mark as complete
      setDownloads(prev => prev.map(d =>
        d.id === download.id
          ? { ...d, status: 'completed', progress: 100 }
          : d
      ));

    } catch (error) {
      // Mark as error
      setDownloads(prev => prev.map(d =>
        d.id === download.id
          ? { ...d, status: 'error', error: error.message }
          : d
      ));
    }
  }, [tunnelId]);

  /**
   * Remove upload from list
   */
  const removeUpload = useCallback((id) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  /**
   * Remove download from list
   */
  const removeDownload = useCallback((id) => {
    setDownloads(prev => prev.filter(d => d.id !== id));
  }, []);

  /**
   * Clear all completed uploads
   */
  const clearCompletedUploads = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status !== 'completed'));
  }, []);

  /**
   * Clear all completed downloads
   */
  const clearCompletedDownloads = useCallback(() => {
    setDownloads(prev => prev.filter(d => d.status !== 'completed'));
  }, []);

  return {
    uploads,
    downloads,
    queueUpload,
    downloadFile,
    removeUpload,
    removeDownload,
    clearCompletedUploads,
    clearCompletedDownloads
  };
}
