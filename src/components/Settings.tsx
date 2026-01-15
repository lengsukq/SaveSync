import { useEffect, useState } from "react";
import { Input, Button, Divider, Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/react";
import { Cloud, FolderOpen, Save, CheckCircle2, HardDrive, Plus, Trash2, Edit2, Wifi, WifiOff, Folder, ChevronRight, Loader2 } from "lucide-react";
import { SettingsService } from "../services/settingsService";
import { AppSettings, WebDAVSource } from "../types";
import "../types/electron.d";

export function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    backupDirectory: "",
    defaultMaxBackups: 10,
    defaultBackupInterval: 60,
    theme: 'system',
    webdavSources: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // WebDAV 源编辑状态
  const [editingSource, setEditingSource] = useState<WebDAVSource | null>(null);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [sourceForm, setSourceForm] = useState<Omit<WebDAVSource, 'id'>>({
    name: "",
    url: "",
    username: "",
    password: "",
    defaultRemotePath: "",
  });
  
  // WebDAV 连接测试状态
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // WebDAV 目录浏览器状态
  const [isDirectoryBrowserOpen, setIsDirectoryBrowserOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [directoryItems, setDirectoryItems] = useState<Array<{ path: string; name: string; is_directory: boolean }>>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await SettingsService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBackupDirectory = async () => {
    try {
      if (typeof window === 'undefined' || !window.electronAPI) {
        alert("Electron API 不可用，请确保在 Electron 环境中运行");
        return;
      }
      
      const result = await window.electronAPI.showOpenDialog({
        properties: ['openDirectory'],
        title: "选择备份目录",
      });
      
      if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
        setSettings({ ...settings, backupDirectory: result.filePaths[0] });
      }
    } catch (error) {
      console.error("Failed to select directory:", error);
      alert(`选择目录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await SettingsService.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  // WebDAV 源管理
  const handleAddSource = () => {
    setEditingSource(null);
    setSourceForm({
      name: "",
      url: "",
      username: "",
      password: "",
      defaultRemotePath: "",
    });
    setIsSourceModalOpen(true);
  };

  const handleEditSource = (source: WebDAVSource) => {
    setEditingSource(source);
    setSourceForm({
      name: source.name,
      url: source.url,
      username: source.username,
      password: source.password,
      defaultRemotePath: source.defaultRemotePath || "",
    });
    setIsSourceModalOpen(true);
  };

  const handleDeleteSource = (id: string) => {
    if (confirm("确定要删除这个 WebDAV 源吗？")) {
      setSettings({
        ...settings,
        webdavSources: settings.webdavSources.filter(s => s.id !== id),
      });
    }
  };

  const handleTestConnection = async () => {
    if (!sourceForm.url.trim() || !sourceForm.username.trim() || !sourceForm.password.trim()) {
      alert("请先填写 URL、用户名和密码");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      if (typeof window === 'undefined' || !window.electronAPI) {
        throw new Error("Electron API 不可用，请确保在 Electron 环境中运行");
      }

      if (typeof window.electronAPI.testWebDAVConnection !== 'function') {
        throw new Error("testWebDAVConnection 函数不可用，请重启应用以加载最新的 preload 脚本");
      }

      const result = await window.electronAPI.testWebDAVConnection(
        sourceForm.url.trim(),
        sourceForm.username.trim(),
        sourceForm.password.trim()
      );

      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '测试失败：未知错误'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSource = () => {
    if (!sourceForm.name.trim() || !sourceForm.url.trim() || !sourceForm.username.trim()) {
      alert("请填写名称、URL 和用户名");
      return;
    }

    if (editingSource) {
      // 更新现有源
      setSettings({
        ...settings,
        webdavSources: settings.webdavSources.map(s =>
          s.id === editingSource.id
            ? { ...editingSource, ...sourceForm }
            : s
        ),
      });
    } else {
      // 添加新源
      const newSource: WebDAVSource = {
        id: `webdav-${Date.now()}`,
        ...sourceForm,
        defaultRemotePath: sourceForm.defaultRemotePath || undefined,
      };
      setSettings({
        ...settings,
        webdavSources: [...settings.webdavSources, newSource],
      });
    }
    setIsSourceModalOpen(false);
    setEditingSource(null);
    setTestResult(null);
  };

  const handleCloseSourceModal = () => {
    setIsSourceModalOpen(false);
    setEditingSource(null);
    setTestResult(null);
    setSourceForm({
      name: "",
      url: "",
      username: "",
      password: "",
      defaultRemotePath: "",
    });
  };

  const handleOpenDirectoryBrowser = async () => {
    if (!sourceForm.url.trim() || !sourceForm.username.trim() || !sourceForm.password.trim()) {
      alert("请先填写 URL、用户名和密码");
      return;
    }

    setIsDirectoryBrowserOpen(true);
    setCurrentPath('/');
    await loadDirectory('/');
  };

  const loadDirectory = async (path: string) => {
    setIsLoadingDirectory(true);
    setDirectoryError(null);

    try {
      if (typeof window === 'undefined' || !window.electronAPI) {
        throw new Error("Electron API 不可用");
      }

      if (typeof window.electronAPI.listWebDAVDirectory !== 'function') {
        throw new Error("listWebDAVDirectory 函数不可用，请重启应用");
      }

      const items = await window.electronAPI.listWebDAVDirectory(
        sourceForm.url.trim(),
        sourceForm.username.trim(),
        sourceForm.password.trim(),
        path
      );

      setDirectoryItems(items);
      setCurrentPath(path);
    } catch (error) {
      setDirectoryError(error instanceof Error ? error.message : '加载目录失败');
      setDirectoryItems([]);
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  const handleSelectDirectory = (path: string) => {
    // 移除末尾的斜杠（如果有）
    const normalizedPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
    setSourceForm({ ...sourceForm, defaultRemotePath: normalizedPath });
    setIsDirectoryBrowserOpen(false);
  };

  const handleNavigateToDirectory = (path: string) => {
    loadDirectory(path);
  };

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <p className="text-[#86868b] text-lg font-medium">加载设置中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* 标题区域 */}
      <div>
        <h2 className="text-4xl font-semibold text-[#1d1d1f] tracking-tight mb-2">设置</h2>
        <p className="text-[#86868b] text-[15px] font-medium">
          配置应用默认设置和 WebDAV 连接
        </p>
      </div>

      {/* 备份设置区域 */}
      <div className="glass rounded-2xl p-6 apple-shadow border border-[#d2d2d7]/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#0051D5] flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#1d1d1f]">备份设置</h3>
            <p className="text-sm text-[#86868b] font-medium mt-0.5">
              配置本地备份的默认行为
            </p>
          </div>
        </div>

        <Divider className="mb-6" />

        <div className="space-y-5">
          <Input
            label="备份目录"
            placeholder="选择备份存储目录"
            value={settings.backupDirectory}
            onValueChange={(value) => setSettings({ ...settings, backupDirectory: value })}
            description="本地备份文件的存储位置"
            variant="bordered"
            endContent={
              <button
                onClick={handleSelectBackupDirectory}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#00000008] active:bg-[#00000012] transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-[#007AFF]" />
              </button>
            }
            classNames={{
              base: "w-full",
              input: "text-[#1d1d1f]",
              inputWrapper: "border-[#d2d2d7] hover:border-[#86868b] bg-white",
              label: "text-[#1d1d1f] font-medium text-sm",
              description: "text-[#86868b] text-xs",
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="默认最大备份数量"
              type="number"
              placeholder="例如：10"
              value={settings.defaultMaxBackups.toString()}
              onValueChange={(value) => setSettings({ ...settings, defaultMaxBackups: parseInt(value) || 10 })}
              description="每个项目保留的最大备份数量"
              variant="bordered"
              classNames={{
                base: "w-full",
                input: "text-[#1d1d1f]",
                inputWrapper: "border-[#d2d2d7] hover:border-[#86868b] bg-white",
                label: "text-[#1d1d1f] font-medium text-sm",
                description: "text-[#86868b] text-xs",
              }}
            />
            <Input
              label="默认备份间隔（分钟）"
              type="number"
              placeholder="例如：60"
              value={settings.defaultBackupInterval.toString()}
              onValueChange={(value) => setSettings({ ...settings, defaultBackupInterval: parseInt(value) || 60 })}
              description="自动备份的时间间隔"
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
        </div>
      </div>

      {/* WebDAV 设置区域 */}
      <div className="glass rounded-2xl p-6 apple-shadow border border-[#d2d2d7]/30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#34C759] to-[#28A745] flex items-center justify-center">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-[#1d1d1f]">WebDAV 云端配置</h3>
              <p className="text-sm text-[#86868b] font-medium mt-0.5">
                管理多个 WebDAV 服务器，在创建项目时可以选择
              </p>
            </div>
          </div>
          <Button
            onPress={handleAddSource}
            startContent={<Plus className="w-4 h-4" />}
            className="px-4 py-2 bg-[#007AFF] text-white rounded-xl font-medium text-sm hover:bg-[#0051D5] active:bg-[#0040B3] transition-colors duration-200 apple-shadow"
          >
            添加源
          </Button>
        </div>

        <Divider className="mb-6" />

        {settings.webdavSources.length === 0 ? (
          <div className="text-center py-12">
            <Cloud className="w-16 h-16 text-[#d2d2d7] mx-auto mb-4" />
            <p className="text-[#86868b] text-sm font-medium mb-4">还没有添加任何 WebDAV 源</p>
            <Button
              onPress={handleAddSource}
              startContent={<Plus className="w-4 h-4" />}
              className="px-4 py-2 bg-[#007AFF] text-white rounded-xl font-medium text-sm hover:bg-[#0051D5] active:bg-[#0040B3] transition-colors duration-200 apple-shadow"
            >
              添加第一个 WebDAV 源
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {settings.webdavSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-4 rounded-xl border border-[#d2d2d7]/30 bg-white/50 hover:bg-white/80 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-base font-semibold text-[#1d1d1f]">{source.name}</h4>
                    <span className="text-xs text-[#86868b] font-medium px-2 py-1 bg-[#007AFF]/10 text-[#007AFF] rounded-lg">
                      {source.url}
                    </span>
                  </div>
                  <div className="text-sm text-[#86868b] font-medium">
                    <span>用户: {source.username}</span>
                    {source.defaultRemotePath && (
                      <span className="ml-4">路径: {source.defaultRemotePath}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditSource(source)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#00000008] active:bg-[#00000012] transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-[#007AFF]" />
                  </button>
                  <button
                    onClick={() => handleDeleteSource(source.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FF3B30]/10 active:bg-[#FF3B30]/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-[#FF3B30]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WebDAV 源编辑 Modal */}
      <Modal
        isOpen={isSourceModalOpen}
        onClose={handleCloseSourceModal}
        size="2xl"
        scrollBehavior="inside"
        placement="center"
        backdrop="blur"
        classNames={{
          base: "bg-white/80 backdrop-blur-xl",
          header: "border-b border-[#d2d2d7]/50",
          body: "py-6",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-xl font-semibold text-[#1d1d1f]">
            {editingSource ? "编辑 WebDAV 源" : "添加 WebDAV 源"}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="名称"
                placeholder="例如：公司服务器、个人 NAS"
                value={sourceForm.name}
                onValueChange={(value) => setSourceForm({ ...sourceForm, name: value })}
                description="用于识别此 WebDAV 源的名称"
                variant="bordered"
                isRequired
                classNames={{
                  base: "w-full",
                  input: "text-[#1d1d1f]",
                  inputWrapper: "border-[#d2d2d7] hover:border-[#86868b] bg-white",
                  label: "text-[#1d1d1f] font-medium text-sm",
                  description: "text-[#86868b] text-xs",
                }}
              />
              <Input
                label="WebDAV URL"
                placeholder="https://example.com/webdav"
                value={sourceForm.url}
                onValueChange={(value) => {
                  setSourceForm({ ...sourceForm, url: value });
                  setTestResult(null); // 清除测试结果
                }}
                description="WebDAV 服务器地址"
                variant="bordered"
                isRequired
                classNames={{
                  base: "w-full",
                  input: "text-[#1d1d1f]",
                  inputWrapper: "border-[#d2d2d7] hover:border-[#86868b] bg-white",
                  label: "text-[#1d1d1f] font-medium text-sm",
                  description: "text-[#86868b] text-xs",
                }}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="用户名"
                  placeholder="WebDAV 用户名"
                  value={sourceForm.username}
                  onValueChange={(value) => {
                    setSourceForm({ ...sourceForm, username: value });
                    setTestResult(null); // 清除测试结果
                  }}
                  variant="bordered"
                  isRequired
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
                  value={sourceForm.password}
                  onValueChange={(value) => {
                    setSourceForm({ ...sourceForm, password: value });
                    setTestResult(null); // 清除测试结果
                  }}
                  variant="bordered"
                  isRequired
                  classNames={{
                    base: "w-full",
                    input: "text-[#1d1d1f]",
                    inputWrapper: "border-[#d2d2d7] hover:border-[#86868b] bg-white",
                    label: "text-[#1d1d1f] font-medium text-sm",
                  }}
                />
              </div>
              
              {/* 连接测试区域 */}
              <div className="flex items-start gap-3 p-4 rounded-xl border border-[#d2d2d7]/30 bg-white/50">
                <Button
                  onPress={handleTestConnection}
                  isLoading={isTesting}
                  disabled={isTesting || !sourceForm.url.trim() || !sourceForm.username.trim() || !sourceForm.password.trim()}
                  startContent={!isTesting && <Wifi className="w-4 h-4" />}
                  className="px-4 py-2 bg-[#34C759] text-white rounded-xl font-medium text-sm hover:bg-[#28A745] active:bg-[#1E7E34] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isTesting ? "测试中..." : "测试连接"}
                </Button>
                <div className="flex-1">
                  {testResult && (
                    <div className={`flex items-start gap-2 ${testResult.success ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                      {testResult.success ? (
                        <Wifi className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      ) : (
                        <WifiOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${testResult.success ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                          {testResult.message}
                        </p>
                      </div>
                    </div>
                  )}
                  {!testResult && !isTesting && (
                    <p className="text-xs text-[#86868b] font-medium">
                      填写 URL、用户名和密码后，点击"测试连接"验证配置是否正确
                    </p>
                  )}
                </div>
              </div>

              <Input
                label="默认远程路径（可选）"
                placeholder="例如：/backups 或 backups/"
                value={sourceForm.defaultRemotePath}
                onValueChange={(value) => setSourceForm({ ...sourceForm, defaultRemotePath: value })}
                description="新项目使用此源时的默认文件夹路径，可在项目设置中覆盖"
                variant="bordered"
                endContent={
                  <button
                    onClick={handleOpenDirectoryBrowser}
                    disabled={!sourceForm.url.trim() || !sourceForm.username.trim() || !sourceForm.password.trim()}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#00000008] active:bg-[#00000012] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="从 WebDAV 选择路径"
                  >
                    <Folder className="w-4 h-4 text-[#007AFF]" />
                  </button>
                }
                classNames={{
                  base: "w-full",
                  input: "text-[#1d1d1f]",
                  inputWrapper: "border-[#d2d2d7] hover:border-[#86868b] bg-white",
                  label: "text-[#1d1d1f] font-medium text-sm",
                  description: "text-[#86868b] text-xs",
                }}
              />
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  onPress={handleCloseSourceModal}
                  variant="light"
                  className="px-5 py-2.5 rounded-xl font-medium text-[15px] text-[#007AFF] hover:bg-[#007AFF]/10 active:bg-[#007AFF]/20 transition-colors duration-200"
                >
                  取消
                </Button>
                <Button
                  onPress={handleSaveSource}
                  className="px-5 py-2.5 bg-[#007AFF] text-white rounded-xl font-medium text-[15px] hover:bg-[#0051D5] active:bg-[#0040B3] transition-colors duration-200 apple-shadow"
                >
                  {editingSource ? "保存" : "添加"}
                </Button>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* WebDAV 目录浏览器 Modal */}
      <Modal
        isOpen={isDirectoryBrowserOpen}
        onClose={() => setIsDirectoryBrowserOpen(false)}
        size="2xl"
        scrollBehavior="inside"
        placement="center"
        backdrop="blur"
        classNames={{
          base: "bg-white/80 backdrop-blur-xl",
          header: "border-b border-[#d2d2d7]/50",
          body: "py-6",
        }}
      >
        <ModalContent>
          <ModalHeader className="text-xl font-semibold text-[#1d1d1f]">
            选择 WebDAV 路径
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {/* 当前路径显示 */}
              <div className="flex items-center gap-2 text-sm text-[#86868b] font-medium">
                <span>当前路径：</span>
                <span className="text-[#1d1d1f] font-semibold">{currentPath}</span>
              </div>

              {/* 目录列表 */}
              <div className="border border-[#d2d2d7]/30 rounded-xl overflow-hidden bg-white/50 max-h-96 overflow-y-auto">
                {isLoadingDirectory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-[#007AFF] animate-spin" />
                    <span className="ml-3 text-[#86868b] text-sm font-medium">加载中...</span>
                  </div>
                ) : directoryError ? (
                  <div className="p-6 text-center">
                    <p className="text-[#FF3B30] text-sm font-medium">{directoryError}</p>
                  </div>
                ) : directoryItems.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-[#86868b] text-sm font-medium">此目录为空</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#d2d2d7]/30">
                    {directoryItems.map((item) => (
                      <div
                        key={item.path}
                        className="flex items-center justify-between p-3 hover:bg-[#00000008] transition-colors cursor-pointer"
                        onClick={() => {
                          if (item.is_directory) {
                            handleNavigateToDirectory(item.path);
                          } else {
                            // 文件也可以选择，选择其父目录
                            const parentPath = item.path.split('/').slice(0, -1).join('/') || '/';
                            handleSelectDirectory(parentPath);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {item.is_directory ? (
                            <Folder className="w-5 h-5 text-[#007AFF]" />
                          ) : (
                            <div className="w-5 h-5" />
                          )}
                          <span className="text-[#1d1d1f] font-medium text-sm">{item.name}</span>
                          {item.is_directory && (
                            <span className="text-xs text-[#86868b] font-medium">目录</span>
                          )}
                        </div>
                        {item.is_directory && (
                          <ChevronRight className="w-4 h-4 text-[#86868b]" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex justify-between items-center pt-4">
                <Button
                  onPress={() => {
                    if (currentPath !== '/') {
                      const parentPath = currentPath.split('/').slice(0, -2).join('/') || '/';
                      loadDirectory(parentPath);
                    }
                  }}
                  disabled={currentPath === '/'}
                  variant="light"
                  className="px-4 py-2 rounded-xl font-medium text-sm text-[#007AFF] hover:bg-[#007AFF]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  返回上级
                </Button>
                <div className="flex gap-3">
                  <Button
                    onPress={() => setIsDirectoryBrowserOpen(false)}
                    variant="light"
                    className="px-5 py-2.5 rounded-xl font-medium text-[15px] text-[#007AFF] hover:bg-[#007AFF]/10 active:bg-[#007AFF]/20 transition-colors duration-200"
                  >
                    取消
                  </Button>
                  <Button
                    onPress={() => handleSelectDirectory(currentPath)}
                    className="px-5 py-2.5 bg-[#007AFF] text-white rounded-xl font-medium text-[15px] hover:bg-[#0051D5] active:bg-[#0040B3] transition-colors duration-200 apple-shadow"
                  >
                    选择此路径
                  </Button>
                </div>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* 保存按钮区域 */}
      <div className="flex justify-end items-center gap-4 pt-4">
        {saveSuccess && (
          <div className="flex items-center gap-2 text-[#34C759] text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>设置已保存</span>
          </div>
        )}
        <Button
          onPress={handleSave}
          isLoading={isSaving}
          disabled={isSaving}
          startContent={!isSaving && <Save className="w-4 h-4" />}
          className="px-6 py-2.5 bg-[#007AFF] text-white rounded-xl font-medium text-[15px] hover:bg-[#0051D5] active:bg-[#0040B3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 apple-shadow"
        >
          {isSaving ? "保存中..." : "保存设置"}
        </Button>
      </div>
    </div>
  );
}
