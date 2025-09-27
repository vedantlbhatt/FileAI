import { fileSystemTools } from './mastra/tools/file-system-tool';
import * as path from 'path';
import * as fs from 'fs/promises'; // Import fs/promises for file operations

async function runTests() {
  console.log('--- Testing File System Tools Directly ---');

  // Test 1: List Directory
  try {
    const directoryToList = '.'; // Current directory
    console.log(`\nListing contents of: ${directoryToList}`);
    const listResult = await fileSystemTools.list_directory.execute({ context: { directoryPath: directoryToList } });
    console.log('List Directory Result:', listResult);
  } catch (error) {
    console.error('List Directory Error:', error);
  }

  // Test 2: Read File Content (replace with a known file in your project)
  try {
    const fileToRead = path.join(__dirname, 'mastra', 'index.ts'); // Example: read agent/src/mastra/index.ts
    console.log(`\nReading content of: ${fileToRead}`);
    const readResult = await fileSystemTools.read_file_content.execute({ context: { filePath: fileToRead } });
    console.log('Read File Content (first 200 chars):', readResult.content.substring(0, 200) + '...');
  } catch (error) {
    console.error('Read File Content Error:', error);
  }

  // Test 3: Semantic Search (placeholder, will use basic string matching)
  try {
    const searchDirectory = '.'; // Current directory
    const searchQuery = 'fileSystem';
    console.log(`\nSearching for '${searchQuery}' in: ${searchDirectory}`);
    const searchResult = await fileSystemTools.search_file_semantic.execute({ context: { query: searchQuery, targetDirectory: searchDirectory } });
    console.log('Semantic Search Result:', searchResult);
  } catch (error) {
    console.error('Semantic Search Error:', error);
  }

  // Test 4: Move File (USE WITH CAUTION - creates/moves actual files)
  // Ensure 'test_file.txt' exists in the 'agent/src' directory before running this test.
  // Or create it programmatically if you wish.
  try {
    const source = path.join(__dirname, 'test_file.txt');
    const destination = path.join(__dirname, 'moved_test_file.txt');

    // Create a dummy file for moving
    await fs.writeFile(source, 'This is a test file to be moved.');

    console.log(`\nMoving file from ${source} to ${destination}`);
    const moveResult = await fileSystemTools.move_file.execute({ context: { sourcePath: source, destinationPath: destination } });
    console.log('Move File Result:', moveResult);

    // Move it back or delete it after testing to clean up
    await fs.rename(destination, source);
    console.log(`Moved file back to ${source}`);

  } catch (error) {
    console.error('Move File Error:', error);
  }
}

runTests();
