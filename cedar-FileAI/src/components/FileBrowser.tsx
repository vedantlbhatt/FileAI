'use client';

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import {
  useRegisterState,
  useRegisterFrontendTool,
  useSubscribeStateToAgentContext,
} from 'cedar-os';

// File system types
interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  path: string;
}

interface FileBrowserProps {
  initialPath?: string;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({ 
  initialPath = '/Users/rohannair' 
}) => {
  // State management
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isLoading, setIsLoading] = useState(false);

  // Register Cedar state for current path
  useRegisterState({
    key: 'currentPath',
    description: 'The current directory path being viewed',
    value: currentPath,
    setValue: setCurrentPath,
    stateSetters: {
      navigateTo: {
        name: 'navigateTo',
        description: 'Navigate to a specific directory path',
        argsSchema: z.object({
          path: z.string().describe('The directory path to navigate to'),
        }),
        execute: (
          currentPath: string,
          setValue: (newValue: string) => void,
          args: { path: string },
        ) => {
          setValue(args.path);
        },
      },
    },
  });

  // Register Cedar state for files
  useRegisterState({
    key: 'directoryContents',
    description: 'The files and folders in the current directory',
    value: files,
    setValue: setFiles,
    stateSetters: {
      updateFiles: {
        name: 'updateFiles',
        description: 'Update the list of files in the current directory',
        argsSchema: z.object({
          files: z.array(z.object({
            name: z.string(),
            type: z.enum(['file', 'directory']),
            size: z.number().optional(),
            path: z.string(),
          })),
        }),
        execute: (
          currentFiles: FileItem[],
          setValue: (newValue: FileItem[]) => void,
          args: { files: FileItem[] },
        ) => {
          setValue(args.files);
        },
      },
    },
  });

  // Subscribe states to agent context
  useSubscribeStateToAgentContext('currentPath', (path) => ({ currentPath: path }), {
    showInChat: true,
    color: '#059669',
  });

  useSubscribeStateToAgentContext('directoryContents', (files) => ({ 
    fileCount: files.length,
    directories: files.filter(f => f.type === 'directory').length,
    files: files.filter(f => f.type === 'file').length,
  }), {
    showInChat: true,
    color: '#0891b2',
  });

  // Register frontend tools for file operations
  useRegisterFrontendTool({
    name: 'openFile',
    description: 'Open a file or navigate to a directory',
    argsSchema: z.object({
      path: z.string().describe('The path of the file or directory to open'),
      type: z.enum(['file', 'directory']).describe('Whether this is a file or directory'),
    }),
    execute: async (args: { path: string; type: 'file' | 'directory' }) => {
      if (args.type === 'directory') {
        setCurrentPath(args.path);
      } else {
        // For files, we could implement a file viewer or trigger a read operation
        console.log(`Opening file: ${args.path}`);
      }
    },
  });

  useRegisterFrontendTool({
    name: 'selectFiles',
    description: 'Select or deselect files in the browser',
    argsSchema: z.object({
      filenames: z.array(z.string()).describe('Array of filenames to select'),
      action: z.enum(['select', 'deselect', 'toggle']).describe('Action to perform'),
    }),
    execute: async (args: { filenames: string[]; action: 'select' | 'deselect' | 'toggle' }) => {
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        args.filenames.forEach(filename => {
          if (args.action === 'select') {
            newSet.add(filename);
          } else if (args.action === 'deselect') {
            newSet.delete(filename);
          } else {
            if (newSet.has(filename)) {
              newSet.delete(filename);
            } else {
              newSet.add(filename);
            }
          }
        });
        return newSet;
      });
    },
  });

  // Utility functions
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (file: FileItem): string => {
    if (file.type === 'directory') return '📁';
    if (file.name.endsWith('.txt')) return '📄';
    if (file.name.endsWith('.pdf')) return '📕';
    if (file.name.endsWith('.jpg') || file.name.endsWith('.png')) return '🖼️';
    return '📄';
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'directory') {
      setCurrentPath(file.path);
    } else {
      // Handle file opening - could trigger agent action
      console.log(`File clicked: ${file.path}`);
    }
  };

  const handleFileSelect = (file: FileItem) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(file.name)) {
        newSet.delete(file.name);
      } else {
        newSet.add(file.name);
      }
      return newSet;
    });
  };

  const goUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    setCurrentPath(parentPath);
  };

  const canGoUp = currentPath !== '/' && currentPath !== '';

  // Filter files based on search query
  const filteredFiles = searchQuery
    ? files.filter(file => 
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Title Bar */}
      <div className="bg-gradient-to-b from-gray-200 to-gray-300 border-b border-gray-400 h-7 flex items-center px-2">
        <div className="flex gap-2 mr-3">
          <div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500 cursor-pointer"></div>
          <div className="w-3 h-3 rounded-full bg-green-500 cursor-pointer"></div>
        </div>
        <div className="text-sm font-medium text-gray-700">FileAI</div>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex items-center gap-3">
        <div className="flex gap-1">
          <button
            onClick={goUp}
            disabled={!canGoUp}
            className="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Go Back"
          >
            ←
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-2 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
            title="Reload"
          >
            ↻
          </button>
        </div>

        <div className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-700">
          {currentPath}
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-2 py-1 border border-gray-300 rounded text-sm ${
              viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'
            }`}
            title="List View"
          >
            ☰
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-2 py-1 border border-gray-300 rounded text-sm ${
              viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'
            }`}
            title="Grid View"
          >
            ⊞
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 border-b border-gray-200 relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
          className="w-full px-2 py-1 pr-8 border border-gray-300 rounded text-sm outline-none focus:border-blue-500"
        />
        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
          🔍
        </span>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-auto-fill-120 gap-2' 
            : 'flex flex-col'
          }>
            {filteredFiles.map((file) => (
              <div
                key={file.name}
                className={`
                  flex items-center gap-2 p-2 rounded cursor-pointer border border-transparent transition-colors
                  ${selectedFiles.has(file.name) ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}
                  ${viewMode === 'grid' ? 'flex-col text-center p-3' : ''}
                `}
                onClick={() => handleFileClick(file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleFileSelect(file);
                }}
              >
                <div className={`text-lg flex-shrink-0 ${viewMode === 'grid' ? 'text-2xl' : ''}`}>
                  {getFileIcon(file)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm truncate ${viewMode === 'grid' ? 'text-center' : ''}`}>
                    {file.name}
                  </div>
                  {file.size && (
                    <div className={`text-xs text-gray-500 mt-0.5 ${
                      selectedFiles.has(file.name) ? 'text-gray-200' : ''
                    }`}>
                      {formatFileSize(file.size)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-50 border-t border-gray-200 px-2 py-1 text-xs text-gray-600">
        {filteredFiles.length} items
        {selectedFiles.size > 0 && ` • ${selectedFiles.size} selected`}
      </div>
    </div>
  );
};
