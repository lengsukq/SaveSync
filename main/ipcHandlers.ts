import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createReadStream, createWriteStream } from 'fs';
import archiver from 'archiver';
import extractZip from 'extract-zip';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

interface SyncProject {
  id: string;
  name: string;
  alias?: string;
  sourcePath: string;
  description?: string;
  enabled: boolean;
  lastBackup?: Date;
  lastSync?: Date;
  backupCount: number;
  localBackupCount?: number;
  cloudBackupCount?: number;
  createdAt: Date;
  updatedAt: Date;
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
  webdavRemotePath?: string;
}

interface Backup {
  id: string;
  projectId: string;
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  type: 'local' | 'cloud';
}

interface SyncProjectConfig {
  name: string;
  alias?: string;
  sourcePath: string;
  description?: string;
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
  webdavRemotePath?: string;
}

interface AppSettings {
  backupDirectory: string;
  defaultMaxBackups: number;
  defaultBackupInterval: number;
  theme: 'light' | 'dark' | 'system';
  defaultWebdavUrl?: string;
  defaultWebdavUsername?: string;
  defaultWebdavPassword?: string;
  defaultWebdavRemotePath?: string;
}

function getDataDir(): string {
  const platform = process.platform;
  let baseDir: string;

  if (platform === 'win32') {
    baseDir = path.join(os.homedir(), 'AppData', 'Roaming');
  } else if (platform === 'darwin') {
    baseDir = path.join(os.homedir(), 'Library', 'Application Support');
  } else {
    baseDir = path.join(os.homedir(), '.local', 'share');
  }

  return path.join(baseDir, 'SaveSync');
}

function getBackupDir(): string {
  return path.join(getDataDir(), 'backups');
}

function getTempDir(): string {
  return path.join(getDataDir(), 'temp');
}

async function ensureDataDir(): Promise<void> {
  const dataDir = getDataDir();
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(getBackupDir(), { recursive: true });
  await fs.mkdir(getTempDir(), { recursive: true });
}

async function loadProjects(): Promise<SyncProject[]> {
  const dataFile = path.join(getDataDir(), 'projects.json');
  try {
    const content = await fs.readFile(dataFile, 'utf-8');
    const projects = JSON.parse(content);
    return projects.map((project: any) => ({
      ...project,
      sourcePath: project.sourcePath || project.savePath, // Migration: support old field name
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
      lastBackup: project.lastBackup ? new Date(project.lastBackup) : undefined,
      lastSync: project.lastSync ? new Date(project.lastSync) : undefined,
    }));
  } catch {
    return [];
  }
}

async function saveProjects(projects: SyncProject[]): Promise<void> {
  await ensureDataDir();
  const dataFile = path.join(getDataDir(), 'projects.json');
  await fs.writeFile(dataFile, JSON.stringify(projects, null, 2), 'utf-8');
}

async function loadBackups(): Promise<Backup[]> {
  const backupFile = path.join(getDataDir(), 'backups.json');
  try {
    const content = await fs.readFile(backupFile, 'utf-8');
    const backups = JSON.parse(content);
    return backups.map((backup: any) => ({
      ...backup,
      createdAt: new Date(backup.createdAt),
    }));
  } catch {
    return [];
  }
}

async function saveBackups(backups: Backup[]): Promise<void> {
  await ensureDataDir();
  const backupFile = path.join(getDataDir(), 'backups.json');
  await fs.writeFile(backupFile, JSON.stringify(backups, null, 2), 'utf-8');
}

async function loadSettings(): Promise<AppSettings> {
  const settingsFile = path.join(getDataDir(), 'settings.json');
  try {
    const content = await fs.readFile(settingsFile, 'utf-8');
    const settings = JSON.parse(content);
    return {
      backupDirectory: settings.backupDirectory || getBackupDir(),
      defaultMaxBackups: settings.defaultMaxBackups ?? 10,
      defaultBackupInterval: settings.defaultBackupInterval ?? 60,
      theme: settings.theme || 'system',
      defaultWebdavUrl: settings.defaultWebdavUrl,
      defaultWebdavUsername: settings.defaultWebdavUsername,
      defaultWebdavPassword: settings.defaultWebdavPassword,
      defaultWebdavRemotePath: settings.defaultWebdavRemotePath,
    };
  } catch {
    // 返回默认设置
    return {
      backupDirectory: getBackupDir(),
      defaultMaxBackups: 10,
      defaultBackupInterval: 60,
      theme: 'system',
    };
  }
}

