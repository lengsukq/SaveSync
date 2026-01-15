import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SyncProject, Backup, AppSettings, WebDAVSource } from './types.js';

export function getDataDir(): string {
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

export function getBackupDir(): string {
  return path.join(getDataDir(), 'backups');
}

export function getTempDir(): string {
  return path.join(getDataDir(), 'temp');
}

export async function ensureDataDir(): Promise<void> {
  const dataDir = getDataDir();
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(getBackupDir(), { recursive: true });
  await fs.mkdir(getTempDir(), { recursive: true });
}

export async function loadProjects(): Promise<SyncProject[]> {
  const dataFile = path.join(getDataDir(), 'projects.json');
  try {
    const content = await fs.readFile(dataFile, 'utf-8');
    if (!content.trim()) {
      console.log('Projects file is empty, returning empty array');
      return [];
    }
    const projects = JSON.parse(content);
    if (!Array.isArray(projects)) {
      console.warn('Projects file does not contain an array, returning empty array');
      return [];
    }
    const loaded = projects.map((project: any) => ({
      ...project,
      sourcePath: project.sourcePath || project.savePath, // Migration: support old field name
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
      lastBackup: project.lastBackup ? new Date(project.lastBackup) : undefined,
      lastSync: project.lastSync ? new Date(project.lastSync) : undefined,
    }));
    console.log(`Loaded ${loaded.length} projects from ${dataFile}`);
    return loaded;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('Projects file does not exist yet, returning empty array');
    } else {
      console.error('Failed to load projects:', error);
    }
    return [];
  }
}

export async function saveProjects(projects: SyncProject[]): Promise<void> {
  try {
    await ensureDataDir();
    const dataFile = path.join(getDataDir(), 'projects.json');
    
    // 序列化时处理 Date 对象
    const serialized = JSON.stringify(projects, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }, 2);
    
    await fs.writeFile(dataFile, serialized, 'utf-8');
    console.log(`Projects saved to ${dataFile}, count: ${projects.length}`);
  } catch (error) {
    console.error('Failed to save projects:', error);
    throw error;
  }
}

export async function loadBackups(): Promise<Backup[]> {
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

export async function saveBackups(backups: Backup[]): Promise<void> {
  try {
    await ensureDataDir();
    const backupFile = path.join(getDataDir(), 'backups.json');
    
    // 序列化时处理 Date 对象
    const serialized = JSON.stringify(backups, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }, 2);
    
    await fs.writeFile(backupFile, serialized, 'utf-8');
    console.log(`Backups saved to ${backupFile}, count: ${backups.length}`);
  } catch (error) {
    console.error('Failed to save backups:', error);
    throw error;
  }
}

export async function loadSettings(): Promise<AppSettings> {
  const settingsFile = path.join(getDataDir(), 'settings.json');
  try {
    const content = await fs.readFile(settingsFile, 'utf-8');
    const settings = JSON.parse(content);
    
    // 迁移旧的单个 WebDAV 配置到新的源列表
    let webdavSources: WebDAVSource[] = settings.webdavSources || [];
    if (!webdavSources.length && (settings.defaultWebdavUrl || settings.defaultWebdavUsername)) {
      // 如果有旧的配置，迁移到新的源列表
      webdavSources = [{
        id: `webdav-${Date.now()}`,
        name: '默认 WebDAV 源',
        url: settings.defaultWebdavUrl || '',
        username: settings.defaultWebdavUsername || '',
        password: settings.defaultWebdavPassword || '',
        defaultRemotePath: settings.defaultWebdavRemotePath,
      }];
    }
    
    return {
      backupDirectory: settings.backupDirectory || getBackupDir(),
      defaultMaxBackups: settings.defaultMaxBackups ?? 10,
      defaultBackupInterval: settings.defaultBackupInterval ?? 60,
      theme: settings.theme || 'system',
      webdavSources,
    };
  } catch {
    // 返回默认设置
    return {
      backupDirectory: getBackupDir(),
      defaultMaxBackups: 10,
      defaultBackupInterval: 60,
      theme: 'system',
      webdavSources: [],
    };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await ensureDataDir();
    const settingsFile = path.join(getDataDir(), 'settings.json');
    
    // 序列化时处理 Date 对象（虽然 AppSettings 没有 Date，但为了统一）
    const serialized = JSON.stringify(settings, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }, 2);
    
    await fs.writeFile(settingsFile, serialized, 'utf-8');
    console.log(`Settings saved to ${settingsFile}`);
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}
