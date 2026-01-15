import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { SyncProject, Backup, SyncProjectConfig, AppSettings } from './types.js';
import {
  loadProjects,
  saveProjects,
  loadBackups,
  saveBackups,
  loadSettings,
  saveSettings,
  getBackupDir,
  getTempDir,
  ensureDataDir,
} from './dataStorage.js';
import {
  zipDirectory,
  unzipFile,
  copyDirectory,
  generateId,
} from './fileUtils.js';
import {
  uploadToWebDAV,
  downloadFromWebDAV,
  createWebDAVDirectory,
  testWebDAVConnection,
  listWebDAVDirectory,
} from './webdav.js';

let mainWindow: BrowserWindow | null = null;

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window;
}

function mapProjectToResponse(project: SyncProject, backups: Backup[]) {
  const projectBackups = backups.filter((b) => b.projectId === project.id);
  const localBackups = projectBackups.filter((b) => b.type === 'local');
  const cloudBackups = projectBackups.filter((b) => b.type === 'cloud');

  return {
    id: project.id,
    name: project.name,
    alias: project.alias,
    source_path: project.sourcePath,
    description: project.description,
    enabled: project.enabled,
    backup_count: project.backupCount,
    local_backup_count: localBackups.length,
    cloud_backup_count: cloudBackups.length,
    created_at: project.createdAt.toISOString(),
    updated_at: project.updatedAt.toISOString(),
    last_backup: project.lastBackup?.toISOString(),
    last_sync: project.lastSync?.toISOString(),
    webdav_source_id: project.webdavSourceId,
    webdav_url: project.webdavUrl,
    webdav_username: project.webdavUsername,
    webdav_password: project.webdavPassword,
    webdav_remote_path: project.webdavRemotePath,
  };
}

