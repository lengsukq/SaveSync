import { useEffect, useState } from "react";
import { Input, Button, Divider } from "@heroui/react";
import { Cloud, FolderOpen, Save, CheckCircle2, HardDrive } from "lucide-react";
import { SettingsService } from "../services/settingsService";
import { AppSettings } from "../types";
import "../types/electron.d";

export function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    backupDirectory: "",
    defaultMaxBackups: 10,
    defaultBackupInterval: 60,
    theme: 'system',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      if (!window.electronAPI) {
        alert("Electron API 不可用");
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
      alert("选择目录失败，请重试");
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
          <div>
            <Input
              label="备份目录"
              placeholder="选择备份存储目录"
              value={settings.backupDirectory}
              onValueChange={(value) => setSettings({ ...settings, backupDirectory: value })}
              description="本地备份文件的存储位置"
              classNames={{
                base: "w-full",
                input: "text-[#1d1d1f]",
                label: "text-[#1d1d1f] font-medium",
                description: "text-[#86868b] text-xs",
              }}
              endContent={
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={handleSelectBackupDirectory}
                  className="min-w-8 w-8 h-8"
                >
                  <FolderOpen className="w-4 h-4 text-[#007AFF]" />
                </Button>
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="默认最大备份数量"
              type="number"
              placeholder="例如：10"
              value={settings.defaultMaxBackups.toString()}
              onValueChange={(value) => setSettings({ ...settings, defaultMaxBackups: parseInt(value) || 10 })}
              description="每个项目保留的最大备份数量"
              classNames={{
                base: "w-full",
                input: "text-[#1d1d1f]",
                label: "text-[#1d1d1f] font-medium",
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
              classNames={{
                base: "w-full",
                input: "text-[#1d1d1f]",
                label: "text-[#1d1d1f] font-medium",
                description: "text-[#86868b] text-xs",
              }}
            />
          </div>
        </div>
      </div>

      {/* WebDAV 设置区域 */}
      <div className="glass rounded-2xl p-6 apple-shadow border border-[#d2d2d7]/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#34C759] to-[#28A745] flex items-center justify-center">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#1d1d1f]">WebDAV 云端配置</h3>
            <p className="text-sm text-[#86868b] font-medium mt-0.5">
              配置默认的 WebDAV 服务器，这些设置将作为新项目的默认值
            </p>
          </div>
        </div>

        <Divider className="mb-6" />

        <div className="space-y-5">
          <Input
            label="WebDAV URL"
            placeholder="https://example.com/webdav"
            value={settings.defaultWebdavUrl || ""}
            onValueChange={(value) => setSettings({ ...settings, defaultWebdavUrl: value || undefined })}
            description="WebDAV 服务器地址"
            classNames={{
              base: "w-full",
              input: "text-[#1d1d1f]",
              label: "text-[#1d1d1f] font-medium",
              description: "text-[#86868b] text-xs",
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="用户名"
              placeholder="WebDAV 用户名"
              value={settings.defaultWebdavUsername || ""}
              onValueChange={(value) => setSettings({ ...settings, defaultWebdavUsername: value || undefined })}
              classNames={{
                base: "w-full",
                input: "text-[#1d1d1f]",
                label: "text-[#1d1d1f] font-medium",
              }}
            />
            <Input
              label="密码"
              type="password"
              placeholder="WebDAV 密码"
              value={settings.defaultWebdavPassword || ""}
              onValueChange={(value) => setSettings({ ...settings, defaultWebdavPassword: value || undefined })}
              classNames={{
                base: "w-full",
                input: "text-[#1d1d1f]",
                label: "text-[#1d1d1f] font-medium",
              }}
            />
          </div>

          <Input
            label="默认远程路径（文件夹）"
            placeholder="例如：/backups 或 backups/"
            value={settings.defaultWebdavRemotePath || ""}
            onValueChange={(value) => setSettings({ ...settings, defaultWebdavRemotePath: value || undefined })}
            description="新项目在 WebDAV 上备份的默认文件夹路径，可在项目设置中覆盖"
            classNames={{
              base: "w-full",
              input: "text-[#1d1d1f]",
              label: "text-[#1d1d1f] font-medium",
              description: "text-[#86868b] text-xs",
            }}
          />
        </div>
      </div>

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
