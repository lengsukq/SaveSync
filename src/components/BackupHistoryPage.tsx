import { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Tabs,
  Tab,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { Download, Trash2, HardDrive, Cloud, Folder, MoreVertical } from "lucide-react";
import { SyncProjectService } from "../services/syncProjectService";
import { Backup, SyncProject } from "../types";
import { format } from "date-fns";

interface BackupHistoryPageProps {
  project: SyncProject | null;
  onClose: () => void;
}

export function BackupHistoryPage({ project, onClose }: BackupHistoryPageProps) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("all");

  useEffect(() => {
    if (project) {
      loadBackups();
    }
  }, [project?.id]);

  const loadBackups = async () => {
    if (!project) return;
    try {
      const data = await SyncProjectService.listBackups(project.id);
      setBackups(data);
    } catch (error) {
      console.error("Failed to load backups:", error);
    }
  };

  const localBackups = backups.filter((b) => b.type === "local");
  const cloudBackups = backups.filter((b) => b.type === "cloud");

  const handleRestore = async (backupId: string) => {
    if (!confirm("确定要恢复这个备份吗？当前文件将被覆盖。")) return;
    try {
      await SyncProjectService.restoreBackup(backupId);
      alert("恢复成功！");
      await loadBackups();
    } catch (error) {
      console.error("Failed to restore backup:", error);
      alert("恢复失败，请重试");
    }
  };

  const handleDelete = async (backupId: string) => {
    if (!confirm("确定要删除这个备份吗？")) return;
    try {
      await SyncProjectService.deleteBackup(backupId);
      await loadBackups();
    } catch (error) {
      console.error("Failed to delete backup:", error);
      alert("删除失败，请重试");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  if (!project) return null;

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      size="5xl" 
      scrollBehavior="inside"
      classNames={{
        base: "bg-white/80 backdrop-blur-xl",
        header: "border-b border-[#d2d2d7]/50",
        body: "py-6",
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="w-full">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-[#1d1d1f]">
                  {project.alias ? `${project.alias} (${project.name})` : project.name} - 备份历史
                </h3>
                <div className="flex gap-4 mt-2 text-sm text-[#86868b] font-medium">
                  <span>本地: {localBackups.length} 个</span>
                  <span>云端: {cloudBackups.length} 个</span>
                  <span>总计: {backups.length} 个</span>
                </div>
              </div>
            </div>
          </div>
        </ModalHeader>
        <ModalBody>
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key: string | number) => setSelectedTab(key as string)}
            aria-label="备份类型筛选"
            classNames={{
              base: "w-full",
              tabList: "gap-2 bg-[#f5f5f7] p-1 rounded-xl",
              tab: "data-[selected=true]:bg-white data-[selected=true]:text-[#007AFF]",
              tabContent: "group-data-[selected=true]:text-[#007AFF]",
            }}
          >
            <Tab
              key="all"
              title={
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  <span>全部 ({backups.length})</span>
                </div>
              }
            >
              <BackupList 
                backups={backups} 
                onRestore={handleRestore} 
                onDelete={handleDelete}
                formatFileSize={formatFileSize}
              />
            </Tab>
            <Tab
              key="local"
              title={
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  <span>本地 ({localBackups.length})</span>
                </div>
              }
            >
              <BackupList 
                backups={localBackups} 
                onRestore={handleRestore} 
                onDelete={handleDelete}
                formatFileSize={formatFileSize}
              />
            </Tab>
            <Tab
              key="cloud"
              title={
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4" />
                  <span>云端 ({cloudBackups.length})</span>
                </div>
              }
            >
              <BackupList 
                backups={cloudBackups} 
                onRestore={handleRestore} 
                onDelete={handleDelete}
                formatFileSize={formatFileSize}
              />
            </Tab>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

interface BackupListProps {
  backups: Backup[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
  formatFileSize: (bytes: number) => string;
}

function BackupList({ backups, onRestore, onDelete, formatFileSize }: BackupListProps) {
  if (backups.length === 0) {
    return (
      <div className="text-center py-12">
        <HardDrive className="w-16 h-16 text-[#d2d2d7] mx-auto mb-4" />
        <p className="text-[#86868b] font-medium">还没有备份记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {backups.map((backup) => (
        <div
          key={backup.id}
          className="glass rounded-xl p-4 border border-[#d2d2d7]/30 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-medium text-[#1d1d1f]">{backup.name}</span>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${
                  backup.type === "local" 
                    ? 'bg-[#007AFF]/10 text-[#007AFF]' 
                    : 'bg-[#AF52DE]/10 text-[#AF52DE]'
                }`}>
                  {backup.type === "local" ? "本地" : "云端"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-[#86868b] font-medium">
                <span>{formatFileSize(backup.size)}</span>
                <span>•</span>
                <span>{format(backup.createdAt, "yyyy-MM-dd HH:mm:ss")}</span>
              </div>
            </div>
            <Dropdown>
              <DropdownTrigger>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#00000008] active:bg-[#00000012] transition-colors">
                  <MoreVertical className="w-4 h-4 text-[#86868b]" />
                </button>
              </DropdownTrigger>
              <DropdownMenu aria-label="备份操作">
                <DropdownItem
                  key="restore"
                  startContent={<Download className="w-4 h-4" />}
                  onPress={() => onRestore(backup.id)}
                >
                  恢复
                </DropdownItem>
                <DropdownItem
                  key="delete"
                  className="text-danger"
                  color="danger"
                  startContent={<Trash2 className="w-4 h-4" />}
                  onPress={() => onDelete(backup.id)}
                >
                  删除
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      ))}
    </div>
  );
}
