use std::fs;

fn main() {
    tauri_build::build();

    // Embeber credenciales de Supabase como variables de compilación,
    // leídas desde src-tauri/.env (gitignored). Así la service_role key
    // vive en el binario Rust y NO en el bundle JS.
    println!("cargo:rerun-if-changed=.env");
    if let Ok(contents) = fs::read_to_string(".env") {
        for line in contents.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some((k, v)) = line.split_once('=') {
                let (k, v) = (k.trim(), v.trim());
                if k == "SUPABASE_SERVICE_KEY" || k == "SUPABASE_URL" {
                    println!("cargo:rustc-env={}={}", k, v);
                }
            }
        }
    }
}
