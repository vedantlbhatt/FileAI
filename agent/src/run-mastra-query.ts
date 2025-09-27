import { mastra } from './mastra/index';
import { fileSystemWorkflow } from './mastra/workflows/file-system-workflow';

async function runMastraQuery() {
  const message = process.argv[2]; // Get the message from command-line arguments

  if (!message) {
    console.error("No message provided to Mastra query script.");
    process.exit(1);
  }

  console.log(`Mastra received query: "${message}"`);

  // TODO: Implement AI logic here to parse the message and decide on an action
  // For demonstration, let's assume a simple command parsing for now.
  if (message.toLowerCase().includes("list files")) {
    const result = await mastra.execute(fileSystemWorkflow, { operation: "list_directory", args: { directoryPath: "." } });
    console.log(`Files listed: ${JSON.stringify(result)}`);
  } else if (message.toLowerCase().includes("read file")) {
    // This would require more sophisticated parsing to get the filePath from the message
    console.log("To read a file, please specify the path in the message, e.g., 'read file /path/to/file.txt'");
    // Example of how to call: const result = await mastra.execute(fileSystemWorkflow, { operation: "read_file_content", args: { filePath: "./README.md" } });
    // console.log(`File content: ${JSON.stringify(result)}`);
  } else {
    console.log(`Chatbot response: I received your message: "${message}". I can list files, but other operations require more advanced AI parsing. `);
  }
}

runMastraQuery();
