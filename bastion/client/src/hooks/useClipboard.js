/**
 * useClipboard hook
 * Manages bidirectional clipboard synchronization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CLIPBOARD_SYNC_INTERVAL } from '../utils/constants';

export function useClipboard(onSendClipboard) {
  const [localClipboard, setLocalClipboard] = useState('');
  const [remoteClipboard, setRemoteClipboard] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const lastLocalClipboard = useRef('');

  /**
   * Handle remote clipboard change (from Guacamole)
   */
  useEffect(() => {
    const handleGuacClipboard = (event) => {
      const data = event.detail;
      if (data && data !== remoteClipboard) {
        setRemoteClipboard(data);

        // Auto-copy to local clipboard if enabled
        if (autoSync && navigator.clipboard) {
          navigator.clipboard.writeText(data).catch(err => {
            console.error('Failed to write to clipboard:', err);
          });
        }
      }
    };

    window.addEventListener('guacamole-clipboard', handleGuacClipboard);

    return () => {
      window.removeEventListener('guacamole-clipboard', handleGuacClipboard);
    };
  }, [remoteClipboard, autoSync]);

  /**
   * Poll local clipboard for changes
   */
  useEffect(() => {
    if (!autoSync || !navigator.clipboard) return;

    const interval = setInterval(async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text !== lastLocalClipboard.current && text !== remoteClipboard) {
          lastLocalClipboard.current = text;
          setLocalClipboard(text);

          // Send to remote
          if (onSendClipboard) {
            onSendClipboard(text);
          }
        }
      } catch (err) {
        // Clipboard access denied or not available
      }
    }, CLIPBOARD_SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [autoSync, onSendClipboard, remoteClipboard]);

  /**
   * Manually send clipboard to remote
   */
  const sendToRemote = useCallback((text) => {
    if (onSendClipboard && text) {
      onSendClipboard(text);
      setLocalClipboard(text);
      lastLocalClipboard.current = text;
    }
  }, [onSendClipboard]);

  /**
   * Manually copy remote clipboard to local
   */
  const copyToLocal = useCallback(() => {
    if (remoteClipboard && navigator.clipboard) {
      navigator.clipboard.writeText(remoteClipboard).then(() => {
        setLocalClipboard(remoteClipboard);
        lastLocalClipboard.current = remoteClipboard;
      }).catch(err => {
        console.error('Failed to copy to clipboard:', err);
      });
    }
  }, [remoteClipboard]);

  /**
   * Toggle auto-sync
   */
  const toggleAutoSync = useCallback(() => {
    setAutoSync(prev => !prev);
  }, []);

  return {
    localClipboard,
    remoteClipboard,
    autoSync,
    sendToRemote,
    copyToLocal,
    toggleAutoSync,
    setLocalClipboard
  };
}
