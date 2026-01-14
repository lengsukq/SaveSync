import { Save } from "lucide-react";

export function Header() {
  return (
    <header className="bg-default-50 border-b border-default-200 px-6 py-4">
      <div className="flex items-center gap-3">
        <Save className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">SaveSync</h1>
          <p className="text-sm text-default-500">游戏存档同步工具</p>
        </div>
      </div>
    </header>
  );
}
