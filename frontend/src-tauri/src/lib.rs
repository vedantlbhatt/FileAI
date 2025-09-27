use tauri::{command, generate_handler};
use serde_json::Value;
use std::process::Command;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn execute_file_system_workflow(operation: String, args: Value) -> Result<String, String> {
    println!("Received operation: {} with args: {:?}", operation, args);
    // TODO: Implement actual call to Mastra fileSystemWorkflow
    Ok(format!("Successfully received operation: {} with args: {:?}", operation, args))
}

#[tauri::command]
async fn chatbot_query(message: String) -> Result<String, String> {
    println!("Chatbot received message: {}", message);

    let agent_path = "../../agent/src/run-mastra-query.ts"; // Path to the TypeScript script
    let current_dir = std::env::current_dir()
        .map_err(|e| format!("Failed to get current directory: {}", e))?;
    
    // Construct the command to run ts-node
    // We'll need to make sure ts-node is installed globally or locally in the agent project
    let output = Command::new("npx")
        .arg("ts-node")
        .arg(&agent_path)
        .arg(&message) // Pass the message as a command-line argument
        .current_dir(current_dir.join("agent")) // Run npx ts-node from the agent directory
        .output()
        .map_err(|e| format!("Failed to execute ts-node process: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        println!("Mastra Agent Response: {}", stdout);
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        eprintln!("Mastra Agent Error: {}", stderr);
        Err(format!("Mastra Agent failed: {}", stderr))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(generate_handler![greet, execute_file_system_workflow, chatbot_query])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
