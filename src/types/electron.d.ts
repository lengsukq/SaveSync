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

export {};
