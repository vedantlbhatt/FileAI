use tauri::{command, generate_handler};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn execute_file_system_workflow(operation: String, args: serde_json::Value) -> Result<String, String> {
    println!("Received operation: {} with args: {:?}", operation, args);
    // TODO: Implement actual call to Mastra fileSystemWorkflow
    Ok(format!("Successfully received operation: {} with args: {:?}", operation, args))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(generate_handler![greet, execute_file_system_workflow])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
