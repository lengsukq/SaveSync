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

interface GameSave {
  id: string;
  name: string;
  alias?: string;
  savePath: string;
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
  gameSaveId: string;
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  type: 'local' | 'cloud';
}

interface GameSaveConfig {
  name: string;
  alias?: string;
  savePath: string;
  description?: string;
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
  webdavRemotePath?: string;
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

async function loadGameSaves(): Promise<GameSave[]> {
  const dataFile = path.join(getDataDir(), 'game_saves.json');
  try {
    const content = await fs.readFile(dataFile, 'utf-8');
    const saves = JSON.parse(content);
    return saves.map((save: any) => ({
      ...save,
      createdAt: new Date(save.createdAt),
      updatedAt: new Date(save.updatedAt),
      lastBackup: save.lastBackup ? new Date(save.lastBackup) : undefined,
      lastSync: save.lastSync ? new Date(save.lastSync) : undefined,
    }));
  } catch {
    return [];
  }
}

async function saveGameSaves(saves: GameSave[]): Promise<void> {
  await ensureDataDir();
  const dataFile = path.join(getDataDir(), 'game_saves.json');
  await fs.writeFile(dataFile, JSON.stringify(saves, null, 2), 'utf-8');
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
      const archive = archiver('zip', { zlib: { level: 9 } });

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
  ipcMain.handle('list-game-saves', async (): Promise<any[]> => {
    const saves = await loadGameSaves();
    const backups = await loadBackups();
    
    return saves.map((save) => {
      const saveBackups = backups.filter((b) => b.gameSaveId === save.id);
      const localBackups = saveBackups.filter((b) => b.type === 'local');
      const cloudBackups = saveBackups.filter((b) => b.type === 'cloud');
      
      return {
        id: save.id,
        name: save.name,
        alias: save.alias,
        save_path: save.savePath,
        description: save.description,
        enabled: save.enabled,
        backup_count: save.backupCount,
        local_backup_count: localBackups.length,
        cloud_backup_count: cloudBackups.length,
        created_at: save.createdAt.toISOString(),
        updated_at: save.updatedAt.toISOString(),
        last_backup: save.lastBackup?.toISOString(),
        last_sync: save.lastSync?.toISOString(),
        webdav_url: save.webdavUrl,
        webdav_username: save.webdavUsername,
        webdav_password: save.webdavPassword,
        webdav_remote_path: save.webdavRemotePath,
      };
    });
  });

  ipcMain.handle('create-game-save', async (_event, config: GameSaveConfig): Promise<any> => {
    const saves = await loadGameSaves();
    const now = new Date();
    const gameSave: GameSave = {
      id: generateId(),
      name: config.name,
      alias: config.alias,
      savePath: config.savePath,
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

    saves.push(gameSave);
    await saveGameSaves(saves);

    return {
      id: gameSave.id,
      name: gameSave.name,
      alias: gameSave.alias,
      save_path: gameSave.savePath,
      description: gameSave.description,
      enabled: gameSave.enabled,
      backup_count: gameSave.backupCount,
      local_backup_count: gameSave.localBackupCount,
      cloud_backup_count: gameSave.cloudBackupCount,
      created_at: gameSave.createdAt.toISOString(),
      updated_at: gameSave.updatedAt.toISOString(),
      last_backup: gameSave.lastBackup?.toISOString(),
      last_sync: gameSave.lastSync?.toISOString(),
      webdav_url: gameSave.webdavUrl,
      webdav_username: gameSave.webdavUsername,
      webdav_password: gameSave.webdavPassword,
      webdav_remote_path: gameSave.webdavRemotePath,
    };
  });

  ipcMain.handle('update-game-save', async (_event, id: string, updates: any): Promise<any> => {
    const saves = await loadGameSaves();
    const save = saves.find((s) => s.id === id);
    if (!save) {
      throw new Error('Game save not found');
    }

    if (updates.name !== undefined) save.name = updates.name;
    if (updates.alias !== undefined) save.alias = updates.alias;
    if (updates.savePath !== undefined) save.savePath = updates.savePath;
    if (updates.description !== undefined) save.description = updates.description;
    if (updates.enabled !== undefined) save.enabled = updates.enabled;
    if (updates.webdavUrl !== undefined) save.webdavUrl = updates.webdavUrl;
    if (updates.webdavUsername !== undefined) save.webdavUsername = updates.webdavUsername;
    if (updates.webdavPassword !== undefined) save.webdavPassword = updates.webdavPassword;

    save.updatedAt = new Date();
    await saveGameSaves(saves);

    const backups = await loadBackups();
    const saveBackups = backups.filter((b) => b.gameSaveId === save.id);
    const localBackups = saveBackups.filter((b) => b.type === 'local');
    const cloudBackups = saveBackups.filter((b) => b.type === 'cloud');

    return {
      id: save.id,
      name: save.name,
      alias: save.alias,
      save_path: save.savePath,
      description: save.description,
      enabled: save.enabled,
      backup_count: save.backupCount,
      local_backup_count: localBackups.length,
      cloud_backup_count: cloudBackups.length,
      created_at: save.createdAt.toISOString(),
      updated_at: save.updatedAt.toISOString(),
      last_backup: save.lastBackup?.toISOString(),
      last_sync: save.lastSync?.toISOString(),
      webdav_url: save.webdavUrl,
      webdav_username: save.webdavUsername,
      webdav_password: save.webdavPassword,
      webdav_remote_path: save.webdavRemotePath,
    };
  });

  ipcMain.handle('delete-game-save', async (_event, id: string): Promise<void> => {
    const saves = await loadGameSaves();
    const filtered = saves.filter((s) => s.id !== id);
    await saveGameSaves(filtered);
  });

  ipcMain.handle('create-backup', async (_event, gameSaveId: string): Promise<any> => {
    const saves = await loadGameSaves();
    const save = saves.find((s) => s.id === gameSaveId);
    if (!save) {
      throw new Error('Game save not found');
    }

    const sourcePath = save.savePath;
    try {
      await fs.access(sourcePath);
    } catch {
      throw new Error('Save path does not exist');
    }

    await ensureDataDir();

    const backupId = generateId();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupName = `${save.name.replace(/\s/g, '_')}_${timestamp}.zip`;
    const zipPath = path.join(getBackupDir(), backupName);

    const size = await zipDirectory(sourcePath, zipPath);
    const backupType: 'local' | 'cloud' = save.webdavUrl ? 'cloud' : 'local';

    const backup: Backup = {
      id: backupId,
      gameSaveId,
      name: backupName,
      path: zipPath,
      size,
      createdAt: new Date(),
      type: backupType,
    };

    // Upload to WebDAV if configured
    if (backupType === 'cloud' && save.webdavUrl && save.webdavUsername && save.webdavPassword) {
      // 构建远程路径：如果指定了远程路径，使用它；否则使用项目ID作为目录
      let remoteDir = save.webdavRemotePath || save.id;
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
          save.webdavUrl,
          save.webdavUsername,
          save.webdavPassword,
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
          save.webdavUrl,
          save.webdavUsername,
          save.webdavPassword,
          remotePath
        );
        save.lastSync = new Date();
      } catch (error) {
        throw new Error(`WebDAV upload failed: ${error}`);
      }
    }

    const backups = await loadBackups();
    backups.push(backup);
    await saveBackups(backups);

    save.lastBackup = new Date();
    save.backupCount += 1;
    await saveGameSaves(saves);

    return {
      id: backup.id,
      game_save_id: backup.gameSaveId,
      name: backup.name,
      path: backup.path,
      size: backup.size,
      backup_type: backup.type,
      created_at: backup.createdAt.toISOString(),
    };
  });