async function saveSettings(settings: AppSettings): Promise<void> {
  await ensureDataDir();
  const settingsFile = path.join(getDataDir(), 'settings.json');
  await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
}

async function calculateDirSize(dirPath: string): Promise<number> {
  let size = 0;
  try {
    const stats = await fs.stat(dirPath);
    if (stats.isFile()) {
      return stats.size;
    }

    const entries = await fs.readdir(dirPath);
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry);
      size += await calculateDirSize(entryPath);
    }
  } catch {
    // Ignore errors
  }
  return size;
}

async function zipDirectory(sourcePath: string, zipPath: string): Promise<number> {
  return new Promise(async (resolve, reject) => {
    try {
      const output = createWriteStream(zipPath);
      const archive = (archiver as any)('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        fs.stat(zipPath)
          .then((stats) => resolve(stats.size))
          .catch(reject);
      });

      archive.on('error', reject);
      archive.pipe(output);

      const stats = await fs.stat(sourcePath);
      if (stats.isDirectory()) {
        archive.directory(sourcePath, false);
      } else {
        archive.file(sourcePath, { name: path.basename(sourcePath) });
      }

      archive.finalize();
    } catch (error) {
      reject(error);
    }
  });
}

async function unzipFile(zipPath: string, destDir: string): Promise<void> {
  await fs.mkdir(destDir, { recursive: true });
  await extractZip(zipPath, { dir: destDir });
}

