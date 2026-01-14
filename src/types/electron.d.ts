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
    };
  }
}

export {};
