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
  calculateDirSize,
} from './fileUtils.js';
import {
  uploadToWebDAV,
  uploadDirectoryToWebDAV,
  downloadFromWebDAV,
  downloadDirectoryFromWebDAV,
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
    compress: project.compress !== false, // 默认为 true
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
      compress: config.compress !== false, // 默认为 true
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
    if (updates.compress !== undefined) project.compress = updates.compress;

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
    
    // 根据 compress 选项决定是否压缩（默认为 true 以保持向后兼容）
    const compress = project.compress !== false;
    
    let backupName: string;
    let backupPath: string;
    let backupSize: number;
    let isCompressed: boolean;

    if (compress) {
      // 压缩模式：压缩文件夹为 ZIP
      backupName = `${project.name.replace(/\s/g, '_')}_${timestamp}.zip`;
      backupPath = path.join(getBackupDir(), backupName);
      backupSize = await zipDirectory(sourcePath, backupPath);
      isCompressed = true;
    } else {
      // 非压缩模式：直接复制文件夹
      backupName = `${project.name.replace(/\s/g, '_')}_${timestamp}`;
      backupPath = path.join(getBackupDir(), backupName);
      await copyDirectory(sourcePath, backupPath);
      backupSize = await calculateDirSize(backupPath);
      isCompressed = false;
    }

    const backupType: 'local' | 'cloud' = project.webdavUrl ? 'cloud' : 'local';

    const backup: Backup = {
      id: backupId,
      projectId,
      name: backupName,
      path: backupPath,
      size: backupSize,
      createdAt: new Date(),
      type: backupType,
      isCompressed,
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
      // 规范化路径：移除多余的斜杠
      remoteDir = remoteDir.replace(/\/+/g, '/');
      // 确保路径格式正确
      if (!remoteDir.startsWith('/')) {
        remoteDir = `/${remoteDir}`;
      }
      if (!remoteDir.endsWith('/')) {
        remoteDir = `${remoteDir}/`;
      }
      
      // 创建远程目录（如果不存在）
      // 某些WebDAV服务器可能不支持MKCOL，或者目录已存在，所以这里允许失败
      try {
        await createWebDAVDirectory(webdavUrl, webdavUsername, webdavPassword, remoteDir);
      } catch (error: any) {
        // 如果错误是405（Method Not Allowed），可能服务器不支持MKCOL，尝试继续
        // 如果错误是403（Forbidden），可能是权限问题，但继续尝试上传，让上传操作返回更具体的错误
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes('405') || errorMessage.includes('Method Not Allowed')) {
          console.warn(`WebDAV server may not support MKCOL method, continuing with upload: ${errorMessage}`);
        } else {
          console.warn(`Failed to create WebDAV directory, continuing anyway: ${errorMessage}`);
        }
      }
      
      // 上传到远程目录
      try {
        if (compress) {
          // 压缩模式：上传单个 ZIP 文件
          const remotePath = `${remoteDir}${backupName}`;
          await uploadToWebDAV(backupPath, webdavUrl, webdavUsername, webdavPassword, remotePath);
        } else {
          // 非压缩模式：递归上传整个文件夹
          await uploadDirectoryToWebDAV(backupPath, webdavUrl, webdavUsername, webdavPassword, remoteDir);
        }
        project.lastSync = new Date();
      } catch (error: any) {
        // 如果错误消息已经包含 "WebDAV upload failed"，直接抛出原错误
        // 否则包装错误消息
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes('WebDAV upload failed')) {
          throw error;
        } else {
          throw new Error(`WebDAV upload failed: ${errorMessage}`);
        }
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

    // 判断是否压缩（默认为 true 以保持向后兼容）
    const isCompressed = backup.isCompressed !== false;

    let backupSourcePath: string;

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

      // 构建远程路径：如果指定了远程路径，使用它；否则使用项目ID作为目录
      let remoteDir = project.webdavRemotePath || project.id;
      if (!remoteDir.startsWith('/')) {
        remoteDir = `/${remoteDir}`;
      }
      if (!remoteDir.endsWith('/')) {
        remoteDir = `${remoteDir}/`;
      }

      if (isCompressed) {
        // 压缩模式：下载单个 ZIP 文件
        const tempZip = path.join(getTempDir(), backup.name);
        const remotePath = `${remoteDir}${backup.name}`;
        await downloadFromWebDAV(webdavUrl, webdavUsername, webdavPassword, remotePath, tempZip);
        backupSourcePath = tempZip;
      } else {
        // 非压缩模式：下载整个文件夹
        const tempDir = path.join(getTempDir(), `restore_${generateId()}`);
        const remoteFolderPath = `${remoteDir}${backup.name}/`;
        await downloadDirectoryFromWebDAV(webdavUrl, webdavUsername, webdavPassword, remoteFolderPath, tempDir);
        backupSourcePath = tempDir;
      }
    } else {
      // 本地备份：直接使用备份路径
      backupSourcePath = backup.path;
    }

    try {
      await fs.access(backupSourcePath);
    } catch {
      throw new Error('Backup file or directory not found');
    }

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

    // 根据备份格式恢复
    if (isCompressed) {
      // 压缩模式：解压后复制
      const tempExtractDir = path.join(getTempDir(), `extract_${generateId()}`);
      await unzipFile(backupSourcePath, tempExtractDir);

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
    } else {
      // 非压缩模式：直接复制
      await copyDirectory(backupSourcePath, sourcePath);
    }

    // Clean up temporary files
    if (backup.type === 'cloud') {
      await fs.rm(backupSourcePath, { recursive: true }).catch(() => {});
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
