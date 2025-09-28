'use client';

import React, { useState } from "react";

interface FileItem {
  name: string;
  type: "file" | "directory";
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
}

interface FileBrowserProps {
  initialPath?: string;
  onCopyPath?: (path: string) => void;
}

const ROOT_PATH = "/Users/rohannair/Desktop/Projects";

export const FileBrowser: React.FC<FileBrowserProps> = ({ initialPath, onCopyPath }) => {
  const [currentHandle, setCurrentHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [pathStack, setPathStack] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    file: FileItem | null;
  } | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Show a temporary notification
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2000);
  };

  // Open a directory (root or subfolder)
  const openDirectory = async (dirHandle?: FileSystemDirectoryHandle) => {
    try {
      const handle = dirHandle || (await (window as any).showDirectoryPicker());
      setCurrentHandle(handle);

      const newFiles: FileItem[] = [];
      for await (const entry of handle.values()) {
        newFiles.push({
          name: entry.name,
          type: entry.kind === "file" ? "file" : "directory",
          handle: entry,
        });
      }
      setFiles(newFiles);
      setPathStack((prev) =>
        dirHandle ? [...prev, dirHandle.name] : [handle.name]
      );
    } catch (err) {
      console.error("Directory picker error:", err);
    }
  };

  // // Navigate up one folder
  // const goUp = async () => {
  //   if (!currentHandle) return;
  //   try {
  //     const parent = await (currentHandle as any).getParent?.();
  //     if (parent) {
  //       openDirectory(parent);
  //       setPathStack((prev) => prev.slice(0, -1));
  //     }
  //   } catch {
  //     // Reset if parent not available
  //     setCurrentHandle(null);
  //     setFiles([]);
  //     setPathStack([]);
  //   }
  // };

  // Copy selected file/folder path (with absolute base path)
  const copyPath = (file: FileItem) => {
    const absPath = `${ROOT_PATH}/${[...pathStack, file.name].join("/")}`;
    navigator.clipboard.writeText(absPath);
    showNotification(`Path copied and added to chat input!`);
    if (onCopyPath) {
      onCopyPath(absPath);
    }
  };

  // Open file for preview (text only)
  const previewFile = async (file: FileItem) => {
    if (file.type !== "file") return;
    try {
      const f = await (file.handle as FileSystemFileHandle).getFile();
      const text = await f.text();
      showNotification(`Previewing: ${file.name} (check console)`);
      console.log(`Content of ${file.name}:`, text);
    } catch (err) {
      console.error("Failed to preview file:", err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-lg overflow-hidden relative">
      {/* Toolbar */}
      <div className="p-2 flex items-center gap-3 border-b border-gray-200">
        <button
          onClick={() => openDirectory()}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Pick Directory
        </button>
    
   
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-2">
        {files.length === 0 ? (
          <div className="text-gray-500">No files</div>
        ) : (
          <ul className="space-y-2">
            {files.map((file, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between px-3 py-2 border rounded hover:bg-gray-50 cursor-pointer relative"
                onDoubleClick={() =>
                  file.type === "directory"
                    ? openDirectory(file.handle as FileSystemDirectoryHandle)
                    : previewFile(file)
                }
                onContextMenu={(e) => {
                  e.preventDefault();
                  const container = e.currentTarget.closest(".h-full") as HTMLElement;
                  const bounds = container.getBoundingClientRect();

                  setContextMenu({
                    x: e.clientX - bounds.left,
                    y: e.clientY - bounds.top,
                    file,
                  });
                }}
              >
                <span className="text-black">
  {file.type === "directory" ? "📁" : "📄"} {file.name}
</span>
<span className="text-xs text-gray-500">{file.type}</span>

              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && contextMenu.file && (
        <ul
          className="absolute bg-white border rounded shadow-md z-50"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <li
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-black"
            onClick={() => {
              copyPath(contextMenu.file!);
              setContextMenu(null);
            }}
          >
            📋 Copy Path to Chat
          </li>
          {contextMenu.file.type === "file" && (
            <li
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-black"
              onClick={() => {
                previewFile(contextMenu.file!);
                setContextMenu(null);
              }}
            >
              👁 Preview File
            </li>
          )}
        </ul>
      )}

      {/* Notification */}
      {notification && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded shadow">
          {notification}
        </div>
      )}
    </div>
  );
};
