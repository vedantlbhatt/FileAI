import express from 'express';
import { mastra } from './mastra/index.js';

const app = express();
const port = 3000; // Choose a port for your API server

app.use(express.json()); // Middleware to parse JSON request bodies

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// API endpoint to handle agent queries
app.post('/api/agent-query', async (req, res) => {
  const { message } = req.body; // Expect message in the request body

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    console.log(`API: Received query for Mastra agent: "${message}"`);
    
    // Get the workflow instance directly from the mastra object
    const fileSystemWorkflowInstance = mastra.getWorkflow('file-system-workflow');
    if (!fileSystemWorkflowInstance) {
      return res.status(500).json({ error: "file-system-workflow not found in Mastra instance." });
    }

    const result = await mastra.execute(fileSystemWorkflowInstance, { 
      message: message // Pass the raw message to the workflow
    });
    console.log("API: Mastra Workflow Result:", result);

    // Respond with the agent's processed result
    res.json({ response: result });

  } catch (error: any) {
    console.error("API: Error processing agent query:", error);
    res.status(500).json({ error: "Failed to process agent query", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Agent API server listening on http://localhost:${port}`);
});
