import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Game Save operations
  listGameSaves: () => ipcRenderer.invoke('list-game-saves'),
  createGameSave: (config: any) => ipcRenderer.invoke('create-game-save', config),
  updateGameSave: (id: string, updates: any) => ipcRenderer.invoke('update-game-save', id, updates),
  deleteGameSave: (id: string) => ipcRenderer.invoke('delete-game-save', id),
  
  // Backup operations
  createBackup: (gameSaveId: string) => ipcRenderer.invoke('create-backup', gameSaveId),
  listBackups: (gameSaveId?: string) => ipcRenderer.invoke('list-backups', gameSaveId),
  restoreBackup: (backupId: string) => ipcRenderer.invoke('restore-backup', backupId),
  deleteBackup: (backupId: string) => ipcRenderer.invoke('delete-backup', backupId),
  
  // File dialog
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      listGameSaves: () => Promise<any[]>;
      createGameSave: (config: any) => Promise<any>;
      updateGameSave: (id: string, updates: any) => Promise<any>;
      deleteGameSave: (id: string) => Promise<void>;
      createBackup: (gameSaveId: string) => Promise<any>;
      listBackups: (gameSaveId?: string) => Promise<any[]>;
      restoreBackup: (backupId: string) => Promise<void>;
      deleteBackup: (backupId: string) => Promise<void>;
      showOpenDialog: (options: any) => Promise<any>;
    };
  }
}
