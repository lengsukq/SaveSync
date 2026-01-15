import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Sync Project operations
  listProjects: () => ipcRenderer.invoke('list-projects'),
  createProject: (config: any) => ipcRenderer.invoke('create-project', config),
  updateProject: (id: string, updates: any) => ipcRenderer.invoke('update-project', id, updates),
  deleteProject: (id: string) => ipcRenderer.invoke('delete-project', id),
  
  // Backup operations
  createBackup: (projectId: string) => ipcRenderer.invoke('create-backup', projectId),
  listBackups: (projectId?: string) => ipcRenderer.invoke('list-backups', projectId),
  restoreBackup: (backupId: string) => ipcRenderer.invoke('restore-backup', backupId),
  deleteBackup: (backupId: string) => ipcRenderer.invoke('delete-backup', backupId),
  
  // File dialog
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (updates: any) => ipcRenderer.invoke('update-settings', updates),
  
  // WebDAV test
  testWebDAVConnection: (url: string, username: string, password: string) => ipcRenderer.invoke('test-webdav-connection', url, username, password),
  
  // WebDAV directory browser
  listWebDAVDirectory: (url: string, username: string, password: string, remotePath?: string) => ipcRenderer.invoke('list-webdav-directory', url, username, password, remotePath),
});

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      listProjects: () => Promise<any[]>;
      createProject: (config: any) => Promise<any>;
      updateProject: (id: string, updates: any) => Promise<any>;
      deleteProject: (id: string) => Promise<void>;
      createBackup: (projectId: string) => Promise<any>;
      listBackups: (projectId?: string) => Promise<any[]>;
      restoreBackup: (backupId: string) => Promise<void>;
      deleteBackup: (backupId: string) => Promise<void>;
      showOpenDialog: (options: any) => Promise<any>;
      getSettings: () => Promise<any>;
      updateSettings: (updates: any) => Promise<any>;
      testWebDAVConnection: (url: string, username: string, password: string) => Promise<{ success: boolean; message: string }>;
      listWebDAVDirectory: (url: string, username: string, password: string, remotePath?: string) => Promise<Array<{ path: string; name: string; is_directory: boolean }>>;
    };
  }
}
