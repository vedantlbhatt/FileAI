'use client';

import React, { useEffect, useState } from 'react';
import { FileBrowser } from '@/components/FileBrowser';
import { CedarCaptionChat } from '@/cedar/components/chatComponents/CedarCaptionChat';
import { FloatingCedarChat } from '@/cedar/components/chatComponents/FloatingCedarChat';
import { SidePanelCedarChat } from '@/cedar/components/chatComponents/SidePanelCedarChat';
import { DebuggerPanel } from '@/cedar/components/debugger';

type ChatMode = 'floating' | 'sidepanel' | 'caption';

export default function HomePage() {
  const [chatMode, setChatMode] = useState<ChatMode>('caption');
  const [isDark, setIsDark] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string>('');

  const handleCopyPath = (path: string) => {
    // Format the path in a more user-friendly way for the chat input
    const formattedPath = `Please analyze this file: ${path}`;
    setCopiedPath(formattedPath);
    
    // Clear the copied path after a short delay to prevent it from persisting
    setTimeout(() => {
      setCopiedPath('');
    }, 1000);
  };

  // Detect and apply stored/system theme on first load
  useEffect(() => {
    if (
      localStorage.theme === 'dark' ||
      (!('theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    }
  }, []);

  // Toggle theme manually
  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDark(true);
    }
  };

  // Reusable content renderer
  const renderContent = () => (
    <div className="relative h-screen w-full bg-background transition-colors duration-300">
      {/* Top-right Dark Mode Toggle */}
      <div className="absolute top-4 right-4 flex items-center">
        <button
          onClick={toggleDarkMode}
          className="flex items-center gap-2 rounded-full px-4 py-2 bg-muted text-foreground shadow-sm hover:bg-accent transition-colors duration-200"
        >
          {isDark ? (
            <>
              ☀️ <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              🌙 <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>
      </div>

      {/* Main File Browser Area */}
      <div className="flex h-full pt-16 pb-4 px-4">
        <div className="flex-1 max-w-6xl mx-auto flex flex-col gap-6">
          {/* Friendly Instructions */}
          <div className="rounded-2xl bg-accent/10 dark:bg-accent/20 text-foreground p-8 text-center shadow-lg border border-accent/40 backdrop-blur-sm">
            <p className="text-3xl font-extrabold tracking-tight">
              👋 Welcome to{' '}
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                FileAI
              </span>
            </p>
            <p className="mt-3 text-lg font-medium text-muted-foreground">
              Use the file browser below to explore your system.  
              You can also chat with the FileAI assistant for help at the bottom.
            </p>
          </div>

          <FileBrowser initialPath="/Users/rohannair" onCopyPath={handleCopyPath} />
        </div>
      </div>

      {/* Chat overlays */}
      {chatMode === 'caption' && <CedarCaptionChat initialInput={copiedPath} />}
      {chatMode === 'floating' && (
        <FloatingCedarChat
          side="right"
          title="FileAI Assistant"
          collapsedLabel="Chat with FileAI"
        />
      )}
    </div>
  );

  // If side panel mode, wrap with chat panel
  if (chatMode === 'sidepanel') {
    return (
      <SidePanelCedarChat
        side="right"
        title="FileAI Assistant"
        collapsedLabel="Chat with FileAI"
        showCollapsedButton={true}
      >
        <DebuggerPanel />
        {renderContent()}
      </SidePanelCedarChat>
    );
  }

  // Otherwise just render content
  return renderContent();
}
