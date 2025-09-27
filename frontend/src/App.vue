<script setup>
import { ref, onMounted, computed } from "vue";

// State management
const currentPath = ref("/Users/vedantbhatt");
const files = ref([]);
const selectedFiles = ref(new Set());
const chatHistory = ref([]);
const chatInput = ref("");
const isLoading = ref(false);
const sidebarCollapsed = ref(false);
const viewMode = ref("list"); // "list" or "grid"
const searchQuery = ref("");

// Chatbot functionality
async function callAgentApi(message) {
  if (!message.trim()) return;
  
  isLoading.value = true;
  chatHistory.value.push({ 
    sender: "user", 
    text: message,
    timestamp: new Date()
  });
  
  try {
    const response = await fetch("http://localhost:3000/api/agent-query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: message }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      let responseText = "";
      let responseData = data.response;
      
      // Handle different response formats
      if (responseData && responseData.message) {
        responseText = responseData.message;
      } else if (responseData && responseData.contents) {
        // This is a directory listing response
        files.value = responseData.contents;
        responseText = `Found ${responseData.contents.length} items in ${currentPath.value}`;
      } else if (responseData) {
        responseText = JSON.stringify(responseData, null, 2);
      } else {
        responseText = JSON.stringify(data, null, 2);
      }
      
      chatHistory.value.push({ 
        sender: "bot", 
        text: responseText,
        timestamp: new Date()
      });
      
      // If the response contains file operations, refresh the file list
      if (responseText.includes("list") || responseText.includes("directory")) {
        await loadFiles();
      }
    } else {
      chatHistory.value.push({ 
        sender: "bot", 
        text: `Error: ${data.error || response.statusText}`,
        timestamp: new Date()
      });
    }
  } catch (error) {
    chatHistory.value.push({ 
      sender: "bot", 
      text: `Network Error: ${error.message}`,
      timestamp: new Date()
    });
  } finally {
    isLoading.value = false;
  }
}

async function sendChat() {
  if (!chatInput.value.trim()) return;
  await callAgentApi(chatInput.value);
  chatInput.value = "";
}

// File system operations
async function loadFiles() {
  try {
    const response = await fetch("http://localhost:3000/api/agent-query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: `List files in directory: ${currentPath.value}` }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.response && data.response.contents) {
      files.value = data.response.contents;
    } else {
      console.error("Failed to load files:", data);
    }
  } catch (error) {
    console.error("Error loading files:", error);
  }
}

function navigateToPath(path) {
  currentPath.value = path;
  loadFiles();
}

function goUp() {
  const parentPath = currentPath.value.split('/').slice(0, -1).join('/') || '/';
  navigateToPath(parentPath);
}

function selectFile(file) {
  if (selectedFiles.value.has(file.name)) {
    selectedFiles.value.delete(file.name);
  } else {
    selectedFiles.value.add(file.name);
  }
}

function openFile(file) {
  if (file.type === 'directory') {
    navigateToPath(file.path);
  } else {
    callAgentApi(`Read the content of file: ${file.path}`);
  }
}

