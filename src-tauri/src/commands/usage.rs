//! Usage query Tauri commands

use crate::api::usage::{get_account_usage, refresh_all_usage, warmup_account as send_warmup};
use crate::auth::storage::update_last_notifications;
use crate::auth::{get_account, load_accounts};
use crate::notifications::check_and_notify;
use crate::types::{UsageInfo, WarmupSummary};

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

/// Send a minimal warm-up request for one account
#[tauri::command]
pub async fn warmup_account(account_id: String) -> Result<(), String> {
    let account = get_account(&account_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Account not found: {account_id}"))?;

    send_warmup(&account).await.map_err(|e| e.to_string())
}

/// Send minimal warm-up requests for all accounts
#[tauri::command]
pub async fn warmup_all_accounts() -> Result<WarmupSummary, String> {
    let store = load_accounts().map_err(|e| e.to_string())?;
    let total_accounts = store.accounts.len();
    let mut failed_account_ids = Vec::new();

    for account in &store.accounts {
        if send_warmup(account).await.is_err() {
            failed_account_ids.push(account.id.clone());
        }
    }

    let warmed_accounts = total_accounts.saturating_sub(failed_account_ids.len());
    Ok(WarmupSummary {
        total_accounts,
        warmed_accounts,
        failed_account_ids,
    })
}
