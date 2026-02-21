//! Usage query Tauri commands

use crate::api::usage::{get_account_usage, refresh_all_usage};
use crate::auth::storage::update_last_notifications;
use crate::auth::{get_account, load_accounts};
use crate::notifications::check_and_notify;
use crate::types::UsageInfo;

/// Get usage info for a specific account
#[tauri::command]
pub async fn get_usage(account_id: String) -> Result<UsageInfo, String> {
    let account = get_account(&account_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Account not found: {account_id}"))?;

    get_account_usage(&account).await.map_err(|e| e.to_string())
}

/// Refresh usage info for all accounts
#[tauri::command]
pub async fn refresh_all_accounts_usage(
    app: tauri::AppHandle,
) -> Result<Vec<UsageInfo>, String> {
    let store = load_accounts().map_err(|e| e.to_string())?;
    let usage_list = refresh_all_usage(&store.accounts).await;

    // Check thresholds and send notifications
    for usage in &usage_list {
        if let Some(account) = store.accounts.iter().find(|a| a.id == usage.account_id) {
            let mut last = account.last_notifications.clone();
            if let Err(e) = check_and_notify(
                &app,
                &account.name,
                usage,
                &account.notification_settings,
                &mut last,
            ) {
                eprintln!("[Notifications] Failed to send notification for {}: {}", account.name, e);
            }
            // Update last_notifications in storage if changed
            if last != account.last_notifications {
                if let Err(e) = update_last_notifications(&account.id, &last) {
                    eprintln!("[Notifications] Failed to update last_notifications for {}: {}", account.id, e);
                }
            }
        }
    }

    Ok(usage_list)
}
