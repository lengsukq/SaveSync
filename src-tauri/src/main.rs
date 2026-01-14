// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;

use commands::*;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            list_game_saves,
            create_game_save,
            update_game_save,
            delete_game_save,
            create_backup,
            list_backups,
            restore_backup,
            delete_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
