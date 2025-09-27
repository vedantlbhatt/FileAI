<script setup>
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";

const chatHistory = ref([]);
const chatInput = ref("");
const actionMsg = ref("");

// Directory actions
async function sortDirectory() {
  actionMsg.value = await invoke("sort_directory");
}
async function semanticSearch() {
  actionMsg.value = await invoke("semantic_search_directory");
}
async function moveContent() {
  actionMsg.value = await invoke("move_content_directory");
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
      <div class="finder-actions">
        <button @click="sortDirectory" title="Sort Directory">
          <span class="icon">⇅</span> Sort
        </button>
        <button @click="semanticSearch" title="Semantic Search">
          <span class="icon">🔍</span> Search
        </button>
        <button @click="moveContent" title="Move Content">
          <span class="icon">📁</span> Move
        </button>
      </div>
    </header>
    <section class="finder-main">
      <aside class="finder-sidebar">
        <ul>
          <li><span class="icon">🏠</span> Home</li>
          <li><span class="icon">📄</span> Documents</li>
          <li><span class="icon">🖼️</span> Pictures</li>
          <li><span class="icon">🎵</span> Music</li>
          <li><span class="icon">📥</span> Downloads</li>
        </ul>
      </aside>
      <section class="finder-content">
        <div class="finder-toolbar">
          <span>{{ actionMsg }}</span>
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
}
.finder-sidebar {
  width: 180px;
  background: #f3f3f6;
  border-right: 1px solid #d0d0d0;
  padding: 1em 0.5em;
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
  flex-direction: column;
  align-items: stretch;
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
  max-width: 600px;
  margin: 0 auto;
}
.chat-title {
  text-align: center;
  font-size: 1.15em;
  font-weight: 500;
  margin-bottom: 0.7em;
  color: #396cd8;
}
.chat-history {
  min-height: 120px;
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
</style>
