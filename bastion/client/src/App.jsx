/**
 * Main App Component
 * Guacamole Bastion Client Application
 */

import React, { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { ConnectionControls } from './components/ConnectionControls';
import { GuacamoleClient } from './components/GuacamoleClient';
import { ClipboardManager } from './components/ClipboardManager';
import { FileTransferPanel } from './components/FileTransferPanel';
import { useGuacamole } from './hooks/useGuacamole';
import { useClipboard } from './hooks/useClipboard';
import { useFileTransfer } from './hooks/useFileTransfer';
import { parseQueryParams } from './utils/helpers';

function App() {
  const [token, setToken] = useState(null);
  const [tunnelId, setTunnelId] = useState(null);
  const [connectionInfo, setConnectionInfo] = useState(null);

  // Guacamole connection hook
  const {
    state,
    error,
    client,
    connect,
    disconnect,
    setupDisplay,
    sendClipboard,
    isConnected,
    isConnecting
  } = useGuacamole();

  // Clipboard hook
  const clipboard = useClipboard(sendClipboard);

  // File transfer hook
  const fileTransfer = useFileTransfer(tunnelId);

  // Get token from URL on mount
  useEffect(() => {
    const params = parseQueryParams(window.location.search);

    if (params.token) {
      setToken(params.token);

      // Try to parse connection info (this is a simplified version)
      // In production, you might decode the token to show connection details
      setConnectionInfo({
        type: params.type || 'rdp',
        host: params.host || 'Unknown'
      });

      // Generate tunnel ID
      const tid = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      setTunnelId(tid);
    } else {
      toast.error('No connection token provided in URL');
    }
  }, []);

  // Auto-connect when token is available
  useEffect(() => {
    if (token && !client) {
      connect(token);
    }
  }, [token, client, connect]);

  // Show error toasts
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Show connection status toasts
  useEffect(() => {
    if (state === 'connected') {
      toast.success('Connected to remote desktop');
    } else if (state === 'disconnected' && client) {
      toast.info('Disconnected from remote desktop');
    }
  }, [state, client]);

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect?')) {
      disconnect();
    }
  };

  // If no token, show error page
  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100 mb-4">
            No Connection Token
          </h1>
          <p className="text-slate-400 mb-4">
            Please access this page with a valid connection token in the URL.
          </p>
          <p className="text-sm text-slate-500">
            Example: ?token=YOUR_ENCRYPTED_TOKEN
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #475569'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#f1f5f9'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f1f5f9'
            }
          }
        }}
      />

      <Layout
        connectionControls={
          <ConnectionControls
            state={state}
            error={error}
            isConnected={isConnected}
            onDisconnect={handleDisconnect}
            connectionInfo={connectionInfo}
          />
        }
        guacamoleDisplay={
          <GuacamoleClient
            client={client}
            setupDisplay={setupDisplay}
            isConnected={isConnected}
          />
        }
        clipboardManager={
          <ClipboardManager
            localClipboard={clipboard.localClipboard}
            remoteClipboard={clipboard.remoteClipboard}
            autoSync={clipboard.autoSync}
            sendToRemote={clipboard.sendToRemote}
            copyToLocal={clipboard.copyToLocal}
            toggleAutoSync={clipboard.toggleAutoSync}
            setLocalClipboard={clipboard.setLocalClipboard}
          />
        }
        fileTransferPanel={
          <FileTransferPanel
            uploads={fileTransfer.uploads}
            downloads={fileTransfer.downloads}
            queueUpload={fileTransfer.queueUpload}
            removeUpload={fileTransfer.removeUpload}
            removeDownload={fileTransfer.removeDownload}
            clearCompletedUploads={fileTransfer.clearCompletedUploads}
            clearCompletedDownloads={fileTransfer.clearCompletedDownloads}
          />
        }
        showSidebar={isConnected}
      />
    </>
  );
}

export default App;
