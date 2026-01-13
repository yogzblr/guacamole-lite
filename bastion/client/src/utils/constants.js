/**
 * Application constants
 */

// WebSocket connection
export const WS_URL = import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

// API base URL
export const API_URL = import.meta.env.VITE_API_URL || '/api';

// Connection states
export const CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTING: 'disconnecting',
  ERROR: 'error'
};

// File transfer constants
export const MAX_FILE_SIZE = 100 * 1024 * 1024 * 1024; // 100GB
export const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB

// Clipboard sync interval
export const CLIPBOARD_SYNC_INTERVAL = 1000; // 1 second

// Screen resolutions
export const SCREEN_RESOLUTIONS = [
  { width: 1920, height: 1080, label: '1920x1080 (Full HD)' },
  { width: 1680, height: 1050, label: '1680x1050' },
  { width: 1600, height: 900, label: '1600x900' },
  { width: 1440, height: 900, label: '1440x900' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1280, height: 1024, label: '1280x1024' },
  { width: 1280, height: 800, label: '1280x800' },
  { width: 1024, height: 768, label: '1024x768' },
];

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  MENU: { ctrl: true, alt: true, shift: true, key: 'M' },
  FULLSCREEN: { key: 'F11' },
  DISCONNECT: { ctrl: true, alt: true, shift: true, key: 'D' }
};
