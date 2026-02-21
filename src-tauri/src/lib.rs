//! Codex Switcher - Multi-account manager for Codex CLI

pub mod api;
pub mod auth;
pub mod commands;
pub mod notifications;
pub mod types;

use commands::{
    add_account_from_file, cancel_login, check_codex_processes, complete_login, delete_account,
    get_active_account_info, get_notification_settings, get_usage, list_accounts,
    refresh_all_accounts_usage, rename_account, reset_notification_history, start_login,
    switch_account, update_notification_settings,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            // Account management
            list_accounts,
            get_active_account_info,
            add_account_from_file,
            switch_account,
            delete_account,
            rename_account,
            // OAuth
            start_login,
            complete_login,
            cancel_login,
            // Usage
            get_usage,
            refresh_all_accounts_usage,
            // Process detection
            check_codex_processes,
            // Notifications
            update_notification_settings,
            get_notification_settings,
            reset_notification_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
