import { create } from "zustand";
import { GameSave, Backup } from "../types";

interface GameSaveStore {
  gameSaves: GameSave[];
  backups: Backup[];
  selectedGameSave: GameSave | null;
  setGameSaves: (saves: GameSave[]) => void;
  addGameSave: (save: GameSave) => void;
  updateGameSave: (id: string, updates: Partial<GameSave>) => void;
  deleteGameSave: (id: string) => void;
  setSelectedGameSave: (save: GameSave | null) => void;
  setBackups: (backups: Backup[]) => void;
  addBackup: (backup: Backup) => void;
}

export const useGameSaveStore = create<GameSaveStore>((set) => ({
  gameSaves: [],
  backups: [],
  selectedGameSave: null,
  setGameSaves: (saves) => set({ gameSaves: saves }),
  addGameSave: (save) =>
    set((state) => ({ gameSaves: [...state.gameSaves, save] })),
  updateGameSave: (id, updates) =>
    set((state) => ({
      gameSaves: state.gameSaves.map((save) =>
        save.id === id ? { ...save, ...updates, updatedAt: new Date() } : save
      ),
    })),
  deleteGameSave: (id) =>
    set((state) => ({
      gameSaves: state.gameSaves.filter((save) => save.id !== id),
      selectedGameSave:
        state.selectedGameSave?.id === id ? null : state.selectedGameSave,
    })),
  setSelectedGameSave: (save) => set({ selectedGameSave: save }),
  setBackups: (backups) => set({ backups }),
  addBackup: (backup) =>
    set((state) => ({ backups: [backup, ...state.backups] })),
}));
