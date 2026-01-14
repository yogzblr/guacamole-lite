/**
 * File transfer service
 * Handles HTTP file upload/download
 */

import { API_URL } from '../utils/constants';

export class FileTransferService {
  /**
   * Upload file to remote via HTTP
   * @param {string} tunnelId - Tunnel/connection ID
   * @param {string} streamIndex - Stream index
   * @param {File} file - File to upload
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<object>} Upload result
   */
  async uploadFile(tunnelId, streamIndex, file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress, e.loaded, e.total);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            resolve({ success: true });
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed: Network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      const url = `${API_URL}/tunnels/${tunnelId}/streams/${streamIndex}/${encodeURIComponent(file.name)}`;
      xhr.open('POST', url);
      xhr.send(formData);
    });
  }

  /**
   * Download file from remote via HTTP
   * @param {string} tunnelId - Tunnel/connection ID
   * @param {string} streamIndex - Stream index
   * @param {string} filename - Filename
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Blob>} Downloaded file blob
   */
  async downloadFile(tunnelId, streamIndex, filename, onProgress) {
    const url = `${API_URL}/tunnels/${tunnelId}/streams/${streamIndex}/${encodeURIComponent(filename)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      loaded += value.length;

      if (onProgress && total > 0) {
        const progress = (loaded / total) * 100;
        onProgress(progress, loaded, total);
      }
    }

    // Combine chunks into single blob
    const blob = new Blob(chunks);

    // Trigger download
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    return blob;
  }

  /**
   * Get tunnel ID from client
   * This is a simplified version - in production you'd get this from the connection
   * @returns {string} Tunnel ID
   */
  getTunnelId() {
    // In production, this would be extracted from the Guacamole client
    // For now, we'll use a placeholder that needs to be set by the component
    return this.tunnelId || 'unknown';
  }

  /**
   * Set tunnel ID
   * @param {string} tunnelId - Tunnel ID
   */
  setTunnelId(tunnelId) {
    this.tunnelId = tunnelId;
  }
}

export default new FileTransferService();
