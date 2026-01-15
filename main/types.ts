export interface SyncProject {
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
  webdavSourceId?: string;
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
  webdavRemotePath?: string;
}

export interface Backup {
  id: string;
  projectId: string;
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  type: 'local' | 'cloud';
}

export interface SyncProjectConfig {
  name: string;
  alias?: string;
  sourcePath: string;
  description?: string;
  webdavSourceId?: string;
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
  webdavRemotePath?: string;
}

export interface WebDAVSource {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  defaultRemotePath?: string;
}

export interface AppSettings {
  backupDirectory: string;
  defaultMaxBackups: number;
  defaultBackupInterval: number;
  theme: 'light' | 'dark' | 'system';
  webdavSources: WebDAVSource[];
}

export interface WebDAVItem {
  path: string;
  name: string;
  isDirectory: boolean;
}
