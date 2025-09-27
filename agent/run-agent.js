import { mastra } from './.mastra/output/index.mjs'; // Import mastra from the compiled output
import { fileSystemAgent } from './src/mastra/agents/file-system-agent.js'; // Re-add import for type inference or direct use

async function runAgent() {
  const message = process.argv[2]; // Get the message from command-line arguments

  if (!message) {
    console.error("No message provided to Mastra agent script.");
    process.exit(1);
  }

  try {
    // Ensure the agent is retrieved correctly
    // Note: The 'fileSystemAgent' itself is part of the Mastra instance now.
    const agent = mastra.getAgent('fileSystemAgent');
    if (!agent) {
      console.error("File System Agent not found in Mastra instance.");
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

  } catch (error) {
    console.error(`Error executing Mastra agent: ${error}`);
    process.exit(1);
  }
}

runAgent();
