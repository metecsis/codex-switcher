//! OS native notifications for usage thresholds

use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use crate::types::{LastNotifications, NotificationSettings, UsageInfo};
use chrono::{DateTime, Duration, Utc};

/// Get the icon path for notifications
/// On Linux/KDE, we need an absolute path or a themed icon name
fn get_notification_icon_path() -> String {
    // Try to get the icon from the installed app icon
    // For AppImage or system install, this would be the desktop file icon
    // For development, fall back to a themed icon
    #[cfg(target_os = "linux")]
    {
        // Check if we're running from an AppImage or installed
        if let Ok(exe_path) = std::env::current_exe() {
            // Try to find icon next to executable (AppImage case)
            if let Some(exe_dir) = exe_path.parent() {
                let icon_path = exe_dir.join("icon.png");
                if icon_path.exists() {
                    return icon_path.to_string_lossy().to_string();
                }
            }
        }
        // Fall back to a standard themed icon name for Linux
        // KDE/GNOME will look this up in the icon theme
        "dialog-information".to_string()
    }
    #[cfg(not(target_os = "linux"))]
    {
        // On Windows/macOS, use the bundled app icon
        "icon".to_string()
    }
}

/// Check if notification should be sent based on threshold and cooldown
fn should_notify(
    current_value: f64,
    threshold: Option<u8>,
    last_notified: Option<DateTime<Utc>>,
    min_interval: i64,
) -> bool {
    let Some(threshold) = threshold else {
        return false;
    };
    if current_value < threshold as f64 {
        return false;
    }
    if let Some(last) = last_notified {
        let elapsed = Utc::now().signed_duration_since(last);
        if elapsed < Duration::minutes(min_interval) {
            return false;
        }
    }
    true
}

/// Parse credits balance string like "$10.50" to get the numeric value
fn parse_credits_balance(balance: &str) -> Option<f64> {
    // Remove currency symbol and parse
    let numeric: String = balance.chars().filter(|c| c.is_numeric() || *c == '.').collect();
    numeric.parse::<f64>().ok()
}

/// Get estimated maximum credits based on plan type.
/// 
/// Note: These are rough estimates based on typical OpenAI plan limits.
/// Actual limits may vary and change over time. Consider making these
/// configurable in a future release.
fn get_plan_credits_max(plan_type: Option<&str>) -> f64 {
    match plan_type {
        Some("free") => 0.0,     // Free tier typically has no credits
        Some("plus") => 50.0,    // Plus typically has ~$50 in credits
        Some("pro") => 100.0,    // Pro has higher limits
        Some("team") => 500.0,   // Team has pooled credits
        Some("business") => 1000.0,
        Some("enterprise") => 5000.0,
        _ => 100.0, // Default estimate for unknown plans
    }
}

/// Send OS notification for usage threshold
pub fn send_usage_notification(
    app: &AppHandle,
    account_name: &str,
    usage_type: &str,
    current_percent: f64,
) -> Result<(), String> {
    let icon_path = get_notification_icon_path();
    app.notification()
        .builder()
        .title(format!("Codex Switcher: {}", account_name))
        .body(format!(
            "{} usage at {:.1}% - threshold exceeded",
            usage_type, current_percent
        ))
        .icon(&icon_path)
        .show()
        .map_err(|e| e.to_string())
}

/// Send OS notification for low credits
pub fn send_credits_notification(
    app: &AppHandle,
    account_name: &str,
    balance: &str,
) -> Result<(), String> {
    let icon_path = get_notification_icon_path();
    app.notification()
        .builder()
        .title(format!("Codex Switcher: {}", account_name))
        .body(format!("Credits balance is low: {}", balance))
        .icon(&icon_path)
        .show()
        .map_err(|e| e.to_string())
}

/// Check usage and send notifications if thresholds exceeded
pub fn check_and_notify(
    app: &AppHandle,
    account_name: &str,
    usage: &UsageInfo,
    settings: &NotificationSettings,
    last: &mut LastNotifications,
) -> Result<(), String> {
    if !settings.enabled {
        return Ok(());
    }

    // Check primary threshold
    if let Some(primary) = usage.primary_used_percent {
        if should_notify(
            primary,
            settings.primary_threshold,
            last.primary,
            settings.min_interval_minutes as i64,
        ) {
            send_usage_notification(app, account_name, "Primary rate limit", primary)?;
            last.primary = Some(Utc::now());
        }
    }

    // Check secondary threshold
    if let Some(secondary) = usage.secondary_used_percent {
        if should_notify(
            secondary,
            settings.secondary_threshold,
            last.secondary,
            settings.min_interval_minutes as i64,
        ) {
            send_usage_notification(app, account_name, "Secondary rate limit", secondary)?;
            last.secondary = Some(Utc::now());
        }
    }

    // Check credits threshold
    // Only notify if: has credits, not unlimited, balance is set, and threshold is configured
    if let (Some(has_credits), Some(unlimited)) = (usage.has_credits, usage.unlimited_credits) {
        if has_credits && !unlimited {
            if let Some(ref balance_str) = usage.credits_balance {
                if let Some(threshold) = settings.credits_threshold {
                    if let Some(balance) = parse_credits_balance(balance_str) {
                        let max_credits = get_plan_credits_max(usage.plan_type.as_deref());
                        if max_credits > 0.0 {
                            let used_percent = ((max_credits - balance) / max_credits) * 100.0;

                            if should_notify(
                                used_percent,
                                Some(threshold),
                                last.credits,
                                settings.min_interval_minutes as i64,
                            ) {
                                send_credits_notification(app, account_name, balance_str)?;
                                last.credits = Some(Utc::now());
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(())
}
