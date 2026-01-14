import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { Plus, FolderOpen, MoreVertical, Clock } from "lucide-react";
import { useSyncProjectStore } from "../stores/syncProjectStore";
import { SyncProjectService } from "../services/syncProjectService";
import { SyncProject } from "../types";
import { format } from "date-fns";
import { SyncProjectForm } from "./SyncProjectForm";
import { BackupHistory } from "./BackupHistory";

export function SyncProjectManager() {
  const {
    projects,
    setProjects,
    selectedProject,
    setSelectedProject,
  } = useSyncProjectStore();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingProject, setEditingProject] = useState<SyncProject | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await SyncProjectService.listProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  };

  const handleCreate = () => {
    setEditingProject(null);
    onOpen();
  };

  const handleEdit = (project: SyncProject) => {
    setEditingProject(project);
    onOpen();
  };

  const handleDelete = async (id: string) => {
    if (confirm("确定要删除这个同步项目吗？")) {
      try {
        await SyncProjectService.deleteProject(id);
        await loadProjects();
      } catch (error) {
        console.error("Failed to delete project:", error);
      }
    }
  };

  const handleBackup = async (project: SyncProject) => {
    try {
      await SyncProjectService.createBackup(project.id);
      await loadProjects();
    } catch (error) {
      console.error("Failed to create backup:", error);
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-semibold text-[#1d1d1f] tracking-tight mb-2">文件同步管理</h2>
          <p className="text-[#86868b] text-[15px] font-medium">
            管理你的文件同步项目和备份
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white rounded-xl font-medium text-[15px] hover:bg-[#0051D5] active:bg-[#0040B3] transition-colors duration-200 apple-shadow"
        >
          <Plus className="w-5 h-5" />
          添加同步项目
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="glass rounded-3xl p-16 text-center apple-shadow-lg">
          <FolderOpen className="w-20 h-20 text-[#d2d2d7] mx-auto mb-6" />
          <p className="text-[#86868b] text-lg font-medium mb-6">
            还没有添加任何同步项目
          </p>
          <button
            onClick={handleCreate}
            className="px-6 py-3 bg-[#007AFF] text-white rounded-xl font-medium text-[15px] hover:bg-[#0051D5] active:bg-[#0040B3] transition-colors duration-200 apple-shadow"
          >
            添加第一个同步项目
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <div key={project.id} className="glass rounded-2xl p-6 hover:shadow-lg transition-all duration-300 apple-shadow border border-[#d2d2d7]/30">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-[#1d1d1f]">
                      {project.alias || project.name}
                    </h3>
                    {project.alias && (
                      <span className="text-xs text-[#86868b] font-medium">
                        ({project.name})
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-sm text-[#86868b] font-medium">
                      {project.description}
                    </p>
                  )}
                </div>
                <Dropdown>
                  <DropdownTrigger>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#00000008] active:bg-[#00000012] transition-colors">
                      <MoreVertical className="w-4 h-4 text-[#86868b]" />
                    </button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Actions">
                    <DropdownItem
                      key="edit"
                      onPress={() => handleEdit(project)}
                    >
                      编辑
                    </DropdownItem>
                    <DropdownItem
                      key="backup"
                      onPress={() => handleBackup(project)}
                    >
                      创建备份
                    </DropdownItem>
                    <DropdownItem
                      key="history"
                      onPress={() => setSelectedProject(project)}
                    >
                      查看备份历史
                    </DropdownItem>
                    <DropdownItem
                      key="delete"
                      className="text-danger"
                      color="danger"
                      onPress={() => handleDelete(project.id)}
                    >
                      删除
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
              <div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-[#86868b] font-medium">
                    <FolderOpen className="w-4 h-4" />
                    <span className="truncate">{project.sourcePath}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      project.enabled 
                        ? 'bg-[#34C759]/10 text-[#34C759]' 
                        : 'bg-[#86868b]/10 text-[#86868b]'
                    }`}>
                      {project.enabled ? "已启用" : "已禁用"}
                    </span>
                    <div className="flex gap-3 text-xs text-[#86868b] font-medium">
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
                  {project.lastBackup && (
                    <div className="flex items-center gap-2 text-xs text-[#86868b] font-medium">
                      <Clock className="w-3 h-3" />
                      <span>
                        最后备份: {format(project.lastBackup, "yyyy-MM-dd HH:mm")}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => handleBackup(project)}
                    className="w-full px-4 py-2.5 bg-[#007AFF] text-white rounded-xl font-medium text-[14px] hover:bg-[#0051D5] active:bg-[#0040B3] transition-colors duration-200 apple-shadow"
                  >
                    立即备份
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        size="2xl" 
        scrollBehavior="inside"
        classNames={{
          base: "bg-white/80 backdrop-blur-xl",
          header: "border-b border-[#d2d2d7]/50",
          body: "py-6",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-xl font-semibold text-[#1d1d1f]">
            {editingProject ? "编辑同步项目" : "添加同步项目"}
          </ModalHeader>
          <ModalBody>
            <SyncProjectForm
              project={editingProject}
              onSuccess={() => {
                onClose();
                loadProjects();
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {selectedProject && (
        <BackupHistory
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}
