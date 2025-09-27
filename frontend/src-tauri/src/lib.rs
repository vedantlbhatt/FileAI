use tauri::generate_handler;
use serde_json::Value;
use std::process::Command;
use std::path::PathBuf;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Removed chatbot_query and execute_file_system_workflow commands

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(generate_handler![greet]) // Only greet command is registered now
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
