use tauri::{command, generate_handler};
use serde_json::Value;
use std::process::Command;
use std::path::PathBuf;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn execute_file_system_workflow(operation: String, args: Value) -> Result<String, String> {
    println!("[Rust] Received operation: {} with args: {:?}", operation, args);
    // TODO: Implement actual call to Mastra fileSystemWorkflow
    Ok(format!("Successfully received operation: {} with args: {:?}", operation, args))
}

#[tauri::command]
async fn chatbot_query(message: String) -> Result<String, String> {
    println!("[Rust] Chatbot received message: {}", message);

    let current_tauri_dir = std::env::current_dir()
        .map_err(|e| format!("[Rust] Failed to get current Tauri directory: {}", e))?;
    println!("[Rust] Current Tauri directory: {:?}", current_tauri_dir);

    let project_root_dir = current_tauri_dir
        .parent().ok_or_else(|| String::from("[Rust] Failed to get parent of src-tauri"))?
        .parent().ok_or_else(|| String::from("[Rust] Failed to get parent of frontend/"))?;
    
    let agent_project_root_dir = project_root_dir.join("agent");
    println!("[Rust] Calculated agent project root directory: {:?}", agent_project_root_dir);

    let agent_entry_script = agent_project_root_dir.join("run-agent.js"); // Path to the new JS entry point

    if !agent_entry_script.exists() {
        return Err(format!("[Rust] Error: Agent JavaScript entry script not found at {:?}. Did you create 'run-agent.js' in the agent directory?", agent_entry_script));
    }
    println!("[Rust] Full path to agent JavaScript entry script: {:?}", agent_entry_script);

    println!("[Rust] Constructing command: node {:?} {}", agent_entry_script, message);

    let output = Command::new("node")
        .arg(&agent_entry_script) // Pass the ABSOLUTE path to the JS script
        .arg(&message)             // Pass the message as a command-line argument
        .current_dir(&agent_project_root_dir) // Run node from the agent project root
        .output()
        .map_err(|e| format!("[Rust] Failed to execute node process: {}", e))?;

    println!("[Rust] Command finished. Status: {}", output.status);

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        println!("[Rust] Mastra Agent STDOUT: {}", stdout);
        Ok(stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        eprintln!("[Rust] Mastra Agent STDERR: {}", stderr);
        Err(format!("[Rust] Mastra Agent failed: {}", stderr))
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
