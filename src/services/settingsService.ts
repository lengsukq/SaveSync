import { AppSettings } from "../types";
import "../types/electron.d";

export class SettingsService {
  static async getSettings(): Promise<AppSettings> {
    try {
      if (!window.electronAPI) {
        throw new Error("Electron API not available");
      }
      const data = await window.electronAPI.getSettings();
      return {
        backupDirectory: data.backup_directory || "",
        defaultMaxBackups: data.default_max_backups ?? 10,
        defaultBackupInterval: data.default_backup_interval ?? 60,
        theme: data.theme || 'system',
        webdavSources: data.webdav_sources || [],
      };
    } catch (error) {
      console.error("Failed to load settings:", error);
      // 返回默认设置
      return {
        backupDirectory: "",
        defaultMaxBackups: 10,
        defaultBackupInterval: 60,
        theme: 'system',
        webdavSources: [],
      };
    }
  }

  static async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    const data = await window.electronAPI.updateSettings({
      backup_directory: updates.backupDirectory,
      default_max_backups: updates.defaultMaxBackups,
      default_backup_interval: updates.defaultBackupInterval,
      theme: updates.theme,
      webdav_sources: updates.webdavSources,
    });
    return {
      backupDirectory: data.backup_directory || "",
      defaultMaxBackups: data.default_max_backups ?? 10,
      defaultBackupInterval: data.default_backup_interval ?? 60,
      theme: data.theme || 'system',
      webdavSources: data.webdav_sources || [],
    };
  }
}
