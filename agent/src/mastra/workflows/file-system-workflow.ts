import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { fileSystemTools } from '../tools/file-system-tool';
import { fileSystemAgent } from '../agents/file-system-agent';

const interpretQuery = createStep({
  id: 'interpret-query',
  description: 'Interprets a natural language query to determine the file system operation and its arguments.',
  inputSchema: z.object({
    message: z.string().describe('The natural language query from the user'),
  }),
  outputSchema: z.object({
    operation: z.string().describe('The determined file system operation'),
    args: z.record(z.any()).describe('Arguments for the file system operation'),
  }),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('fileSystemAgent');
    if (!agent) {
      throw new Error('File System Agent not found');
    }

    // Use the agent to interpret the message and output a tool call or a structured response
    const prompt = `User query: "${inputData.message}"

    Based on the user's query, determine the appropriate file system operation (read_file_content, list_directory, move_file, search_file_semantic, delete_file, compress_file) and its arguments. 
    If no specific operation is clearly indicated, or if information is missing, respond with a textual clarification or request for more details.
    
    Output your response as a JSON object with two fields: "operation" (string) and "args" (object). If a clarification is needed, set operation to "clarification" and args to {"text": "Your clarification message"}.
    
    Examples:
    User: List files in my current folder.
    Output: {"operation": "list_directory", "args": {"directoryPath": "."}}

    User: Read the file called 'report.txt'.
    Output: {"operation": "read_file_content", "args": {"filePath": "report.txt"}}

    User: Move 'old.pdf' to the 'archives' directory.
    Output: {"operation": "move_file", "args": {"sourcePath": "old.pdf", "destinationPath": "archives"}}

    User: Find documents about 'project alpha'.
    Output: {"operation": "search_file_semantic", "args": {"query": "project alpha", "targetDirectory": "."}}

    User: Delete the file named 'temp.log'.
    Output: {"operation": "delete_file", "args": {"filePath": "temp.log"}}

    User: Compress 'big_file.txt'.
    Output: {"operation": "compress_file", "args": {"filePath": "big_file.txt"}}

    User: Create a new file called 'notes.txt' with content 'Meeting notes'.
    Output: {"operation": "create_file", "args": {"filePath": "notes.txt", "content": "Meeting notes"}}

    User: Make a new folder named 'project_docs'.
    Output: {"operation": "create_folder", "args": {"folderPath": "project_docs"}}

    User: What's the weather like?
    Output: {"operation": "clarification", "args": {"text": "I can only help with file system operations. What file operation would you like to perform?"}}
    
    User: Search for a file.
    Output: {"operation": "clarification", "args": {"text": "What are you looking for and where should I search?"}}
    `;

    const stream = await agent.stream([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    let jsonResponse = '';
    for await (const chunk of stream.textStream) {
      jsonResponse += chunk;
    }

    try {
      return JSON.parse(jsonResponse);
    } catch (parseError) {
      console.error("Failed to parse agent JSON response:", jsonResponse, parseError);
      return { operation: "clarification", args: { text: "I had trouble understanding that request. Could you please rephrase?" } };
    }
  },
});

const executeFileSystemOperation = createStep({
  id: 'execute-file-system-operation',
  description: 'Executes a file system operation using the file system agent',
  inputSchema: z.object({
    operation: z.string().describe('The file system operation to perform (e.g., read_file_content, list_directory, move_file, search_file_semantic, delete_file, compress_file)'),
    args: z.record(z.any()).describe('Arguments for the file system operation'),
  }),
  outputSchema: z.any(),
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent('fileSystemAgent');
    if (!agent) {
      throw new Error('File System Agent not found');
    }

    // Create a mock execution context for direct tool calls within the workflow step
    const mockExecutionContext = {
      runtimeContext: {}, // Empty runtime context
      suspend: async () => { throw new Error("Suspend not implemented for direct tool execution within workflow step"); }, // No-op suspend
    };

    switch (inputData.operation) {
      case 'read_file_content':
        return await fileSystemTools.read_file_content.execute({ ...mockExecutionContext, context: inputData.args });
      case 'list_directory':
        return await fileSystemTools.list_directory.execute({ ...mockExecutionContext, context: inputData.args });
      case 'move_file':
        return await fileSystemTools.move_file.execute({ ...mockExecutionContext, context: inputData.args });
      case 'search_file_semantic':
        return await fileSystemTools.search_file_semantic.execute({ ...mockExecutionContext, context: inputData.args });
      case 'delete_file': // New case for delete_file
        return await fileSystemTools.delete_file.execute({ ...mockExecutionContext, context: inputData.args });
      case 'compress_file': // New case for compress_file
        return await fileSystemTools.compress_file.execute({ ...mockExecutionContext, context: inputData.args });
      case 'create_file': // New case for create_file
        return await fileSystemTools.create_file.execute({ ...mockExecutionContext, context: inputData.args });
      case 'create_folder': // New case for create_folder
        return await fileSystemTools.create_folder.execute({ ...mockExecutionContext, context: inputData.args });
      case 'clarification':
        return { message: inputData.args.text }; // Return clarification message directly
      default:
        throw new Error(`Unknown operation: ${inputData.operation}`);
    }
  },
});

export const fileSystemWorkflow = createWorkflow({
  id: 'file-system-workflow',
  inputSchema: z.object({
    message: z.string().describe('The natural language query from the user'),
  }),
  outputSchema: z.any(),
})
  .then(interpretQuery)
  .then(executeFileSystemOperation);

fileSystemWorkflow.commit();
