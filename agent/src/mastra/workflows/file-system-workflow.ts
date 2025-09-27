import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { fileSystemTools } from '../tools/file-system-tool';
import { fileSystemAgent } from '../agents/file-system-agent';

const executeFileSystemOperation = createStep({
  id: 'execute-file-system-operation',
  description: 'Executes a file system operation using the file system agent',
  inputSchema: z.object({
    operation: z.string().describe('The file system operation to perform (e.g., read_file_content, list_directory, move_file, search_file_semantic)'),
    args: z.record(z.any()).describe('Arguments for the file system operation'),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('fileSystemAgent');
    if (!agent) {
      throw new Error('File System Agent not found');
    }

    switch (inputData.operation) {
      case 'read_file_content':
        return await fileSystemTools.read_file_content.execute({ context: inputData.args });
      case 'list_directory':
        return await fileSystemTools.list_directory.execute({ context: inputData.args });
      case 'move_file':
        return await fileSystemTools.move_file.execute({ context: inputData.args });
      case 'search_file_semantic':
        return await fileSystemTools.search_file_semantic.execute({ context: inputData.args });
      default:
        throw new Error(`Unknown operation: ${inputData.operation}`);
    }
  },
});

export const fileSystemWorkflow = createWorkflow({
  id: 'file-system-workflow',
  inputSchema: z.object({
    operation: z.string().describe('The file system operation to perform'),
    args: z.record(z.any()).describe('Arguments for the file system operation'),
  }),
  outputSchema: z.any(),
})
  .then(executeFileSystemOperation);

fileSystemWorkflow.commit();
