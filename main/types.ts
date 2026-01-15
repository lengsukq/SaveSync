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
  compress?: boolean; // 是否压缩，默认为 true（向后兼容）
}

export interface Backup {
  id: string;
  projectId: string;
  name: string;
  path: string; // 压缩文件路径或文件夹路径
  size: number;
  createdAt: Date;
  type: 'local' | 'cloud';
  isCompressed?: boolean; // 是否压缩，默认为 true（向后兼容）
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
  compress?: boolean; // 是否压缩
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
