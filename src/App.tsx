import { useState } from "react";
import { HeroUIProvider } from "@heroui/react";
import { GameSaveManager } from "./components/GameSaveManager";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";

type View = "saves" | "backups" | "settings";

function App() {
  const [currentView, setCurrentView] = useState<View>("saves");

  return (
    <HeroUIProvider>
      <div className="flex h-screen bg-default-50">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            {currentView === "saves" && <GameSaveManager />}
            {currentView === "backups" && (
              <div className="text-center text-default-500 mt-20">
                <p className="text-lg">备份历史功能开发中...</p>
              </div>
            )}
            {currentView === "settings" && (
              <div className="text-center text-default-500 mt-20">
                <p className="text-lg">设置功能开发中...</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </HeroUIProvider>
  );
}

export default App;
