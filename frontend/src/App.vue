<script setup>
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";

const chatHistory = ref([]);
const chatInput = ref("");
const actionMsg = ref("");

// New reactive variables for file system operations
const filePath = ref("");
const directoryPath = ref("");
const sourcePath = ref("");
const destinationPath = ref("");
const searchQuery = ref("");

// Unified function for directory actions
async function executeFileSystemAction(operation, args) {
  try {
    const response = await invoke("execute_file_system_workflow", { operation, args });
    actionMsg.value = `Operation '${operation}' successful: ${JSON.stringify(response)}`;
    chatHistory.value.push({ sender: "bot", text: actionMsg.value });
  } catch (error) {
    actionMsg.value = `Error during '${operation}': ${error}`;
    chatHistory.value.push({ sender: "bot", text: actionMsg.value });
  }
}

// Chatbot functionality
async function sendChat() {
  if (!chatInput.value) return;
  chatHistory.value.push({ sender: "user", text: chatInput.value });
  const response = await invoke("chatbot_query", { message: chatInput.value });
  chatHistory.value.push({ sender: "bot", text: response });
  chatInput.value = "";
}
</script>

<template>
  <main class="finder-container">
    <header class="finder-header">
      <span class="finder-title">FileAI!</span>
    </header>
    <section class="finder-main">
      
      <section class="finder-content">
        <div class="finder-toolbar">
          <span>{{ actionMsg }}</span>
        </div>

        <div class="finder-actions-sidebar">
          <button @click="executeFileSystemAction('read_file_content', { filePath: filePath })" title="Read File Content">
            <span class="icon">📄</span> Read File
          </button>
          <input v-model="filePath" placeholder="File path to read" class="action-input" />

          <button @click="executeFileSystemAction('list_directory', { directoryPath: directoryPath })" title="List Directory">
            <span class="icon">📂</span> List Dir
          </button>
          <input v-model="directoryPath" placeholder="Directory path to list" class="action-input" />

          <button @click="executeFileSystemAction('move_file', { sourcePath: sourcePath, destinationPath: destinationPath })" title="Move File">
            <span class="icon">📁</span> Move File
          </button>
          <input v-model="sourcePath" placeholder="Source path" class="action-input" />
          <input v-model="destinationPath" placeholder="Destination path" class="action-input" />

          <button @click="executeFileSystemAction('search_file_semantic', { query: searchQuery })" title="Semantic Search">
            <span class="icon">🔍</span> Search
          </button>
          <input v-model="searchQuery" placeholder="Semantic search query" class="action-input" />
        </div>

        <div class="finder-chat">
          <h2 class="chat-title">Request a file operation!</h2>
          <div class="chat-history">
            <div v-for="(msg, idx) in chatHistory" :key="idx" :class="msg.sender">
              <span>{{ msg.text }}</span>
            </div>
          </div>
          <form class="chat-input-row" @submit.prevent="sendChat">
            <input v-model="chatInput" placeholder="Type your message..." />
            <button type="submit">Send</button>
          </form>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.finder-container {
  background: #f9f9fa;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}
.finder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #eaeaea;
  padding: 0.75em 2em;
  border-bottom: 1px solid #d0d0d0;
}
.finder-title {
  font-size: 1.5em;
  font-weight: 600;
  color: #333;
}
.finder-actions button {
  margin-left: 1em;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  padding: 0.5em 1em;
  font-size: 1em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  transition: background 0.2s, border-color 0.2s;
}
.finder-actions button:hover {
  background: #f0f0f0;
  border-color: #396cd8;
}
.icon {
  font-size: 1.2em;
}
.finder-main {
  display: flex;
  flex: 1;
  justify-content: space-between; /* Space out children */
}

.finder-actions-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1em; /* Space between action items */
  padding: 1em;
  background: #f3f3f6;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.finder-sidebar {
  display: none; /* Hide the sidebar */
}
.finder-sidebar ul {
  list-style: none;
  padding: 0;
}
.finder-sidebar li {
  padding: 0.7em 1em;
  margin-bottom: 0.2em;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.7em;
  color: #444;
  transition: background 0.2s;
}
.finder-sidebar li:hover {
  background: #e0e7ff;
}
.finder-content {
  flex: 1;
  padding: 2em;
  display: flex;
  flex-direction: row; /* Arrange children horizontally */
  align-items: flex-start; /* Align items to the top */
  gap: 2em; /* Space between sidebar and chat */
}
.finder-toolbar {
  margin-bottom: 1em;
  font-size: 1em;
  color: #396cd8;
}
.finder-chat {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 1em;
  max-width: 100%; /* Increased max-width to fill container */
  margin: 0; /* Align to left */
}
.chat-title {
  text-align: center;
  font-size: 1.15em;
  font-weight: 500;
  margin-bottom: 0.7em;
  color: #396cd8;
}
.chat-history {
  min-height: 300px; /* Increased min-height */
  margin-bottom: 1em;
  text-align: left;
}
.user {
  color: #396cd8;
  font-weight: bold;
}
.bot {
  color: #24c8db;
  font-weight: bold;
}
.chat-input-row {
  display: flex;
  gap: 0.5em;
}
input {
  border-radius: 8px;
  border: 1px solid #ccc;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-family: inherit;
  color: #0f0f0f;
  background-color: #ffffff;
  outline: none;
  flex: 1;
}
button[type="submit"] {
  border-radius: 8px;
  border: 1px solid #396cd8;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-family: inherit;
  color: #fff;
  background-color: #396cd8;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
button[type="submit"]:hover {
  background: #274ea3;
  border-color: #274ea3;
}
.action-input {
  margin-left: 1em;
  border-radius: 6px;
  border: 1px solid #d0d0d0;
  padding: 0.5em 1em;
  font-size: 1em;
  outline: none;
}
</style>