  ipcMain.handle('list-backups', async (_event, gameSaveId?: string): Promise<any[]> => {
    const backups = await loadBackups();
    const filtered = gameSaveId
      ? backups.filter((b) => b.gameSaveId === gameSaveId)
      : backups;
    return filtered.map((backup) => ({
      id: backup.id,
      game_save_id: backup.gameSaveId,
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

    const saves = await loadGameSaves();
    const save = saves.find((s) => s.id === backup.gameSaveId);
    if (!save) {
      throw new Error('Game save not found');
    }

    await ensureDataDir();

    let zipPath = backup.path;

    // Download from WebDAV if it's a cloud backup
    if (backup.type === 'cloud') {
      if (!save.webdavUrl || !save.webdavUsername || !save.webdavPassword) {
        throw new Error('WebDAV credentials not configured');
      }

      const tempZip = path.join(getTempDir(), backup.name);
      // 构建远程路径：如果指定了远程路径，使用它；否则使用项目ID作为目录
      let remoteDir = save.webdavRemotePath || save.id;
      if (!remoteDir.startsWith('/')) {
        remoteDir = `/${remoteDir}`;
      }
      if (!remoteDir.endsWith('/')) {
        remoteDir = `${remoteDir}/`;
      }
      const remotePath = `${remoteDir}${backup.name}`;
      await downloadFromWebDAV(
        save.webdavUrl,
        save.webdavUsername,
        save.webdavPassword,
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
    const savePath = save.savePath;
    if (await fs.access(savePath).then(() => true).catch(() => false)) {
      const currentBackupPath = path.join(getTempDir(), `current_backup_${generateId()}`);
      await copyDirectory(savePath, currentBackupPath);
    }

    // Remove existing save directory
    try {
      const stats = await fs.stat(savePath);
      if (stats.isDirectory()) {
        await fs.rm(savePath, { recursive: true });
      } else {
        await fs.unlink(savePath);
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
        await copyDirectory(entryPath, savePath);
      } else {
        await fs.mkdir(path.dirname(savePath), { recursive: true });
        await fs.copyFile(entryPath, savePath);
      }
    } else {
      await copyDirectory(tempExtractDir, savePath);
    }

    // Clean up temporary files
    await fs.rm(tempExtractDir, { recursive: true }).catch(() => {});
    if (backup.type === 'cloud') {
      await fs.unlink(zipPath).catch(() => {});
    }

    save.updatedAt = new Date();
    await saveGameSaves(saves);
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
      const saves = await loadGameSaves();
      const save = saves.find((s) => s.id === backup.gameSaveId);
      if (save?.webdavUrl && save?.webdavUsername && save?.webdavPassword) {
        // 构建远程路径：如果指定了远程路径，使用它；否则使用项目ID作为目录
        let remoteDir = save.webdavRemotePath || save.id;
        if (!remoteDir.startsWith('/')) {
          remoteDir = `/${remoteDir}`;
        }
        if (!remoteDir.endsWith('/')) {
          remoteDir = `${remoteDir}/`;
        }
        const remotePath = `${remoteDir}${backup.name}`;
        const fullUrl = save.webdavUrl.endsWith('/')
          ? `${save.webdavUrl}${remotePath}`
          : `${save.webdavUrl}/${remotePath}`;
        const parsedUrl = new URL(fullUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const httpModule = isHttps ? https : http;
        const auth = Buffer.from(`${save.webdavUsername}:${save.webdavPassword}`).toString('base64');

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

    // Update game save backup count
    const saves = await loadGameSaves();
    const save = saves.find((s) => s.id === backup.gameSaveId);
    if (save) {
      save.backupCount = Math.max(0, save.backupCount - 1);
      await saveGameSaves(saves);
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
