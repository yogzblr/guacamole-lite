/**
 * GuacamoleClient Component
 * Renders the Guacamole display canvas and handles input events
 */

import React, { useEffect, useRef } from 'react';

export function GuacamoleClient({ client, setupDisplay, isConnected }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (client && containerRef.current && isConnected) {
      setupDisplay(containerRef.current);
    }
  }, [client, isConnected, setupDisplay]);

  return (
    <div className="guacamole-display flex-1 relative overflow-auto">
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-slate-400">Connecting to remote desktop...</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
      />
    </div>
  );
}
