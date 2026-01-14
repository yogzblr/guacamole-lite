/**
 * ClipboardManager Component
 * Manages bidirectional clipboard synchronization
 */

import React, { useState } from 'react';
import { Copy, Clipboard, RefreshCw } from 'lucide-react';

export function ClipboardManager({
  localClipboard,
  remoteClipboard,
  autoSync,
  sendToRemote,
  copyToLocal,
  toggleAutoSync,
  setLocalClipboard
}) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
      sendToRemote(text);
      setText('');
    }
  };

  const handleCopy = () => {
    copyToLocal();
  };

  return (
    <div className="p-4 bg-slate-800 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Clipboard className="w-5 h-5" />
          Clipboard Manager
        </h3>
        <button
          onClick={toggleAutoSync}
          className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${
            autoSync
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Auto-Sync {autoSync ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Send to Remote */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Send to Remote
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste text to send..."
            className="w-full h-32 p-2 bg-slate-900 border border-slate-600 rounded text-slate-100 resize-none focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="mt-2 w-full btn btn-primary"
          >
            Send to Remote
          </button>
        </div>

        {/* Receive from Remote */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Received from Remote
          </label>
          <textarea
            value={remoteClipboard}
            readOnly
            placeholder="Clipboard data from remote will appear here..."
            className="w-full h-32 p-2 bg-slate-900 border border-slate-600 rounded text-slate-100 resize-none focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleCopy}
            disabled={!remoteClipboard}
            className="mt-2 w-full btn btn-primary flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copy to Local Clipboard
          </button>
        </div>
      </div>

      {autoSync && (
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded text-sm text-blue-300">
          Auto-sync is enabled. Clipboard changes will be synchronized automatically.
        </div>
      )}
    </div>
  );
}
