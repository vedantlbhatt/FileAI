import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as zlib from 'zlib'; // Import zlib for compression
import { pipeline } from 'stream/promises'; // Import pipeline for streams

const read_file_content = createTool({
  id: 'read-file-content',
  description: 'Reads the content of a specified file',
  inputSchema: z.object({
    filePath: z.string().describe('The path to the file to read'),
  }),
  outputSchema: z.object({
    content: z.string(),
  }),
  execute: async ({ context }) => {
    try {
      const content = await fs.readFile(context.filePath, 'utf-8');
      return { content };
    } catch (error: any) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  },
});

const list_directory = createTool({
  id: 'list-directory',
  description: 'Lists the contents of a specified directory with detailed file information',
  inputSchema: z.object({
    directoryPath: z.string().describe('The path to the directory to list'),
  }),
  outputSchema: z.object({
    contents: z.array(z.object({
      name: z.string(),
      type: z.string(),
      size: z.number().optional(),
      path: z.string(),
    })),
  }),
  execute: async ({ context }) => {
    try {
      const contents = await fs.readdir(context.directoryPath, { withFileTypes: true });
      const detailedContents = await Promise.all(
        contents.map(async (item) => {
          const fullPath = path.join(context.directoryPath, item.name);
          let size;
          try {
            const stats = await fs.stat(fullPath);
            size = stats.size;
          } catch (error) {
            size = 0;
          }
          
          return {
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            size: item.isDirectory() ? undefined : size,
            path: fullPath,
          };
        })
      );
      
      // Sort directories first, then files, both alphabetically
      detailedContents.sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') return -1;
        if (a.type !== 'directory' && b.type === 'directory') return 1;
        return a.name.localeCompare(b.name);
      });
      
      return { contents: detailedContents };
    } catch (error: any) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  },
});

const move_file = createTool({
  id: 'move-file',
  description: 'Moves a file from one location to another',
  inputSchema: z.object({
    sourcePath: z.string().describe('The current path of the file'),
    destinationPath: z.string().describe('The new path for the file'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    try {
      await fs.rename(context.sourcePath, context.destinationPath);
      return { success: true, message: 'File moved successfully' };
    } catch (error: any) {
      throw new Error(`Failed to move file: ${error.message}`);
    }
  },
});

const search_file_semantic = createTool({
  id: 'search-file-semantic',
  description: 'Semantically searches for files based on content or name',
  inputSchema: z.object({
    query: z.string().describe('The semantic search query'),
    targetDirectory: z.string().describe('The directory to search in').optional(),
  }),
  outputSchema: z.object({
    results: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    // This is a placeholder for actual semantic search functionality.
    // In a real application, this would integrate with an embedding model and a vector database.
    console.warn('Semantic search is a placeholder and not fully implemented.');
    const files = await fs.readdir(context.targetDirectory || '.', { recursive: true });
    const filteredFiles = files.filter(file => file.includes(context.query));
    return { results: filteredFiles };
  },
});

const delete_file = createTool({
  id: 'delete-file',
  description: 'Deletes a specified file',
  inputSchema: z.object({
    filePath: z.string().describe('The path to the file to delete'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    try {
      await fs.unlink(context.filePath);
      return { success: true, message: `File '${context.filePath}' deleted successfully` };
    } catch (error: any) {
      throw new Error(`Failed to delete file '${context.filePath}': ${error.message}`);
    }
  },
});

const compress_file = createTool({
  id: 'compress-file',
  description: 'Compresses a specified file using gzip',
  inputSchema: z.object({
    filePath: z.string().describe('The path to the file to compress'),
    outputFilePath: z.string().describe('The path for the compressed output file (e.g., file.txt.gz)').optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    outputFilePath: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const inputPath = context.filePath;
      const outputPath = context.outputFilePath || `${inputPath}.gz`;

      const gzip = zlib.createGzip();
      const source = fsSync.createReadStream(inputPath);
      const destination = fsSync.createWriteStream(outputPath);

      await pipeline(source, gzip, destination);

      return { success: true, message: `File '${inputPath}' compressed to '${outputPath}'`, outputFilePath: outputPath };
    } catch (error: any) {
      throw new Error(`Failed to compress file '${context.filePath}': ${error.message}`);
    }
  },
});

const create_file = createTool({
  id: 'create-file',
  description: 'Creates a new file with optional content.',
  inputSchema: z.object({
    filePath: z.string().describe('The path for the new file'),
    content: z.string().describe('Optional content to write to the file').optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    try {
      await fs.writeFile(context.filePath, context.content || '');
      return { success: true, message: `File '${context.filePath}' created successfully` };
    } catch (error: any) {
      throw new Error(`Failed to create file '${context.filePath}': ${error.message}`);
    }
  },
});

const create_folder = createTool({
  id: 'create-folder',
  description: 'Creates a new folder (directory).',
  inputSchema: z.object({
    folderPath: z.string().describe('The path for the new folder'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    try {
      await fs.mkdir(context.folderPath, { recursive: true }); // recursive: true allows creating parent directories if they don't exist
      return { success: true, message: `Folder '${context.folderPath}' created successfully` };
    } catch (error: any) {
      throw new Error(`Failed to create folder '${context.folderPath}': ${error.message}`);
    }
  },
});

export const fileSystemTools = {
  read_file_content,
  list_directory,
  move_file,
  search_file_semantic,
  delete_file,
  compress_file,
  create_file, // Added new tool
  create_folder, // Added new tool
};
