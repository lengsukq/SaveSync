import { Save } from "lucide-react";

export function Header() {
  return (
    <header className="glass border-b border-[#d2d2d7]/50 px-8 py-5 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#0051D5] flex items-center justify-center apple-shadow">
          <Save className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">SaveSync</h1>
          <p className="text-sm text-[#86868b] font-medium">文件同步工具</p>
        </div>
      </div>
    </header>
  );
}
