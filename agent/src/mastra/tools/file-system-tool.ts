import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

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
  description: 'Lists the contents of a specified directory',
  inputSchema: z.object({
    directoryPath: z.string().describe('The path to the directory to list'),
  }),
  outputSchema: z.object({
    contents: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    try {
      const contents = await fs.readdir(context.directoryPath);
      return { contents };
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

export const fileSystemTools = {
  read_file_content,
  list_directory,
  move_file,
  search_file_semantic,
};
