export interface GameSave {
  id: string;
  name: string;
  savePath: string;
  description?: string;
  enabled: boolean;
  lastBackup?: Date;
  lastSync?: Date;
  backupCount: number;
  createdAt: Date;
  updatedAt: Date;
  webdavUrl?: string;
  webdavUsername?: string;
  webdavPassword?: string;
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
