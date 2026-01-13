/**
 * Layout Component
 * Main application layout with responsive sidebar
 */

import React, { useState } from 'react';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

export function Layout({
  connectionControls,
  guacamoleDisplay,
  clipboardManager,
  fileTransferPanel,
  showSidebar = true
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Top Bar */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-100">
              Guacamole Bastion
            </h1>
            <span className="hidden sm:inline text-xs text-slate-500 px-2 py-1 bg-slate-700 rounded">
              v1.0.0
            </span>
          </div>

          {showSidebar && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-700 rounded text-slate-300"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Connection Controls */}
        {connectionControls}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Guacamole Display */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {guacamoleDisplay}

          {/* File Transfer Panel */}
          {fileTransferPanel}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div
            className={`${
              sidebarOpen ? 'translate-x-0' : 'translate-x-full'
            } lg:translate-x-0 fixed lg:relative right-0 top-0 h-full ${
              sidebarCollapsed ? 'w-0 lg:w-12' : 'w-96'
            } bg-slate-800 border-l border-slate-700 transition-all duration-300 z-50 flex flex-col`}
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              {!sidebarCollapsed && (
                <h2 className="text-lg font-semibold text-slate-100">
                  Tools
                </h2>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:block p-1 hover:bg-slate-700 rounded text-slate-300"
              >
                {sidebarCollapsed ? (
                  <ChevronLeft className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Sidebar Content */}
            {!sidebarCollapsed && (
              <div className="flex-1 overflow-y-auto p-4">
                {clipboardManager}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overlay for mobile sidebar */}
      {showSidebar && sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
