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
        backupDirectory: data.backup_directory,
        defaultMaxBackups: data.default_max_backups,
        defaultBackupInterval: data.default_backup_interval,
        theme: data.theme,
        defaultWebdavUrl: data.default_webdav_url,
        defaultWebdavUsername: data.default_webdav_username,
        defaultWebdavPassword: data.default_webdav_password,
        defaultWebdavRemotePath: data.default_webdav_remote_path,
      };
    } catch (error) {
      console.error("Failed to load settings:", error);
      // 返回默认设置
      return {
        backupDirectory: "",
        defaultMaxBackups: 10,
        defaultBackupInterval: 60,
        theme: 'system',
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
      default_webdav_url: updates.defaultWebdavUrl,
      default_webdav_username: updates.defaultWebdavUsername,
      default_webdav_password: updates.defaultWebdavPassword,
      default_webdav_remote_path: updates.defaultWebdavRemotePath,
    });
    return {
      backupDirectory: data.backup_directory,
      defaultMaxBackups: data.default_max_backups,
      defaultBackupInterval: data.default_backup_interval,
      theme: data.theme,
      defaultWebdavUrl: data.default_webdav_url,
      defaultWebdavUsername: data.default_webdav_username,
      defaultWebdavPassword: data.default_webdav_password,
      defaultWebdavRemotePath: data.default_webdav_remote_path,
    };
  }
}
