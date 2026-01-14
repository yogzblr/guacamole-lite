/**
 * Guacamole service
 * Handles WebSocket tunnel and client initialization
 */

import Guacamole from 'guacamole-common-js';
import { WS_URL } from '../utils/constants';

export class GuacamoleService {
  constructor() {
    this.tunnel = null;
    this.client = null;
  }

  /**
   * Create and connect Guacamole client
   * @param {string} token - Encrypted connection token
   * @param {object} callbacks - Event callbacks
   * @returns {Guacamole.Client} Client instance
   */
  connect(token, callbacks = {}) {
    // Create WebSocket tunnel
    this.tunnel = new Guacamole.WebSocketTunnel(WS_URL);

    // Create client
    this.client = new Guacamole.Client(this.tunnel);

    // Setup state change handler
    this.client.onstatechange = (state) => {
      if (callbacks.onStateChange) {
        callbacks.onStateChange(this.getStateString(state));
      }
    };

    // Setup error handler
    this.client.onerror = (error) => {
      if (callbacks.onError) {
        callbacks.onError(error);
      }
    };

    // Setup clipboard handler
    this.client.onclipboard = (stream, mimetype) => {
      if (callbacks.onClipboard) {
        this.readClipboard(stream, mimetype, callbacks.onClipboard);
      }
    };

    // Setup file handler
    this.client.onfile = (stream, mimetype, filename) => {
      if (callbacks.onFile) {
        callbacks.onFile(stream, mimetype, filename);
      }
    };

    // Connect with token
    this.client.connect(`token=${encodeURIComponent(token)}`);

    return this.client;
  }

  /**
   * Disconnect client
   */
  disconnect() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  /**
   * Send clipboard data to remote
   * @param {string} data - Clipboard text
   */
  sendClipboard(data) {
    if (this.client && data) {
      const stream = this.client.createClipboardStream('text/plain');
      const writer = new Guacamole.StringWriter(stream);
      writer.sendText(data);
      writer.sendEnd();
    }
  }

  /**
   * Read clipboard data from stream
   * @param {object} stream - Guacamole stream
   * @param {string} mimetype - MIME type
   * @param {Function} callback - Callback with clipboard data
   */
  readClipboard(stream, mimetype, callback) {
    if (mimetype === 'text/plain') {
      const reader = new Guacamole.StringReader(stream);
      let data = '';

      reader.ontext = (text) => {
        data += text;
      };

      reader.onend = () => {
        callback(data);
      };
    }
  }

  /**
   * Send key event
   * @param {boolean} pressed - Key is pressed
   * @param {number} keysym - Key symbol
   */
  sendKey(pressed, keysym) {
    if (this.client) {
      this.client.sendKeyEvent(pressed ? 1 : 0, keysym);
    }
  }

  /**
   * Send mouse state
   * @param {number} x - Mouse X position
   * @param {number} y - Mouse Y position
   * @param {number} buttons - Button mask
   */
  sendMouse(x, y, buttons = 0) {
    if (this.client) {
      this.client.sendMouseState(new Guacamole.Mouse.State(x, y,
        !!(buttons & 1),  // left
        !!(buttons & 2),  // middle
        !!(buttons & 4),  // right
        false, false      // up, down
      ));
    }
  }

  /**
   * Get string representation of client state
   * @param {number} state - Client state
   * @returns {string} State string
   */
  getStateString(state) {
    switch (state) {
      case Guacamole.Client.IDLE:
        return 'idle';
      case Guacamole.Client.CONNECTING:
        return 'connecting';
      case Guacamole.Client.WAITING:
        return 'waiting';
      case Guacamole.Client.CONNECTED:
        return 'connected';
      case Guacamole.Client.DISCONNECTING:
        return 'disconnecting';
      case Guacamole.Client.DISCONNECTED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  /**
   * Get display element
   * @returns {HTMLElement} Display element
   */
  getDisplayElement() {
    return this.client ? this.client.getDisplay().getElement() : null;
  }

  /**
   * Get keyboard
   * @returns {Guacamole.Keyboard} Keyboard instance
   */
  getKeyboard() {
    return new Guacamole.Keyboard(document);
  }

  /**
   * Get mouse
   * @param {HTMLElement} element - Element to attach mouse to
   * @returns {Guacamole.Mouse} Mouse instance
   */
  getMouse(element) {
    return new Guacamole.Mouse(element);
  }

  /**
   * Get touch
   * @param {HTMLElement} element - Element to attach touch to
   * @returns {Guacamole.Mouse.Touchscreen} Touch instance
   */
  getTouch(element) {
    return new Guacamole.Mouse.Touchscreen(element);
  }
}

export default new GuacamoleService();
