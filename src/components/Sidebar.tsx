import { Save, History, Settings } from "lucide-react";

interface SidebarProps {
  currentView: "saves" | "backups" | "settings";
  onViewChange: (view: "saves" | "backups" | "settings") => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: "saves" as const, label: "同步项目", icon: Save },
    { id: "backups" as const, label: "备份历史", icon: History },
    { id: "settings" as const, label: "设置", icon: Settings },
  ];

  return (
    <aside className="w-64 glass border-r border-[#d2d2d7]/50 p-6">
      <nav className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? 'bg-[#007AFF] text-white shadow-md' 
                  : 'text-[#1d1d1f] hover:bg-[#00000008] active:bg-[#00000012]'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#86868b]'}`} />
              <span className={`font-medium text-[15px] ${isActive ? 'text-white' : 'text-[#1d1d1f]'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
