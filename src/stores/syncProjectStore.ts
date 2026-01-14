import { create } from "zustand";
import { SyncProject, Backup } from "../types";

interface SyncProjectStore {
  projects: SyncProject[];
  backups: Backup[];
  selectedProject: SyncProject | null;
  setProjects: (projects: SyncProject[]) => void;
  addProject: (project: SyncProject) => void;
  updateProject: (id: string, updates: Partial<SyncProject>) => void;
  deleteProject: (id: string) => void;
  setSelectedProject: (project: SyncProject | null) => void;
  setBackups: (backups: Backup[]) => void;
  addBackup: (backup: Backup) => void;
}

export const useSyncProjectStore = create<SyncProjectStore>((set) => ({
  projects: [],
  backups: [],
  selectedProject: null,
  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === id ? { ...project, ...updates, updatedAt: new Date() } : project
      ),
    })),
  deleteProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
      selectedProject:
        state.selectedProject?.id === id ? null : state.selectedProject,
    })),
  setSelectedProject: (project) => set({ selectedProject: project }),
  setBackups: (backups) => set({ backups }),
  addBackup: (backup) =>
    set((state) => ({ backups: [backup, ...state.backups] })),
}));
