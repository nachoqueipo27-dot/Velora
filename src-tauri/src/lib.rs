// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use tauri_plugin_http::reqwest;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Credenciales embebidas en build (ver build.rs). option_env! evita fallar la
// compilación si falta el .env; en ese caso el sync fallará al postear.
const SUPABASE_URL: &str = match option_env!("SUPABASE_URL") {
    Some(v) => v,
    None => "",
};
const SUPABASE_SERVICE_KEY: &str = match option_env!("SUPABASE_SERVICE_KEY") {
    Some(v) => v,
    None => "",
};

#[derive(Serialize, Deserialize, Debug)]
struct SyncPayload {
    local_id: String,
    tabla: String,
    registros: Vec<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug)]
struct SyncResponse {
    ok: bool,
    procesados: i32,
    error: Option<String>,
}

#[tauri::command]
async fn sync_tabla(payload: SyncPayload) -> Result<SyncResponse, String> {
    let url = format!(
        "{}/rest/v1/{}_mirror?on_conflict=local_id,local_row_id",
        SUPABASE_URL, payload.tabla
    );

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("apikey", SUPABASE_SERVICE_KEY)
        .header("Authorization", format!("Bearer {}", SUPABASE_SERVICE_KEY))
        .header("Content-Type", "application/json")
        .header("Prefer", "resolution=merge-duplicates")
        .body(serde_json::to_string(&payload.registros).map_err(|e| e.to_string())?)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        Ok(SyncResponse {
            ok: true,
            procesados: payload.registros.len() as i32,
            error: None,
        })
    } else {
        let error = response.text().await.unwrap_or_default();
        Err(format!("Supabase error: {}", error))
    }
}

#[tauri::command]
async fn sync_heartbeat(payload: serde_json::Value) -> Result<bool, String> {
    let url = format!("{}/rest/v1/heartbeat?on_conflict=local_id", SUPABASE_URL);

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("apikey", SUPABASE_SERVICE_KEY)
        .header("Authorization", format!("Bearer {}", SUPABASE_SERVICE_KEY))
        .header("Content-Type", "application/json")
        .header("Prefer", "resolution=merge-duplicates")
        .body(serde_json::to_string(&payload).map_err(|e| e.to_string())?)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(response.status().is_success())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![greet, sync_tabla, sync_heartbeat])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
