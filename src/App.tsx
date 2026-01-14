import { useState } from "react";
import { HeroUIProvider } from "@heroui/react";
import { SyncProjectManager } from "./components/SyncProjectManager";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { BackupHistoryPage } from "./components/BackupHistoryPage";
import { Settings } from "./components/Settings";
import { useSyncProjectStore } from "./stores/syncProjectStore";
import { SyncProject } from "./types";

type View = "saves" | "backups" | "settings";

function App() {
  const [currentView, setCurrentView] = useState<View>("saves");
  const { projects } = useSyncProjectStore();

  return (
    <HeroUIProvider>
      <div className="flex h-screen bg-[#f5f5f7]">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 bg-[#f5f5f7]">
          {currentView === "saves" && <SyncProjectManager />}
          {currentView === "backups" && (
            <BackupHistoryView projects={projects} />
          )}
          {currentView === "settings" && <Settings />}
        </main>
      </div>
    </div>
    </HeroUIProvider>
  );
}

interface BackupHistoryViewProps {
  projects: SyncProject[];
}

function BackupHistoryView({ projects }: BackupHistoryViewProps) {
  const [selectedProject, setSelectedProject] = useState<SyncProject | null>(null);

  if (projects.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-[#86868b] text-lg font-medium mb-4">还没有添加任何同步项目</p>
        <p className="text-[#86868b] text-sm">请先添加同步项目，然后查看备份历史</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-semibold text-[#1d1d1f] tracking-tight mb-2">备份历史</h2>
        <p className="text-[#86868b] text-[15px] font-medium">
          查看和管理所有项目的备份记录
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => setSelectedProject(project)}
            className="glass rounded-2xl p-6 hover:shadow-lg transition-all duration-300 apple-shadow border border-[#d2d2d7]/30 cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#0051D5] flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {(project.alias || project.name).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#1d1d1f] text-lg">
                  {project.alias || project.name}
                </h3>
                {project.alias && (
                  <p className="text-sm text-[#86868b] font-medium">{project.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-3 text-[#86868b] font-medium">
                {project.localBackupCount !== undefined && project.localBackupCount > 0 && (
                  <span>本地: {project.localBackupCount}</span>
                )}
                {project.cloudBackupCount !== undefined && project.cloudBackupCount > 0 && (
                  <span>云端: {project.cloudBackupCount}</span>
                )}
                {(!project.localBackupCount || project.localBackupCount === 0) && 
                 (!project.cloudBackupCount || project.cloudBackupCount === 0) && (
                  <span>总计: {project.backupCount}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedProject && (
        <BackupHistoryPage
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}

export default App;
