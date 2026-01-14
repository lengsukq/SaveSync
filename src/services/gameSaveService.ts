import { invoke } from "@tauri-apps/api/core";
import { GameSave, Backup } from "../types";

export class GameSaveService {
  static async listGameSaves(): Promise<GameSave[]> {
    try {
      const saves = await invoke<any[]>("list_game_saves");
      return saves.map((save) => ({
        id: save.id,
        name: save.name,
        savePath: save.save_path,
        description: save.description,
        enabled: save.enabled,
        backupCount: save.backup_count,
        createdAt: new Date(save.created_at),
        updatedAt: new Date(save.updated_at),
        lastBackup: save.last_backup ? new Date(save.last_backup) : undefined,
        lastSync: save.last_sync ? new Date(save.last_sync) : undefined,
        webdavUrl: save.webdav_url,
        webdavUsername: save.webdav_username,
        webdavPassword: save.webdav_password,
      }));
    } catch (error) {
      console.error("Failed to list game saves:", error);
      return [];
    }
  }

  static async createGameSave(config: {
    name: string;
    savePath: string;
    description?: string;
    webdavUrl?: string;
    webdavUsername?: string;
    webdavPassword?: string;
  }): Promise<GameSave> {
    const save = await invoke<any>("create_game_save", { config });
    return {
      id: save.id,
      name: save.name,
      savePath: save.save_path,
      description: save.description,
      enabled: save.enabled,
      backupCount: save.backup_count,
      createdAt: new Date(save.created_at),
      updatedAt: new Date(save.updated_at),
      lastBackup: save.last_backup ? new Date(save.last_backup) : undefined,
      lastSync: save.last_sync ? new Date(save.last_sync) : undefined,
      webdavUrl: save.webdav_url,
      webdavUsername: save.webdav_username,
      webdavPassword: save.webdav_password,
    };
  }

  static async updateGameSave(
    id: string,
    updates: Partial<GameSave>
  ): Promise<GameSave> {
    const save = await invoke<any>("update_game_save", { id, updates });
    return {
      id: save.id,
      name: save.name,
      savePath: save.save_path,
      description: save.description,
      enabled: save.enabled,
      backupCount: save.backup_count,
      createdAt: new Date(save.created_at),
      updatedAt: new Date(save.updated_at),
      lastBackup: save.last_backup ? new Date(save.last_backup) : undefined,
      lastSync: save.last_sync ? new Date(save.last_sync) : undefined,
      webdavUrl: save.webdav_url,
      webdavUsername: save.webdav_username,
      webdavPassword: save.webdav_password,
    };
  }

  static async deleteGameSave(id: string): Promise<void> {
    await invoke("delete_game_save", { id });
  }

  static async createBackup(gameSaveId: string): Promise<Backup> {
    const backup = await invoke<any>("create_backup", { gameSaveId });
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
    const backups = await invoke<any[]>("list_backups", { gameSaveId });
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
    await invoke("restore_backup", { backupId });
  }

  static async deleteBackup(backupId: string): Promise<void> {
    await invoke("delete_backup", { backupId });
  }
}