// Computed properties
const filteredFiles = computed(() => {
  if (!searchQuery.value) return files.value;
  return files.value.filter(file => 
    file.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const canGoUp = computed(() => {
  return currentPath.value !== '/' && currentPath.value !== '';
});

// Utility functions
function formatFileSize(bytes) {
  if (!bytes) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Lifecycle
onMounted(() => {
  loadFiles();
});
</script>

<template>
  <div class="finder-app">
    <!-- Title Bar -->
    <div class="title-bar">
      <div class="title-bar-controls">
        <div class="control close"></div>
        <div class="control minimize"></div>
        <div class="control maximize"></div>
      </div>
      <div class="title-bar-title">FileAI</div>
    </div>

    <!-- Main Finder Interface -->
    <div class="finder-window">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-group">
          <button @click="goUp" :disabled="!canGoUp" class="toolbar-button" title="Go Back">
            <span class="icon">←</span>
          </button>
          <button @click="loadFiles" class="toolbar-button" title="Reload">
            <span class="icon">↻</span>
          </button>
        </div>
        
        <div class="path-bar">
          <span class="path-text">{{ currentPath }}</span>
        </div>
        
        <div class="toolbar-group">
          <button @click="viewMode = 'list'" :class="{ active: viewMode === 'list' }" class="toolbar-button" title="List View">
            <span class="icon">☰</span>
          </button>
          <button @click="viewMode = 'grid'" :class="{ active: viewMode === 'grid' }" class="toolbar-button" title="Grid View">
            <span class="icon">⊞</span>
          </button>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="main-content">
        <!-- Sidebar -->
        <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
          <div class="sidebar-header">
            <h3>Favorites</h3>
            <button @click="sidebarCollapsed = !sidebarCollapsed" class="collapse-btn">
              {{ sidebarCollapsed ? '→' : '←' }}
            </button>
          </div>
          <div class="sidebar-content" v-if="!sidebarCollapsed">
            <div class="sidebar-item" @click="navigateToPath('/Users/vedantbhatt')">
              <span class="icon">🏠</span> Home
            </div>
            <div class="sidebar-item" @click="navigateToPath('/Users/vedantbhatt/Desktop')">
              <span class="icon">🖥️</span> Desktop
            </div>
            <div class="sidebar-item" @click="navigateToPath('/Users/vedantbhatt/Documents')">
              <span class="icon">📄</span> Documents
            </div>
            <div class="sidebar-item" @click="navigateToPath('/Users/vedantbhatt/Downloads')">
              <span class="icon">⬇️</span> Downloads
            </div>
          </div>
        </div>

        <!-- File Browser -->
        <div class="file-browser">
          <!-- Search Bar -->
          <div class="search-bar">
            <input 
              v-model="searchQuery" 
              placeholder="Search files..." 
              class="search-input"
            />
            <span class="search-icon">🔍</span>
          </div>

          <!-- File List -->
          <div class="file-list" :class="viewMode">
            <div 
              v-for="file in filteredFiles" 
              :key="file.name"
              :class="['file-item', { selected: selectedFiles.has(file.name) }]"
              @click="openFile(file)"
              @contextmenu.prevent="selectFile(file)"
            >
              <div class="file-icon">
                <span v-if="file.type === 'directory'">📁</span>
                <span v-else-if="file.name.endsWith('.txt')">📄</span>
                <span v-else-if="file.name.endsWith('.pdf')">📕</span>
                <span v-else-if="file.name.endsWith('.jpg') || file.name.endsWith('.png')">🖼️</span>
                <span v-else>📄</span>
              </div>
              <div class="file-info">
                <div class="file-name">{{ file.name }}</div>
                <div class="file-meta" v-if="file.size">
                  {{ formatFileSize(file.size) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Panel -->
        <div class="chat-panel">
          <div class="chat-header">
            <h3>AI Assistant</h3>
            <div class="chat-status" :class="{ loading: isLoading }">
              {{ isLoading ? 'Thinking...' : 'Ready' }}
            </div>
          </div>
          
          <div class="chat-messages">
            <div 
              v-for="(msg, idx) in chatHistory" 
              :key="idx" 
              :class="['message', msg.sender]"
            >
              <div class="message-content">
                <div class="message-text">{{ msg.text }}</div>
                <div class="message-time">
                  {{ new Date(msg.timestamp).toLocaleTimeString() }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="chat-input">
            <form @submit.prevent="sendChat">
              <input 
                v-model="chatInput" 
                placeholder="Ask me to help with files..." 
                :disabled="isLoading"
                class="chat-input-field"
              />
              <button type="submit" :disabled="isLoading || !chatInput.trim()" class="send-button">
                <span v-if="isLoading">⏳</span>
                <span v-else>→</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Reset and base styles */
* {
  box-sizing: border-box;
}

.finder-app {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: #f0f0f0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Title Bar */
.title-bar {
  background: linear-gradient(to bottom, #e8e8e8, #d0d0d0);
  border-bottom: 1px solid #a0a0a0;
  height: 28px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  -webkit-app-region: drag;
}

.title-bar-controls {
  display: flex;
  gap: 8px;
  margin-right: 12px;
}

.control {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: pointer;
}

.control.close { background: #ff5f57; }
.control.minimize { background: #ffbd2e; }
.control.maximize { background: #28ca42; }

.title-bar-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

/* Main Finder Window */
.finder-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  margin: 8px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* Toolbar */
.toolbar {
  background: #f8f8f8;
  border-bottom: 1px solid #d0d0d0;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-group {
  display: flex;
  gap: 4px;
}

.toolbar-button {
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.toolbar-button:hover {
  background: #f0f0f0;
  border-color: #007AFF;
}

.toolbar-button.active {
  background: #007AFF;
  color: white;
  border-color: #007AFF;
}

.toolbar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.path-bar {
  flex: 1;
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 12px;
  color: #333;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 200px;
  background: #f8f8f8;
  border-right: 1px solid #d0d0d0;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
}

.sidebar.collapsed {
  width: 40px;
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-header h3 {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: #666;
}

.sidebar-content {
  flex: 1;
  padding: 8px 0;
}

.sidebar-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #333;
  transition: background 0.2s;
}

.sidebar-item:hover {
  background: #e8e8e8;
}

/* File Browser */
.file-browser {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-bar {
  padding: 8px 12px;
  border-bottom: 1px solid #d0d0d0;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 6px 30px 6px 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
}

.search-input:focus {
  border-color: #007AFF;
}

.search-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #666;
}

/* File List */
.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.file-list.list {
  display: flex;
  flex-direction: column;
}

.file-list.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  border: 1px solid transparent;
}

.file-list.grid .file-item {
  flex-direction: column;
  text-align: center;
  padding: 12px 8px;
}

.file-item:hover {
  background: #f0f0f0;
}

.file-item.selected {
  background: #007AFF;
  color: white;
}

.file-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.file-list.grid .file-icon {
  font-size: 24px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 10px;
  color: #666;
  margin-top: 2px;
}

.file-item.selected .file-meta {
  color: rgba(255, 255, 255, 0.8);
}

/* Chat Panel */
.chat-panel {
  width: 300px;
  background: #f8f8f8;
  border-left: 1px solid #d0d0d0;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 12px;
  border-bottom: 1px solid #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-header h3 {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.chat-status {
  font-size: 10px;
  color: #666;
  padding: 2px 6px;
  border-radius: 10px;
  background: #e8e8e8;
}

.chat-status.loading {
  background: #007AFF;
  color: white;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message {
  display: flex;
  flex-direction: column;
}

.message.user {
  align-items: flex-end;
}

.message.bot {
  align-items: flex-start;
}

.message-content {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.4;
}

.message.user .message-content {
  background: #007AFF;
  color: white;
  border-bottom-right-radius: 4px;
}

.message.bot .message-content {
  background: white;
  color: #333;
  border: 1px solid #d0d0d0;
  border-bottom-left-radius: 4px;
}

.message-time {
  font-size: 10px;
  color: #666;
  margin-top: 4px;
}

.message.user .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.chat-input {
  padding: 12px;
  border-top: 1px solid #d0d0d0;
}

.chat-input form {
  display: flex;
  gap: 8px;
}

.chat-input-field {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 16px;
  font-size: 12px;
  outline: none;
  background: white;
}

.chat-input-field:focus {
  border-color: #007AFF;
}

.send-button {
  background: #007AFF;
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: background 0.2s;
}

.send-button:hover:not(:disabled) {
  background: #0056CC;
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
