export interface GameSave {
  id: string;
  name: string;
  alias?: string; // 别名，用于快速识别
  savePath: string;
  description?: string;
  enabled: boolean;
  lastBackup?: Date;
  lastSync?: Date;
  backupCount: number;
  localBackupCount?: number; // 本地备份数量
  cloudBackupCount?: number; // WebDAV 备份数量
  createdAt: Date;
  updatedAt: Date;
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
  webdavRemotePath?: string; // WebDAV 远程路径（文件夹），例如：/backups/game1
}

export interface Backup {
  id: string;
  gameSaveId: string;
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  type: 'local' | 'cloud';
}

export interface GameSaveConfig {
  id: string;
  name: string;
  savePath: string;
  description?: string;
  enabled: boolean;
  autoBackup: boolean;
  backupInterval: number; // minutes
  maxBackups: number;
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
}

export interface AppSettings {
  backupDirectory: string;
  defaultMaxBackups: number;
  defaultBackupInterval: number;
  theme: 'light' | 'dark' | 'system';
}
