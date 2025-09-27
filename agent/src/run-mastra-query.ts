import { mastra } from './mastra/index';
import { fileSystemWorkflow } from './mastra/workflows/file-system-workflow';
import { fileSystemAgent } from './mastra/agents/file-system-agent'; // Import the agent

async function runMastraQuery() {
  const message = process.argv[2]; // Get the message from command-line arguments

  if (!message) {
    console.error("No message provided to Mastra query script.");
    process.exit(1);
  }

  console.log(`Mastra received query: "${message}"`);

  const agent = mastra.getAgent('fileSystemAgent');
  if (!agent) {
    console.error("File System Agent not found.");
    process.exit(1);
  }

  let responseText = '';
  const stream = await agent.stream([
    {
      role: 'user',
      content: message,
    },
  ]);

  for await (const chunk of stream.textStream) {
    responseText += chunk;
  }

  console.log(responseText.trim()); // Print the agent's response

}

runMastraQuery();
