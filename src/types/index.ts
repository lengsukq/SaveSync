export interface SyncProject {
  id: string;
  name: string;
  alias?: string; // 别名，用于快速识别
  sourcePath: string; // 源文件路径
  description?: string;
  enabled: boolean;
  lastBackup?: Date;
  lastSync?: Date;
  backupCount: number;
  localBackupCount?: number; // 本地备份数量
  cloudBackupCount?: number; // WebDAV 备份数量
  createdAt: Date;
  updatedAt: Date;
  webdavSourceId?: string; // 引用的 WebDAV 源 ID
  webdavUrl?: string; // 保留用于向后兼容，如果设置了 webdavSourceId 则优先使用源配置
  webdavUsername?: string;
  webdavPassword?: string;
  webdavRemotePath?: string; // WebDAV 远程路径（文件夹），例如：/backups/project1
}

export interface Backup {
  id: string;
  projectId: string; // 从 gameSaveId 改为 projectId
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  type: 'local' | 'cloud';
}

export interface SyncProjectConfig {
  id: string;
  name: string;
  sourcePath: string;
  description?: string;
  enabled: boolean;
  autoBackup: boolean;
  backupInterval: number; // minutes
  maxBackups: number;
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
}

export interface WebDAVSource {
  id: string;
  name: string; // WebDAV 源名称，用于识别
  url: string;
  username: string;
  password: string;
  defaultRemotePath?: string; // 默认远程路径
}

export interface AppSettings {
  backupDirectory: string;
  defaultMaxBackups: number;
  defaultBackupInterval: number;
  theme: 'light' | 'dark' | 'system';
  webdavSources: WebDAVSource[]; // WebDAV 源列表
}
