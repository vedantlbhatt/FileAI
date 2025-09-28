import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { pipeline } from 'stream/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';


const execFileAsync = promisify(execFile);

export const readFileContent = createTool({
  id: 'read-file-content',
  description: 'Reads and parses content of a specified file via Python parser, can take in any file format',
  inputSchema: z.object({
    filePath: z.string().describe('The path to the file to read'),
  }),
  outputSchema: z.object({
    type: z.enum(["text", "image", "metadata"]).describe("Type of the output"),
    content: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
  execute: async ({ context }) => {
    try {
      const pythonScriptPath = '/Users/rohannair/Desktop/Projects/HackGT/FileAI/cedar-FileAI/src/backend/fileParse.py'; // adjust path as needed
      const { stdout } = await execFileAsync('python3', [pythonScriptPath, context.filePath], {
        maxBuffer: 10 * 1024 * 1024, // 10MB max output, adjust if needed
      });
      const parsed = JSON.parse(stdout);
      return parsed;
    } catch (error: any) {
      throw new Error(`Failed to run Python parser: ${error.message}`);
    }
  },
});

export const listDirectory = createTool({
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

export const moveFile = createTool({
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




export const searchFilesSemantic = createTool({
  id: 'search-files-semantic',
  description: 'Semantically searches for files based on content or name',
  inputSchema: z.object({
    query: z.string().describe('The semantic search query'),
    targetDirectory: z.string().describe('The directory to search in').optional(),
  }),
  outputSchema: z.object({
    text_results: z.array(z.object({
      file_path: z.string(),
      semantic_score: z.number(),
      keyword_score: z.number(),
      combined_score: z.number(),
    })),
    image_results: z.array(z.object({
      file_path: z.string(),
      region_index: z.number(),
      final_score: z.number(),
      semantic_score: z.number(),
      distance: z.number(),
      caption: z.string(),
    })),
  }),
  execute: async ({ context }) => {
    try {
      const pythonScriptPath = '/Users/rohannair/Desktop/Projects/HackGT/FileAI/cedar-FileAI/src/backend/semanticSearch.py';
      const args = [
        context.targetDirectory || '',
        context.query,
      ];
      const { stdout } = await execFileAsync('python3', [pythonScriptPath, ...args], {
        maxBuffer: 10 * 1024 * 1024, 
      });
      const parsed = JSON.parse(stdout);
      return parsed;
    } catch (error: any) {
      throw new Error(`Failed to run Python parser: ${error.message}`);
    }
  },
});


export const deleteFile = createTool({
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

export const compressFile = createTool({
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

export const createFile = createTool({
  id: 'create-file',
  description: 'Creates a new file with optional content',
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

export const createFolder = createTool({
  id: 'create-folder',
  description: 'Creates a new folder (directory)',
  inputSchema: z.object({
    folderPath: z.string().describe('The path for the new folder'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    try {
      await fs.mkdir(context.folderPath, { recursive: true });
      return { success: true, message: `Folder '${context.folderPath}' created successfully` };
    } catch (error: any) {
      throw new Error(`Failed to create folder '${context.folderPath}': ${error.message}`);
    }
  },
});

export const fileSystemTools = [
  readFileContent,
  listDirectory,
  moveFile,
  searchFilesSemantic,
  deleteFile,
  compressFile,
  createFile,
  createFolder,
];
