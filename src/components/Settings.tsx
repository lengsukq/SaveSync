import { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  Input,
  Button,
} from "@heroui/react";
import { Cloud, FolderOpen, Save, CheckCircle2 } from "lucide-react";
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
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-semibold text-[#1d1d1f] tracking-tight mb-2">设置</h2>
        <p className="text-[#86868b] text-[15px] font-medium">
          配置应用默认设置和 WebDAV 连接
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 备份设置 */}
        <Card className="glass border border-[#d2d2d7]/30">
          <CardBody className="p-6">
            <h3 className="text-xl font-semibold text-[#1d1d1f] mb-6">备份设置</h3>
            <div className="space-y-4">
              <div>
                <Input
                  label="备份目录"
                  placeholder="选择备份存储目录"
                  value={settings.backupDirectory}
                  onValueChange={(value) => setSettings({ ...settings, backupDirectory: value })}
                  description="本地备份文件的存储位置"
                  endContent={
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={handleSelectBackupDirectory}
                    >
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                  }
                />
              </div>
              <Input
                label="默认最大备份数量"
                type="number"
                value={settings.defaultMaxBackups.toString()}
                onValueChange={(value) => setSettings({ ...settings, defaultMaxBackups: parseInt(value) || 10 })}
                description="每个项目保留的最大备份数量"
              />
              <Input
                label="默认备份间隔（分钟）"
                type="number"
                value={settings.defaultBackupInterval.toString()}
                onValueChange={(value) => setSettings({ ...settings, defaultBackupInterval: parseInt(value) || 60 })}
                description="自动备份的时间间隔"
              />
            </div>
          </CardBody>
        </Card>

        {/* WebDAV 设置 */}
        <Card className="glass border border-[#d2d2d7]/30">
          <CardBody className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Cloud className="w-5 h-5 text-[#007AFF]" />
              <h3 className="text-xl font-semibold text-[#1d1d1f]">WebDAV 配置</h3>
            </div>
            <p className="text-sm text-[#86868b] mb-4">
              配置默认的 WebDAV 服务器，这些设置将作为新项目的默认值
            </p>
            <div className="space-y-4">
              <Input
                label="WebDAV URL"
                placeholder="https://example.com/webdav"
                value={settings.defaultWebdavUrl || ""}
                onValueChange={(value) => setSettings({ ...settings, defaultWebdavUrl: value || undefined })}
                description="WebDAV 服务器地址"
              />
              <Input
                label="用户名"
                placeholder="WebDAV 用户名"
                value={settings.defaultWebdavUsername || ""}
                onValueChange={(value) => setSettings({ ...settings, defaultWebdavUsername: value || undefined })}
              />
              <Input
                label="密码"
                type="password"
                placeholder="WebDAV 密码"
                value={settings.defaultWebdavPassword || ""}
                onValueChange={(value) => setSettings({ ...settings, defaultWebdavPassword: value || undefined })}
              />
              <Input
                label="默认远程路径"
                placeholder="例如：/backups 或 backups"
                value={settings.defaultWebdavRemotePath || ""}
                onValueChange={(value) => setSettings({ ...settings, defaultWebdavRemotePath: value || undefined })}
                description="新项目的默认远程路径，可在项目设置中覆盖"
              />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button
          color="primary"
          size="lg"
          onPress={handleSave}
          isLoading={isSaving}
          startContent={saveSuccess ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
          className="px-8"
        >
          {saveSuccess ? "保存成功" : isSaving ? "保存中..." : "保存设置"}
        </Button>
      </div>
    </div>
  );
}
