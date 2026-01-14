import { SyncProject, Backup } from "../types";
import "../types/electron.d";

export class SyncProjectService {
  static async listProjects(): Promise<SyncProject[]> {
    try {
      if (!window.electronAPI) {
        throw new Error("Electron API not available");
      }
      const projects = await window.electronAPI.listProjects();
      return projects.map((project) => ({
        id: project.id,
        name: project.name,
        alias: project.alias,
        sourcePath: project.source_path,
        description: project.description,
        enabled: project.enabled,
        backupCount: project.backup_count,
        localBackupCount: project.local_backup_count,
        cloudBackupCount: project.cloud_backup_count,
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
        lastBackup: project.last_backup ? new Date(project.last_backup) : undefined,
        lastSync: project.last_sync ? new Date(project.last_sync) : undefined,
        webdavUrl: project.webdav_url,
        webdavUsername: project.webdav_username,
        webdavPassword: project.webdav_password,
        webdavRemotePath: project.webdav_remote_path,
      }));
    } catch (error) {
      console.error("Failed to list projects:", error);
      return [];
    }
  }

  static async createProject(config: {
    name: string;
    alias?: string;
    sourcePath: string;
    description?: string;
    webdavUrl?: string;
    webdavUsername?: string;
    webdavPassword?: string;
    webdavRemotePath?: string;
  }): Promise<SyncProject> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    const project = await window.electronAPI.createProject(config);
    return {
      id: project.id,
      name: project.name,
      alias: project.alias,
      sourcePath: project.source_path,
      description: project.description,
      enabled: project.enabled,
      backupCount: project.backup_count,
      localBackupCount: project.local_backup_count,
      cloudBackupCount: project.cloud_backup_count,
      createdAt: new Date(project.created_at),
      updatedAt: new Date(project.updated_at),
      lastBackup: project.last_backup ? new Date(project.last_backup) : undefined,
      lastSync: project.last_sync ? new Date(project.last_sync) : undefined,
      webdavUrl: project.webdav_url,
      webdavUsername: project.webdav_username,
      webdavPassword: project.webdav_password,
      webdavRemotePath: project.webdav_remote_path,
    };
  }

  static async updateProject(
    id: string,
    updates: Partial<SyncProject>
  ): Promise<SyncProject> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    const project = await window.electronAPI.updateProject(id, updates);
    return {
      id: project.id,
      name: project.name,
      alias: project.alias,
      sourcePath: project.source_path,
      description: project.description,
      enabled: project.enabled,
      backupCount: project.backup_count,
      localBackupCount: project.local_backup_count,
      cloudBackupCount: project.cloud_backup_count,
      createdAt: new Date(project.created_at),
      updatedAt: new Date(project.updated_at),
      lastBackup: project.last_backup ? new Date(project.last_backup) : undefined,
      lastSync: project.last_sync ? new Date(project.last_sync) : undefined,
      webdavUrl: project.webdav_url,
      webdavUsername: project.webdav_username,
      webdavPassword: project.webdav_password,
      webdavRemotePath: project.webdav_remote_path,
    };
  }

  static async deleteProject(id: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    await window.electronAPI.deleteProject(id);
  }

  static async createBackup(projectId: string): Promise<Backup> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    const backup = await window.electronAPI.createBackup(projectId);
    return {
      id: backup.id,
      projectId: backup.project_id,
      name: backup.name,
      path: backup.path,
      size: backup.size,
      type: backup.backup_type as 'local' | 'cloud',
      createdAt: new Date(backup.created_at),
    };
  }

  static async listBackups(projectId?: string): Promise<Backup[]> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    const backups = await window.electronAPI.listBackups(projectId);
    return backups.map((backup) => ({
      id: backup.id,
      projectId: backup.project_id,
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

  static async showOpenDialog(options: {
    properties?: ('openFile' | 'openDirectory')[];
    title?: string;
  }): Promise<{ canceled: boolean; filePaths?: string[] }> {
    if (!window.electronAPI) {
      throw new Error("Electron API not available");
    }
    return await window.electronAPI.showOpenDialog(options);
  }
}
