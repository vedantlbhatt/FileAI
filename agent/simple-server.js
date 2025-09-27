const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());

// Basic logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Simple file system operations
async function listDirectory(directoryPath) {
  try {
    const contents = await fs.readdir(directoryPath, { withFileTypes: true });
    const detailedContents = await Promise.all(
      contents.map(async (item) => {
        const fullPath = path.join(directoryPath, item.name);
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
  } catch (error) {
    throw new Error(`Failed to list directory: ${error.message}`);
  }
}

async function readFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { content };
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

// Simple AI-like response parser
function parseUserQuery(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('list') && lowerMessage.includes('directory')) {
    const match = message.match(/directory:\s*(.+)/i);
    const dirPath = match ? match[1].trim() : '.';
    return { operation: 'list_directory', args: { directoryPath: dirPath } };
  }
  
  if (lowerMessage.includes('read') && lowerMessage.includes('file')) {
    const match = message.match(/file:\s*(.+)/i);
    const filePath = match ? match[1].trim() : '';
    return { operation: 'read_file_content', args: { filePath } };
  }
  
  if (lowerMessage.includes('search')) {
    const match = message.match(/search.*["'](.+)["']/i);
    const query = match ? match[1] : message.replace(/search/i, '').trim();
    return { operation: 'search_file_semantic', args: { query } };
  }
  
  return { operation: 'clarification', args: { text: "I can help you with file operations. Try asking me to 'list files in directory: /path' or 'read file: /path/to/file'" } };
}

// API endpoint to handle agent queries
app.post('/api/agent-query', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    console.log(`API: Received query: "${message}"`);
    
    const parsed = parseUserQuery(message);
    let result;
    
    switch (parsed.operation) {
      case 'list_directory':
        result = await listDirectory(parsed.args.directoryPath);
        break;
      case 'read_file_content':
        result = await readFile(parsed.args.filePath);
        break;
      case 'search_file_semantic':
        // Simple file search
        const searchDir = parsed.args.targetDirectory || '.';
        const allFiles = await listDirectory(searchDir);
        const filtered = allFiles.contents.filter(file => 
          file.name.toLowerCase().includes(parsed.args.query.toLowerCase())
        );
        result = { results: filtered.map(f => f.path) };
        break;
      case 'clarification':
        result = { message: parsed.args.text };
        break;
      default:
        result = { message: "I don't understand that request. Try asking me to list files or read a file." };
    }
    
    console.log("API: Result:", result);
    res.json({ response: result });

  } catch (error) {
    console.error("API: Error processing query:", error);
    res.status(500).json({ error: "Failed to process query", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Simple Agent API server listening on http://localhost:${port}`);
});
