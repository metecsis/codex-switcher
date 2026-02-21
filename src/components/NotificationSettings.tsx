import { useState, useEffect, useCallback } from "react";
import type { NotificationSettings as NotificationSettingsType } from "../types";

interface NotificationSettingsProps {
  accountId: string;
  accountName: string;
  onGetSettings: (accountId: string) => Promise<NotificationSettingsType>;
  onUpdateSettings: (
    accountId: string,
    settings: NotificationSettingsType
  ) => Promise<void>;
  onResetHistory: (accountId: string) => Promise<void>;
}

export function NotificationSettings({
  accountId,
  accountName,
  onGetSettings,
  onUpdateSettings,
  onResetHistory,
}: NotificationSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingsType>({
    enabled: false,
    primary_threshold: 80,
    secondary_threshold: 80,
    credits_threshold: 20,
    min_interval_minutes: 60,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [thresholdErrors, setThresholdErrors] = useState<Record<string, string>>({});

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await onGetSettings(accountId);
      setSettings(data);
    } catch (err) {
      console.error("Failed to load notification settings:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [accountId, onGetSettings]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setShowResetConfirm(false);
      setThresholdErrors({});
      loadSettings();
    }
  }, [isOpen, loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onUpdateSettings(accountId, settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save notification settings:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }
    try {
      setError(null);
      await onResetHistory(accountId);
      // Reload settings after reset
      await loadSettings();
      setShowResetConfirm(false);
    } catch (err) {
      console.error("Failed to reset notification history:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const updateField = <K extends keyof NotificationSettingsType>(
    field: K,
    value: NotificationSettingsType[K]
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const toggleEnabled = () => {
    updateField("enabled", !settings.enabled);
  };

  const updateThreshold = (
    field: "primary_threshold" | "secondary_threshold" | "credits_threshold",
    value: string
  ) => {
    if (value === "") {
      updateField(field, null);
      setThresholdErrors((prev) => ({ ...prev, [field]: "" }));
    } else {
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        setThresholdErrors((prev) => ({ ...prev, [field]: "Invalid number" }));
      } else if (num < 0 || num > 100) {
        setThresholdErrors((prev) => ({ ...prev, [field]: "Must be 0-100" }));
      } else {
        updateField(field, num);
        setThresholdErrors((prev) => ({ ...prev, [field]: "" }));
      }
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          settings.enabled
            ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
            : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
        title="Notification settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {settings.enabled && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-gray-800" />
        )}
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl dark:shadow-black/50 max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notification Settings</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{accountName}</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              {loading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
              ) : (
                <>
                  {/* Enable Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-gray-900 dark:text-gray-100">Enable Notifications</label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Get alerts when thresholds are exceeded</p>
                    </div>
                    <button
                      onClick={toggleEnabled}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.enabled ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {settings.enabled && (
                    <>
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-4" />

                      {/* Primary Rate Limit */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Primary Rate Limit Threshold
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={settings.primary_threshold ?? ""}
                            onChange={(e) => updateThreshold("primary_threshold", e.target.value)}
                            placeholder="Disabled"
                            className={`flex-1 px-3 py-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                              thresholdErrors.primary_threshold
                                ? "border-red-300 dark:border-red-600"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          />
                          <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                        </div>
                        {thresholdErrors.primary_threshold ? (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            {thresholdErrors.primary_threshold}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            5-hour rolling window usage
                          </p>
                        )}
                      </div>

                      {/* Secondary Rate Limit */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Secondary Rate Limit Threshold
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={settings.secondary_threshold ?? ""}
                            onChange={(e) => updateThreshold("secondary_threshold", e.target.value)}
                            placeholder="Disabled"
                            className={`flex-1 px-3 py-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                              thresholdErrors.secondary_threshold
                                ? "border-red-300 dark:border-red-600"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          />
                          <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                        </div>
                        {thresholdErrors.secondary_threshold ? (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            {thresholdErrors.secondary_threshold}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Weekly window usage
                          </p>
                        )}
                      </div>

                      {/* Credits Threshold */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Credits Used Threshold
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={settings.credits_threshold ?? ""}
                            onChange={(e) => updateThreshold("credits_threshold", e.target.value)}
                            placeholder="Disabled"
                            className={`flex-1 px-3 py-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                              thresholdErrors.credits_threshold
                                ? "border-red-300 dark:border-red-600"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          />
                          <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                        </div>
                        {thresholdErrors.credits_threshold ? (
                          <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                            {thresholdErrors.credits_threshold}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Notify when credits used exceeds threshold
                          </p>
                        )}
                      </div>

                      {/* Min Interval */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Minimum Interval Between Notifications
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="1440"
                            value={settings.min_interval_minutes}
                            onChange={(e) => {
                              const num = parseInt(e.target.value, 10);
                              if (!isNaN(num) && num >= 1) {
                                updateField("min_interval_minutes", num);
                              }
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                          <span className="text-sm text-gray-500 dark:text-gray-400">minutes</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Prevents notification spam
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-700">
              {showResetConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-600 dark:text-amber-400">Reset history?</span>
                  <button
                    onClick={handleReset}
                    disabled={loading || saving}
                    className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleReset}
                  disabled={loading || saving}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Reset History
                </button>
              )}
              <div className="flex items-center gap-2">
                {saved && (
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Saved!</span>
                )}
                <button
                  onClick={handleSave}
                  disabled={loading || saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
