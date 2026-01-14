/**
 * ConnectionControls Component
 * Connection status and control buttons
 */

import React from 'react';
import {
  Power,
  Maximize,
  Minimize,
  Settings,
  Activity,
  AlertCircle
} from 'lucide-react';
import { isFullscreen, requestFullscreen, exitFullscreen } from '../utils/helpers';

export function ConnectionControls({
  state,
  error,
  isConnected,
  onDisconnect,
  connectionInfo
}) {
  const [fullscreen, setFullscreen] = React.useState(false);

  const handleFullscreen = () => {
    if (isFullscreen()) {
      exitFullscreen();
      setFullscreen(false);
    } else {
      requestFullscreen(document.documentElement);
      setFullscreen(true);
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(isFullscreen());
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const getStatusColor = () => {
    switch (state) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'waiting':
        return 'bg-yellow-500 animate-pulse';
      case 'disconnecting':
        return 'bg-orange-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'waiting':
        return 'Waiting...';
      case 'disconnecting':
        return 'Disconnecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
      {/* Left: Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="text-sm font-medium text-slate-200">
            {getStatusText()}
          </span>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-900/20 border border-red-700/30 rounded text-sm text-red-300">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {connectionInfo && (
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
            <Activity className="w-4 h-4" />
            <span>{connectionInfo.type?.toUpperCase()}</span>
            {connectionInfo.host && (
              <>
                <span>•</span>
                <span>{connectionInfo.host}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleFullscreen}
          className="p-2 hover:bg-slate-700 rounded text-slate-300 hover:text-slate-100 transition-colors"
          title={fullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)'}
        >
          {fullscreen ? (
            <Minimize className="w-5 h-5" />
          ) : (
            <Maximize className="w-5 h-5" />
          )}
        </button>

        <button
          onClick={onDisconnect}
          disabled={!isConnected}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          title="Disconnect (Ctrl+Alt+Shift+D)"
        >
          <Power className="w-4 h-4" />
          <span className="hidden sm:inline">Disconnect</span>
        </button>
      </div>
    </div>
  );
}
