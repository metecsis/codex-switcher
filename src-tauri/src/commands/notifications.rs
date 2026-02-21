//! Notification settings commands

use crate::auth::storage::{load_accounts, save_accounts};
use crate::types::{LastNotifications, NotificationSettings};

/// Validate notification settings
fn validate_settings(settings: &NotificationSettings) -> Result<(), String> {
    if let Some(threshold) = settings.primary_threshold {
        if threshold > 100 {
            return Err("primary_threshold must be between 0 and 100".to_string());
        }
    }
    if let Some(threshold) = settings.secondary_threshold {
        if threshold > 100 {
            return Err("secondary_threshold must be between 0 and 100".to_string());
        }
    }
    if let Some(threshold) = settings.credits_threshold {
        if threshold > 100 {
            return Err("credits_threshold must be between 0 and 100".to_string());
        }
    }
    if settings.min_interval_minutes < 1 {
        return Err("min_interval_minutes must be at least 1".to_string());
    }
    // Note: min_interval_minutes is u8, max value is 255, which is ~4.25 hours
    // This is a reasonable maximum for a notification cooldown
    Ok(())
}

/// Update notification settings for an account
#[tauri::command]
pub async fn update_notification_settings(
    account_id: String,
    settings: NotificationSettings,
) -> Result<(), String> {
    validate_settings(&settings)?;
    
    let mut store = load_accounts().map_err(|e| e.to_string())?;

    if let Some(account) = store.accounts.iter_mut().find(|a| a.id == account_id) {
        account.notification_settings = settings;
        save_accounts(&store).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Account not found: {}", account_id))
    }
}

/// Get notification settings for an account
#[tauri::command]
pub async fn get_notification_settings(
    account_id: String,
) -> Result<NotificationSettings, String> {
    let store = load_accounts().map_err(|e| e.to_string())?;

    if let Some(account) = store.accounts.iter().find(|a| a.id == account_id) {
        Ok(account.notification_settings.clone())
    } else {
        Err(format!("Account not found: {}", account_id))
    }
}

/// Reset last notification timestamps for an account (e.g., when thresholds are changed)
#[tauri::command]
pub async fn reset_notification_history(account_id: String) -> Result<(), String> {
    let mut store = load_accounts().map_err(|e| e.to_string())?;

    if let Some(account) = store.accounts.iter_mut().find(|a| a.id == account_id) {
        account.last_notifications = LastNotifications::default();
        save_accounts(&store).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Account not found: {}", account_id))
    }
}
