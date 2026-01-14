export const DEFAULT_MAX_BACKUPS = 10;
export const DEFAULT_BACKUP_INTERVAL = 60; // minutes
export const DEFAULT_BACKUP_DIR = 'backups';

export const BACKUP_TYPES = {
  LOCAL: 'local',
  CLOUD: 'cloud',
} as const;

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;
