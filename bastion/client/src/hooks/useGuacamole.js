/**
 * useGuacamole hook
 * Manages Guacamole client connection and state
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import guacamoleService from '../services/guacamoleService';
import { CONNECTION_STATE } from '../utils/constants';

export function useGuacamole() {
  const [state, setState] = useState(CONNECTION_STATE.DISCONNECTED);
  const [error, setError] = useState(null);
  const [client, setClient] = useState(null);
  const displayRef = useRef(null);
  const keyboardRef = useRef(null);
  const mouseRef = useRef(null);

  /**
   * Connect to Guacamole
   */
  const connect = useCallback((token) => {
    try {
      setState(CONNECTION_STATE.CONNECTING);
      setError(null);

      const guacClient = guacamoleService.connect(token, {
        onStateChange: (newState) => {
          setState(newState);
          if (newState === 'disconnected') {
            cleanup();
          }
        },
        onError: (err) => {
          setError(err.message || 'Connection error');
          setState(CONNECTION_STATE.ERROR);
        },
        onClipboard: (data) => {
          // Clipboard data will be handled by ClipboardManager component
          window.dispatchEvent(new CustomEvent('guacamole-clipboard', { detail: data }));
        },
        onFile: (stream, mimetype, filename) => {
          // File download will be handled by FileTransferPanel component
          window.dispatchEvent(new CustomEvent('guacamole-file', {
            detail: { stream, mimetype, filename }
          }));
        }
      });

      setClient(guacClient);

    } catch (err) {
      setError(err.message);
      setState(CONNECTION_STATE.ERROR);
    }
  }, []);

  /**
   * Disconnect from Guacamole
   */
  const disconnect = useCallback(() => {
    if (client) {
      setState(CONNECTION_STATE.DISCONNECTING);
      guacamoleService.disconnect();
      cleanup();
    }
  }, [client]);

  /**
   * Cleanup resources
   */
  const cleanup = useCallback(() => {
    if (keyboardRef.current) {
      keyboardRef.current.onkeydown = null;
      keyboardRef.current.onkeyup = null;
      keyboardRef.current = null;
    }

    if (mouseRef.current) {
      mouseRef.current.onmousedown = null;
      mouseRef.current.onmouseup = null;
      mouseRef.current.onmousemove = null;
      mouseRef.current = null;
    }

    setClient(null);
  }, []);

  /**
   * Setup display
   */
  const setupDisplay = useCallback((container) => {
    if (client && container) {
      const display = guacamoleService.getDisplayElement();
      if (display) {
        container.innerHTML = '';
        container.appendChild(display);
        displayRef.current = display;

        // Setup mouse
        const mouse = guacamoleService.getMouse(display);
        mouse.onmousedown =
        mouse.onmouseup =
        mouse.onmousemove = (mouseState) => {
          client.sendMouseState(mouseState);
        };
        mouseRef.current = mouse;

        // Setup touch for mobile
        const touch = guacamoleService.getTouch(display);
        touch.onmousedown =
        touch.onmouseup =
        touch.onmousemove = (mouseState) => {
          client.sendMouseState(mouseState);
        };

        // Setup keyboard
        const keyboard = guacamoleService.getKeyboard();
        keyboard.onkeydown = (keysym) => {
          client.sendKeyEvent(1, keysym);
        };
        keyboard.onkeyup = (keysym) => {
          client.sendKeyEvent(0, keysym);
        };
        keyboardRef.current = keyboard;
      }
    }
  }, [client]);

  /**
   * Send clipboard data
   */
  const sendClipboard = useCallback((data) => {
    guacamoleService.sendClipboard(data);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    error,
    client,
    connect,
    disconnect,
    setupDisplay,
    sendClipboard,
    isConnected: state === CONNECTION_STATE.CONNECTED || state === 'connected',
    isConnecting: state === CONNECTION_STATE.CONNECTING || state === 'connecting'
  };
}
