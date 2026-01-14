import { GameSave, Backup } from "../types";
import "../types/electron.d";

export class GameSaveService {
  static async listGameSaves(): Promise<GameSave[]> {
    try {
      if (!window.electronAPI) {
        throw new Error("Electron API not available");
      }
      const saves = await window.electronAPI.listGameSaves();
      return saves.map((save) => ({
        id: save.id,
        name: save.name,
        alias: save.alias,
        savePath: save.save_path,
        description: save.description,
        enabled: save.enabled,
        backupCount: save.backup_count,
        localBackupCount: save.local_backup_count,
        cloudBackupCount: save.cloud_backup_count,
        createdAt: new Date(save.created_at),
        updatedAt: new Date(save.updated_at),
        lastBackup: save.last_backup ? new Date(save.last_backup) : undefined,
        lastSync: save.last_sync ? new Date(save.last_sync) : undefined,
        webdavUrl: save.webdav_url,
        webdavUsername: save.webdav_username,
        webdavPassword: save.webdav_password,
        webdavRemotePath: save.webdav_remote_path,
      }));
    } catch (error) {
      console.error("Failed to list game saves:", error);
      return [];
    }
  }

  static async createGameSave(config: {
    name: string;
    alias?: string;
    savePath: string;
    description?: string;
    webdavUrl?: string;
    webdavUsername?: string;
    webdavPassword?: string;
    webdavRemotePath?: string;
  }): Promise<GameSave> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    const save = await window.electronAPI.createGameSave(config);
    return {
      id: save.id,
      name: save.name,
      alias: save.alias,
      savePath: save.save_path,
      description: save.description,
      enabled: save.enabled,
      backupCount: save.backup_count,
      localBackupCount: save.local_backup_count,
      cloudBackupCount: save.cloud_backup_count,
      createdAt: new Date(save.created_at),
      updatedAt: new Date(save.updated_at),
      lastBackup: save.last_backup ? new Date(save.last_backup) : undefined,
      lastSync: save.last_sync ? new Date(save.last_sync) : undefined,
      webdavUrl: save.webdav_url,
      webdavUsername: save.webdav_username,
      webdavPassword: save.webdav_password,
      webdavRemotePath: save.webdav_remote_path,
    };
  }

  static async updateGameSave(
    id: string,
    updates: Partial<GameSave>
  ): Promise<GameSave> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    const save = await window.electronAPI.updateGameSave(id, updates);
    return {
      id: save.id,
      name: save.name,
      alias: save.alias,
      savePath: save.save_path,
      description: save.description,
      enabled: save.enabled,
      backupCount: save.backup_count,
      localBackupCount: save.local_backup_count,
      cloudBackupCount: save.cloud_backup_count,
      createdAt: new Date(save.created_at),
      updatedAt: new Date(save.updated_at),
      lastBackup: save.last_backup ? new Date(save.last_backup) : undefined,
      lastSync: save.last_sync ? new Date(save.last_sync) : undefined,
      webdavUrl: save.webdav_url,
      webdavUsername: save.webdav_username,
      webdavPassword: save.webdav_password,
      webdavRemotePath: save.webdav_remote_path,
    };
  }

  static async deleteGameSave(id: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    await window.electronAPI.deleteGameSave(id);
  }

  static async createBackup(gameSaveId: string): Promise<Backup> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    const backup = await window.electronAPI.createBackup(gameSaveId);
    return {
      id: backup.id,
      gameSaveId: backup.game_save_id,
      name: backup.name,
      path: backup.path,
      size: backup.size,
      type: backup.backup_type as 'local' | 'cloud',
      createdAt: new Date(backup.created_at),
    };
  }

  static async listBackups(gameSaveId?: string): Promise<Backup[]> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    const backups = await window.electronAPI.listBackups(gameSaveId);
    return backups.map((backup) => ({
      id: backup.id,
      gameSaveId: backup.game_save_id,
      name: backup.name,
      path: backup.path,
      size: backup.size,
      type: backup.backup_type as 'local' | 'cloud',
      createdAt: new Date(backup.created_at),
    }));
  }

  static async restoreBackup(backupId: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    await window.electronAPI.restoreBackup(backupId);
  }

  static async deleteBackup(backupId: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    await window.electronAPI.deleteBackup(backupId);
  }
}
