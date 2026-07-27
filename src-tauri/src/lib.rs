// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use bcrypt::{hash, verify, DEFAULT_COST};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Cifrado de contraseñas con bcrypt — SIEMPRE en Rust, nunca en JS.
#[tauri::command]
fn hash_password(password: String) -> Result<String, String> {
    hash(password, DEFAULT_COST).map_err(|e| e.to_string())
}

#[tauri::command]
fn verify_password(password: String, hash_str: String) -> Result<bool, String> {
    verify(password, &hash_str).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, hash_password, verify_password])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
