mod ai;
mod commands;
mod crypto;
mod domain;
mod storage;

use commands::AppState;
use std::sync::RwLock;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            let app_data = app.path().app_data_dir()?;
            let vault = storage::Vault::new(app_data)?;
            let ai_config = vault.load_ai_config().ok().flatten();
            app.manage(AppState {
                vault,
                ai_config: RwLock::new(ai_config),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::vault_status,
            commands::initialize_vault,
            commands::unlock_vault,
            commands::lock_vault,
            commands::list_memories,
            commands::get_memory,
            commands::list_time_echoes,
            commands::get_time_echo,
            commands::generate_time_echo,
            commands::update_time_echo,
            commands::delete_time_echo,
            commands::save_memory,
            commands::delete_memory_permanently,
            commands::search_memories,
            commands::export_backup,
            commands::restore_backup,
            commands::import_attachment,
            commands::import_attachment_bytes,
            commands::get_attachment_data,
            commands::delete_attachment,
            commands::configure_ai,
            commands::analyze_memory
        ])
        .run(tauri::generate_context!())
        .expect("Pensieve 启动失败");
}
