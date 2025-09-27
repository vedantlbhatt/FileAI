import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { fileSystemTools } from '../tools/file-system-tool';

export const fileSystemAgent = new Agent({
  name: 'File System Agent',
  instructions: `
    You are a helpful file system assistant that can perform operations like reading, listing, moving, and searching files.
    Always ask for necessary parameters before performing any action.
    Use the fileSystemTools to interact with the file system.
  `,
  model: openai('gpt-4o-mini'),
  tools: { ...fileSystemTools },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    }),
  }),
});
