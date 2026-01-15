import { useState, useEffect } from "react";
import { Button, Input, Textarea, Switch, Divider, Select, SelectItem } from "@heroui/react";
import { FolderOpen, Cloud } from "lucide-react";
import { SyncProjectService } from "../services/syncProjectService";
import { SettingsService } from "../services/settingsService";
import { SyncProject, WebDAVSource } from "../types";
import "../types/electron.d";

interface SyncProjectFormProps {
  project?: SyncProject | null;
  onSuccess: () => void;
}

export function SyncProjectForm({ project, onSuccess }: SyncProjectFormProps) {
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [sourcePath, setSourcePath] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [webdavSourceId, setWebdavSourceId] = useState<string>("");
  const [webdavUrl, setWebdavUrl] = useState("");
  const [webdavUsername, setWebdavUsername] = useState("");
  const [webdavPassword, setWebdavPassword] = useState("");
  const [webdavRemotePath, setWebdavRemotePath] = useState("");
  const [compress, setCompress] = useState(true);
  const [webdavSources, setWebdavSources] = useState<WebDAVSource[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // 加载 WebDAV 源列表
    const loadWebdavSources = async () => {
      try {
        const settings = await SettingsService.getSettings();
        setWebdavSources(settings.webdavSources || []);
      } catch (error) {
        console.error("Failed to load WebDAV sources:", error);
      }
    };
    loadWebdavSources();
  }, []);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setAlias(project.alias || "");
      setSourcePath(project.sourcePath);
      setDescription(project.description || "");
      setEnabled(project.enabled);
      setWebdavSourceId(project.webdavSourceId || "");
      setWebdavUrl(project.webdavUrl || "");
      setWebdavUsername(project.webdavUsername || "");
      setWebdavPassword(project.webdavPassword || "");
      setWebdavRemotePath(project.webdavRemotePath || "");
      setCompress(project.compress !== false); // 默认为 true
    } else {
      // 重置表单
      setName("");
      setAlias("");
      setSourcePath("");
      setDescription("");
      setEnabled(true);
      setWebdavSourceId("");
      setWebdavUrl("");
      setWebdavUsername("");
      setWebdavPassword("");
      setWebdavRemotePath("");
      setCompress(true); // 默认压缩
    }
  }, [project]);

  // 当选择 WebDAV 源时，自动填充信息
  useEffect(() => {
    if (webdavSourceId && webdavSources.length > 0) {
      const source = webdavSources.find(s => s.id === webdavSourceId);
      if (source) {
        setWebdavUrl(source.url);
        setWebdavUsername(source.username);
        setWebdavPassword(source.password);
        // 如果源有默认远程路径且当前没有设置，则使用源的默认路径
        if (source.defaultRemotePath && !webdavRemotePath) {
          setWebdavRemotePath(source.defaultRemotePath);
        }
      }
    } else if (!webdavSourceId && !project) {
      // 如果取消选择源且不是编辑模式，清空字段
      setWebdavUrl("");
      setWebdavUsername("");
      setWebdavPassword("");
    }
  }, [webdavSourceId, webdavSources]);

  const handleSelectPath = async () => {
    try {
      // 检查 electronAPI 是否可用
      if (typeof window === 'undefined' || !window.electronAPI) {
        console.error("Electron API not available:", {
          window: typeof window,
          electronAPI: window?.electronAPI,
        });
        alert("Electron API 不可用，请确保在 Electron 环境中运行");
        return;
      }
      
      const result = await window.electronAPI.showOpenDialog({
        properties: ['openFile', 'openDirectory'],
        title: "选择要同步的文件或目录",
      });
      
      if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
        setSourcePath(result.filePaths[0]);
      }
    } catch (error) {
      console.error("Failed to select path:", error);
      alert(`选择路径失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !sourcePath.trim()) {
      alert("请填写名称和源文件路径");
      return;
    }

    setIsSubmitting(true);
    try {
      if (project) {
        await SyncProjectService.updateProject(project.id, {
          name,
          alias: alias.trim() || undefined,
          sourcePath,
          description,
          enabled,
          compress,
          webdavSourceId: webdavSourceId || undefined,
          webdavUrl: webdavUrl.trim() || undefined,
          webdavUsername: webdavUsername.trim() || undefined,
          webdavPassword: webdavPassword.trim() || undefined,
          webdavRemotePath: webdavRemotePath.trim() || undefined,
        });
      } else {
        await SyncProjectService.createProject({
          name,
          alias: alias.trim() || undefined,
          sourcePath,
          description,
          compress,
          webdavSourceId: webdavSourceId || undefined,
          webdavUrl: webdavUrl.trim() || undefined,
          webdavUsername: webdavUsername.trim() || undefined,
          webdavPassword: webdavPassword.trim() || undefined,
          webdavRemotePath: webdavRemotePath.trim() || undefined,
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save project:", error);
      alert("保存失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        label="项目名称"
        placeholder="例如：工作文档、个人照片"
        value={name}
        onValueChange={setName}
        isRequired
        description="项目的完整名称"
      />
      <Input
        label="别名（可选）"
        placeholder="例如：文档、照片"
        value={alias}
        onValueChange={setAlias}
        description="简短别名，方便快速识别"
      />
      <div>
        <Input
          label="源文件路径（文件或目录）"
          placeholder="选择要同步的文件或目录"
          value={sourcePath}
          onValueChange={setSourcePath}
          isRequired
          description="可以是单个文件或整个目录"
          endContent={
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={handleSelectPath}
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
          }
        />
      </div>
      <Textarea
        label="描述"
        placeholder="可选：添加一些描述信息"
        value={description}
        onValueChange={setDescription}
        minRows={2}
      />
      <Switch isSelected={enabled} onValueChange={setEnabled}>
        启用自动备份
      </Switch>
      <Switch isSelected={compress} onValueChange={setCompress}>
        压缩备份
      </Switch>
      <div className="text-xs text-gray-500 -mt-2 ml-6">
        开启后将备份压缩为 ZIP 文件，节省空间；关闭后直接同步文件夹，便于在服务器上直接查看
      </div>
      
      <Divider className="my-4" />
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Cloud className="w-4 h-4" />
          <span>WebDAV 云端同步（可选）</span>
        </div>
        {webdavSources.length > 0 && (
          <Select
            label="选择 WebDAV 源"
            placeholder="选择已配置的 WebDAV 源或手动输入"
            selectedKeys={webdavSourceId ? [webdavSourceId] : []}
            onSelectionChange={(keys) => {
              const selectedId = Array.from(keys)[0] as string;
              setWebdavSourceId(selectedId || "");
              if (!selectedId) {
                // 清空手动输入
                setWebdavUrl("");
                setWebdavUsername("");
                setWebdavPassword("");
                setWebdavRemotePath("");
              }
            }}
            variant="bordered"
            classNames={{
              base: "w-full",
              trigger: "border-[#d2d2d7] hover:border-[#86868b] bg-white",
              label: "text-[#1d1d1f] font-medium text-sm",
            }}
          >
            {[
              <SelectItem key="none">
                不使用 WebDAV
              </SelectItem>,
              ...webdavSources.map((source) => (
                <SelectItem key={source.id}>
                  {source.name} ({source.url})
                </SelectItem>
              ))
            ]}
          </Select>
        )}
        <Input
          label="WebDAV URL"
          placeholder="https://example.com/webdav"
          value={webdavUrl}
          onValueChange={setWebdavUrl}
          description="WebDAV 服务器地址（如果选择了源，将自动填充）"
          variant="bordered"
          isDisabled={!!webdavSourceId}
          classNames={{
            base: "w-full",
            input: "text-[#1d1d1f]",
            inputWrapper: "border-[#d2d2d7] hover:border-[#86868b] bg-white",
            label: "text-[#1d1d1f] font-medium text-sm",
            description: "text-[#86868b] text-xs",
          }}
        />
        <Input
          label="用户名"
          placeholder="WebDAV 用户名"
          value={webdavUsername}
          onValueChange={setWebdavUsername}
          variant="bordered"
          isDisabled={!!webdavSourceId}
          classNames={{
            base: "w-full",
            input: "text-[#1d1d1f]",
            inputWrapper: "border-[#d2d2d7] hover:border-[#86868b] bg-white",
            label: "text-[#1d1d1f] font-medium text-sm",
          }}
        />
        <Input
          label="密码"
          type="password"
          placeholder="WebDAV 密码"
          value={webdavPassword}
          onValueChange={setWebdavPassword}
          variant="bordered"
          isDisabled={!!webdavSourceId}
          classNames={{
            base: "w-full",
            input: "text-[#1d1d1f]",
            inputWrapper: "border-[#d2d2d7] hover:border-[#86868b] bg-white",
            label: "text-[#1d1d1f] font-medium text-sm",
          }}
        />
        <Input
          label="远程路径（文件夹）"
          placeholder="例如：/backups/project1 或 backups/my-project"
          value={webdavRemotePath}
          onValueChange={setWebdavRemotePath}
          description="指定备份存储的 WebDAV 文件夹路径，如果不存在会自动创建。留空则使用项目ID作为文件夹名"
          variant="bordered"
          classNames={{
            base: "w-full",
            input: "text-[#1d1d1f]",
            inputWrapper: "border-[#d2d2d7] hover:border-[#86868b] bg-white",
            label: "text-[#1d1d1f] font-medium text-sm",
            description: "text-[#86868b] text-xs",
          }}
        />
      </div>
      
      <div className="flex justify-end gap-3 pt-6">
        <button
          onClick={() => onSuccess()}
          className="px-5 py-2.5 rounded-xl font-medium text-[15px] text-[#007AFF] hover:bg-[#007AFF]/10 active:bg-[#007AFF]/20 transition-colors duration-200"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-5 py-2.5 bg-[#007AFF] text-white rounded-xl font-medium text-[15px] hover:bg-[#0051D5] active:bg-[#0040B3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 apple-shadow"
        >
          {isSubmitting ? "处理中..." : project ? "保存" : "创建"}
        </button>
      </div>
    </div>
  );
}