async function uploadToWebDAV(
  filePath: string,
  url: string,
  username: string,
  password: string,
  remotePath: string
): Promise<void> {
  const fullUrl = url.endsWith('/') ? `${url}${remotePath}` : `${url}/${remotePath}`;
  const parsedUrl = new URL(fullUrl);
  const isHttps = parsedUrl.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  const fileContent = await fs.readFile(filePath);
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'PUT',
      headers: {
        'Content-Length': fileContent.length,
        'Authorization': `Basic ${auth}`,
      },
    };

    const req = httpModule.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`WebDAV upload failed: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.write(fileContent);
    req.end();
  });
}

async function createWebDAVDirectory(
  url: string,
  username: string,
  password: string,
  remotePath: string
): Promise<void> {
  // 确保路径以 / 开头
  const normalizedPath = remotePath.startsWith('/') ? remotePath : `/${remotePath}`;
  // 确保路径以 / 结尾（WebDAV 目录需要）
  const dirPath = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`;
  
  const fullUrl = url.endsWith('/') ? `${url}${dirPath}` : `${url}${dirPath}`;
  const parsedUrl = new URL(fullUrl);
  const isHttps = parsedUrl.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'MKCOL',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Length': '0',
      },
    };

    const req = httpModule.request(options, (res) => {
      // 201 Created 表示成功创建，409 Conflict 表示已存在（也算成功）
      if (res.statusCode === 201 || res.statusCode === 409) {
        resolve();
      } else if (res.statusCode === 404) {
        // 如果父目录不存在，尝试创建父目录
        const parentPath = dirPath.split('/').slice(0, -2).join('/') + '/';
        if (parentPath && parentPath !== '/') {
          createWebDAVDirectory(url, username, password, parentPath)
            .then(() => createWebDAVDirectory(url, username, password, dirPath))
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error(`WebDAV directory creation failed: ${res.statusCode}`));
        }
      } else {
        reject(new Error(`WebDAV directory creation failed: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.end();
  });
}

async function downloadFromWebDAV(
  url: string,
  username: string,
  password: string,
  remotePath: string,
  localPath: string
): Promise<void> {
  const fullUrl = url.endsWith('/') ? `${url}${remotePath}` : `${url}/${remotePath}`;
  const parsedUrl = new URL(fullUrl);
  const isHttps = parsedUrl.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    };

    const req = httpModule.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        const fileStream = createWriteStream(localPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
        fileStream.on('error', reject);
      } else {
        reject(new Error(`WebDAV download failed: ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.end();
  });
}

async function copyDirectory(source: string, dest: string): Promise<void> {
  const stats = await fs.stat(source);
  if (stats.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(source);
    for (const entry of entries) {
      const sourcePath = path.join(source, entry);
      const destPath = path.join(dest, entry);
      await copyDirectory(sourcePath, destPath);
    }
  } else {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(source, dest);
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

let mainWindow: BrowserWindow | null = null;

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window;
}

export function setupIpcHandlers(): void {
  ipcMain.handle('list-projects', async (): Promise<any[]> => {
    const projects = await loadProjects();
    const backups = await loadBackups();
    
    return projects.map((project) => {
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
        webdav_url: project.webdavUrl,
        webdav_username: project.webdavUsername,
        webdav_password: project.webdavPassword,
        webdav_remote_path: project.webdavRemotePath,
      };
    });
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
      webdavUrl: config.webdavUrl,
      webdavUsername: config.webdavUsername,
      webdavPassword: config.webdavPassword,
      webdavRemotePath: config.webdavRemotePath,
    };

    projects.push(project);
    await saveProjects(projects);

    return {
      id: project.id,
      name: project.name,
      alias: project.alias,
      source_path: project.sourcePath,
      description: project.description,
      enabled: project.enabled,
      backup_count: project.backupCount,
      local_backup_count: project.localBackupCount,
      cloud_backup_count: project.cloudBackupCount,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
      last_backup: project.lastBackup?.toISOString(),
      last_sync: project.lastSync?.toISOString(),
      webdav_url: project.webdavUrl,
      webdav_username: project.webdavUsername,
      webdav_password: project.webdavPassword,
      webdav_remote_path: project.webdavRemotePath,
    };
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
    if (updates.webdavUrl !== undefined) project.webdavUrl = updates.webdavUrl;
    if (updates.webdavUsername !== undefined) project.webdavUsername = updates.webdavUsername;
    if (updates.webdavPassword !== undefined) project.webdavPassword = updates.webdavPassword;
    if (updates.webdavRemotePath !== undefined) project.webdavRemotePath = updates.webdavRemotePath;

    project.updatedAt = new Date();
    await saveProjects(projects);

    const backups = await loadBackups();
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
      webdav_url: project.webdavUrl,
      webdav_username: project.webdavUsername,
      webdav_password: project.webdavPassword,
      webdav_remote_path: project.webdavRemotePath,
    };
  });

  ipcMain.handle('delete-project', async (_event, id: string): Promise<void> => {
    const projects = await loadProjects();
    const filtered = projects.filter((p) => p.id !== id);
    await saveProjects(filtered);
  });

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
        await createWebDAVDirectory(
          project.webdavUrl!,
          project.webdavUsername!,
          project.webdavPassword!,
          remoteDir
        );
      } catch (error) {
        console.warn(`Failed to create WebDAV directory, continuing anyway: ${error}`);
      }
      
      // 上传文件到远程目录
      const remotePath = `${remoteDir}${backupName}`;
      try {
        await uploadToWebDAV(
          zipPath,
          project.webdavUrl!,
          project.webdavUsername!,
          project.webdavPassword!,
          remotePath
        );
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
      if (!project || !project.webdavUrl || !project.webdavUsername || !project.webdavPassword) {
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
      await downloadFromWebDAV(
        project.webdavUrl!,
        project.webdavUsername!,
        project.webdavPassword!,
        remotePath,
        tempZip
      );
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
      if (project?.webdavUrl && project?.webdavUsername && project?.webdavPassword) {
        // 构建远程路径：如果指定了远程路径，使用它；否则使用项目ID作为目录
        let remoteDir = project.webdavRemotePath || project.id;
        if (!remoteDir.startsWith('/')) {
          remoteDir = `/${remoteDir}`;
        }
        if (!remoteDir.endsWith('/')) {
          remoteDir = `${remoteDir}/`;
        }
        const remotePath = `${remoteDir}${backup.name}`;
        const fullUrl = project.webdavUrl.endsWith('/')
          ? `${project.webdavUrl}${remotePath}`
          : `${project.webdavUrl}/${remotePath}`;
        const parsedUrl = new URL(fullUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        const auth = Buffer.from(`${project.webdavUsername}:${project.webdavPassword}`).toString('base64');

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${auth}`,
          },
        };

        httpModule.request(options).end();
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
}