export function setupIpcHandlers(): void {
  // Project handlers
  ipcMain.handle('list-projects', async (): Promise<any[]> => {
    const projects = await loadProjects();
    const backups = await loadBackups();
    return projects.map((project) => mapProjectToResponse(project, backups));
  });

  ipcMain.handle('create-project', async (_event, config: SyncProjectConfig): Promise<any> => {
    const projects = await loadProjects();
    const now = new Date();
    const project: SyncProject = {
      id: generateId(),
      name: config.name,
      alias: config.alias,
      sourcePath: config.sourcePath,
      description: config.description,
      enabled: true,
      lastBackup: undefined,
      lastSync: undefined,
      backupCount: 0,
      localBackupCount: 0,
      cloudBackupCount: 0,
      createdAt: now,
      updatedAt: now,
      webdavSourceId: config.webdavSourceId,
      webdavUrl: config.webdavUrl,
      webdavUsername: config.webdavUsername,
      webdavPassword: config.webdavPassword,
      webdavRemotePath: config.webdavRemotePath,
    };

    projects.push(project);
    await saveProjects(projects);

    const backups = await loadBackups();
    return mapProjectToResponse(project, backups);
  });

  ipcMain.handle('update-project', async (_event, id: string, updates: any): Promise<any> => {
    const projects = await loadProjects();
    const project = projects.find((p) => p.id === id);
    if (!project) {
      throw new Error('Project not found');
    }

    if (updates.name !== undefined) project.name = updates.name;
    if (updates.alias !== undefined) project.alias = updates.alias;
    if (updates.sourcePath !== undefined) project.sourcePath = updates.sourcePath;
    if (updates.description !== undefined) project.description = updates.description;
    if (updates.enabled !== undefined) project.enabled = updates.enabled;
    if (updates.webdavSourceId !== undefined) project.webdavSourceId = updates.webdavSourceId;
    if (updates.webdavUrl !== undefined) project.webdavUrl = updates.webdavUrl;
    if (updates.webdavUsername !== undefined) project.webdavUsername = updates.webdavUsername;
    if (updates.webdavPassword !== undefined) project.webdavPassword = updates.webdavPassword;
    if (updates.webdavRemotePath !== undefined) project.webdavRemotePath = updates.webdavRemotePath;

    project.updatedAt = new Date();
    await saveProjects(projects);

    const backups = await loadBackups();
    return mapProjectToResponse(project, backups);
  });

  ipcMain.handle('delete-project', async (_event, id: string): Promise<void> => {
    const projects = await loadProjects();
    const filtered = projects.filter((p) => p.id !== id);
    await saveProjects(filtered);
  });

  // Backup handlers
  ipcMain.handle('create-backup', async (_event, projectId: string): Promise<any> => {
    const projects = await loadProjects();
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const sourcePath = project.sourcePath;
    try {
      await fs.access(sourcePath);
    } catch {
      throw new Error('Save path does not exist');
    }

    await ensureDataDir();

    const backupId = generateId();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupName = `${project.name.replace(/\s/g, '_')}_${timestamp}.zip`;
    const zipPath = path.join(getBackupDir(), backupName);

    const size = await zipDirectory(sourcePath, zipPath);
    const backupType: 'local' | 'cloud' = project.webdavUrl ? 'cloud' : 'local';

    const backup: Backup = {
      id: backupId,
      projectId,
      name: backupName,
      path: zipPath,
      size,
      createdAt: new Date(),
      type: backupType,
    };

    // Upload to WebDAV if configured
    if (backupType === 'cloud' && project.webdavUrl && project.webdavUsername && project.webdavPassword) {
      // 获取 WebDAV 凭据（优先使用 webdavSourceId）
      let webdavUrl = project.webdavUrl;
      let webdavUsername = project.webdavUsername;
      let webdavPassword = project.webdavPassword;

      if (project.webdavSourceId) {
        const settings = await loadSettings();
        const webdavSource = settings.webdavSources.find(s => s.id === project.webdavSourceId);
        if (webdavSource) {
          webdavUrl = webdavSource.url;
          webdavUsername = webdavSource.username;
          webdavPassword = webdavSource.password;
        }
      }

      // 构建远程路径：如果指定了远程路径，使用它；否则使用项目ID作为目录
      let remoteDir = project.webdavRemotePath || project.id;
      // 确保路径格式正确
      if (!remoteDir.startsWith('/')) {
        remoteDir = `/${remoteDir}`;
      }
      if (!remoteDir.endsWith('/')) {
        remoteDir = `${remoteDir}/`;
      }
      
      // 创建远程目录（如果不存在）
      try {
        await createWebDAVDirectory(webdavUrl, webdavUsername, webdavPassword, remoteDir);
      } catch (error) {
        console.warn(`Failed to create WebDAV directory, continuing anyway: ${error}`);
      }
      
      // 上传文件到远程目录
      const remotePath = `${remoteDir}${backupName}`;
      try {
        await uploadToWebDAV(zipPath, webdavUrl, webdavUsername, webdavPassword, remotePath);
        project.lastSync = new Date();
      } catch (error) {
        throw new Error(`WebDAV upload failed: ${error}`);
      }
    }

    const backups = await loadBackups();
    backups.push(backup);
    await saveBackups(backups);

    project.lastBackup = new Date();
    project.backupCount += 1;
    await saveProjects(projects);

    return {
      id: backup.id,
      project_id: backup.projectId,
      name: backup.name,
      path: backup.path,
      size: backup.size,
      backup_type: backup.type,
      created_at: backup.createdAt.toISOString(),
    };
  });

  ipcMain.handle('list-backups', async (_event, projectId?: string): Promise<any[]> => {
    const backups = await loadBackups();
    const filtered = projectId
      ? backups.filter((b) => b.projectId === projectId)
      : backups;
    return filtered.map((backup) => ({
      id: backup.id,
      project_id: backup.projectId,
      name: backup.name,
      path: backup.path,
      size: backup.size,
      backup_type: backup.type,
      created_at: backup.createdAt.toISOString(),
    }));
  });

  ipcMain.handle('restore-backup', async (_event, backupId: string): Promise<void> => {
    const backups = await loadBackups();
    const backup = backups.find((b) => b.id === backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }

    const projects = await loadProjects();
    const project = projects.find((p) => p.id === backup.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    await ensureDataDir();

    let zipPath = backup.path;

    // Download from WebDAV if it's a cloud backup
    if (backup.type === 'cloud') {
      // 获取 WebDAV 凭据（优先使用 webdavSourceId）
      let webdavUrl = project.webdavUrl;
      let webdavUsername = project.webdavUsername;
      let webdavPassword = project.webdavPassword;

      if (project.webdavSourceId) {
        const settings = await loadSettings();
        const webdavSource = settings.webdavSources.find(s => s.id === project.webdavSourceId);
        if (webdavSource) {
          webdavUrl = webdavSource.url;
          webdavUsername = webdavSource.username;
          webdavPassword = webdavSource.password;
        }
      }

      if (!webdavUrl || !webdavUsername || !webdavPassword) {
        throw new Error('WebDAV credentials not configured');
      }

      const tempZip = path.join(getTempDir(), backup.name);
      // 构建远程路径：如果指定了远程路径，使用它；否则使用项目ID作为目录
      let remoteDir = project.webdavRemotePath || project.id;
      if (!remoteDir.startsWith('/')) {
        remoteDir = `/${remoteDir}`;
      }
      if (!remoteDir.endsWith('/')) {
        remoteDir = `${remoteDir}/`;
      }
      const remotePath = `${remoteDir}${backup.name}`;
      await downloadFromWebDAV(webdavUrl, webdavUsername, webdavPassword, remotePath, tempZip);
      zipPath = tempZip;
    }

    try {
      await fs.access(zipPath);
    } catch {
      throw new Error('Backup file not found');
    }

    const tempExtractDir = path.join(getTempDir(), `extract_${generateId()}`);
    await unzipFile(zipPath, tempExtractDir);

    // Backup current save if it exists
    const sourcePath = project.sourcePath;
    if (await fs.access(sourcePath).then(() => true).catch(() => false)) {
      const currentBackupPath = path.join(getTempDir(), `current_backup_${generateId()}`);
      await copyDirectory(sourcePath, currentBackupPath);
    }

    // Remove existing save directory
    try {
      const stats = await fs.stat(sourcePath);
      if (stats.isDirectory()) {
        await fs.rm(sourcePath, { recursive: true });
      } else {
        await fs.unlink(sourcePath);
      }
    } catch {
      // Ignore if doesn't exist
    }

    // Copy extracted files to save path
    const entries = await fs.readdir(tempExtractDir);
    if (entries.length === 1) {
      const entryPath = path.join(tempExtractDir, entries[0]);
      const stats = await fs.stat(entryPath);
      if (stats.isDirectory()) {
        await copyDirectory(entryPath, sourcePath);
      } else {
        await fs.mkdir(path.dirname(sourcePath), { recursive: true });
        await fs.copyFile(entryPath, sourcePath);
      }
    } else {
      await copyDirectory(tempExtractDir, sourcePath);
    }

    // Clean up temporary files
    await fs.rm(tempExtractDir, { recursive: true }).catch(() => {});
    if (backup.type === 'cloud') {
      await fs.unlink(zipPath).catch(() => {});
    }

    project.updatedAt = new Date();
    await saveProjects(projects);
  });

  ipcMain.handle('delete-backup', async (_event, backupId: string): Promise<void> => {
    const backups = await loadBackups();
    const backup = backups.find((b) => b.id === backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }

    // Delete local backup file
    try {
      await fs.unlink(backup.path);
    } catch {
      // Ignore if doesn't exist
    }

    // Delete from WebDAV if it's a cloud backup
    if (backup.type === 'cloud') {
      const projects = await loadProjects();
      const project = projects.find((p) => p.id === backup.projectId);
      if (project) {
        // 获取 WebDAV 凭据（优先使用 webdavSourceId）
        let webdavUrl = project.webdavUrl;
        let webdavUsername = project.webdavUsername;
        let webdavPassword = project.webdavPassword;

        if (project.webdavSourceId) {
          const settings = await loadSettings();
          const webdavSource = settings.webdavSources.find(s => s.id === project.webdavSourceId);
          if (webdavSource) {
            webdavUrl = webdavSource.url;
            webdavUsername = webdavSource.username;
            webdavPassword = webdavSource.password;
          }
        }

        if (webdavUrl && webdavUsername && webdavPassword) {
          // 构建远程路径：如果指定了远程路径，使用它；否则使用项目ID作为目录
          let remoteDir = project.webdavRemotePath || project.id;
          if (!remoteDir.startsWith('/')) {
            remoteDir = `/${remoteDir}`;
          }
          if (!remoteDir.endsWith('/')) {
            remoteDir = `${remoteDir}/`;
          }
          const remotePath = `${remoteDir}${backup.name}`;
          const fullUrl = webdavUrl.endsWith('/')
            ? `${webdavUrl}${remotePath}`
            : `${webdavUrl}/${remotePath}`;
          const parsedUrl = new URL(fullUrl);
          const isHttps = parsedUrl.protocol === 'https:';
          const httpModule = isHttps ? https : http;
          const auth = Buffer.from(`${webdavUsername}:${webdavPassword}`).toString('base64');

          const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'DELETE',
            headers: {
              'Authorization': `Basic ${auth}`,
            },
          };

          (httpModule as typeof http).request(options).end();
        }
      }
    }

    // Update project backup count
    const projects = await loadProjects();
    const project = projects.find((p) => p.id === backup.projectId);
    if (project) {
      project.backupCount = Math.max(0, project.backupCount - 1);
      await saveProjects(projects);
    }

    const filtered = backups.filter((b) => b.id !== backupId);
    await saveBackups(filtered);
  });

  // Settings handlers
  ipcMain.handle('get-settings', async (): Promise<any> => {
    const settings = await loadSettings();
    return {
      backup_directory: settings.backupDirectory,
      default_max_backups: settings.defaultMaxBackups,
      default_backup_interval: settings.defaultBackupInterval,
      theme: settings.theme,
      webdav_sources: settings.webdavSources,
    };
  });

  ipcMain.handle('update-settings', async (_event, updates: any): Promise<any> => {
    const currentSettings = await loadSettings();
    const newSettings: AppSettings = {
      backupDirectory: updates.backup_directory !== undefined ? updates.backup_directory : currentSettings.backupDirectory,
      defaultMaxBackups: updates.default_max_backups !== undefined ? updates.default_max_backups : currentSettings.defaultMaxBackups,
      defaultBackupInterval: updates.default_backup_interval !== undefined ? updates.default_backup_interval : currentSettings.defaultBackupInterval,
      theme: updates.theme !== undefined ? updates.theme : currentSettings.theme,
      webdavSources: updates.webdav_sources !== undefined ? updates.webdav_sources : currentSettings.webdavSources,
    };
    await saveSettings(newSettings);
    return {
      backup_directory: newSettings.backupDirectory,
      default_max_backups: newSettings.defaultMaxBackups,
      default_backup_interval: newSettings.defaultBackupInterval,
      theme: newSettings.theme,
      webdav_sources: newSettings.webdavSources,
    };
  });

  // File dialog handler
  ipcMain.handle('show-open-dialog', async (_event, options: any) => {
    if (!mainWindow) {
      return { canceled: true, filePaths: [] };
    }
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: options.properties || ['openFile', 'openDirectory'],
      title: options.title || '选择文件或目录',
    });
    return result;
  });

  // WebDAV handlers
  ipcMain.handle('test-webdav-connection', async (_event, url: string, username: string, password: string): Promise<{ success: boolean; message: string }> => {
    return await testWebDAVConnection(url, username, password);
  });

  ipcMain.handle('list-webdav-directory', async (_event, url: string, username: string, password: string, remotePath?: string): Promise<any[]> => {
    const items = await listWebDAVDirectory(url, username, password, remotePath);
    return items.map(item => ({
      path: item.path,
      name: item.name,
      is_directory: item.isDirectory,
    }));
  });
}
