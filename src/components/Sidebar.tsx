import { Button } from "@heroui/react";
import { Save, History, Settings } from "lucide-react";

interface SidebarProps {
  currentView: "saves" | "backups" | "settings";
  onViewChange: (view: "saves" | "backups" | "settings") => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: "saves" as const, label: "游戏存档", icon: Save },
    { id: "backups" as const, label: "备份历史", icon: History },
    { id: "settings" as const, label: "设置", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-default-100 border-r border-default-200 p-4">
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={currentView === item.id ? "solid" : "light"}
              color={currentView === item.id ? "primary" : "default"}
              className="w-full justify-start"
              startContent={<Icon className="w-5 h-5" />}
              onPress={() => onViewChange(item.id)}
            >
              {item.label}
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
