import { useState, useEffect } from "react";
import { Button, Input, Textarea, Switch, Divider } from "@heroui/react";
import { FolderOpen, Cloud } from "lucide-react";
import { GameSaveService } from "../services/gameSaveService";
import { GameSave } from "../types";
import "../types/electron.d";

interface GameSaveFormProps {
  gameSave?: GameSave | null;
  onSuccess: () => void;
}

export function GameSaveForm({ gameSave, onSuccess }: GameSaveFormProps) {
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [savePath, setSavePath] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [webdavUrl, setWebdavUrl] = useState("");
  const [webdavUsername, setWebdavUsername] = useState("");
  const [webdavPassword, setWebdavPassword] = useState("");
  const [webdavRemotePath, setWebdavRemotePath] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (gameSave) {
      setName(gameSave.name);
      setAlias(gameSave.alias || "");
      setSavePath(gameSave.savePath);
      setDescription(gameSave.description || "");
      setEnabled(gameSave.enabled);
      setWebdavUrl(gameSave.webdavUrl || "");
      setWebdavUsername(gameSave.webdavUsername || "");
      setWebdavPassword(gameSave.webdavPassword || "");
      setWebdavRemotePath(gameSave.webdavRemotePath || "");
    }
  }, [gameSave]);

  const handleSelectPath = async () => {
    try {
      if (!window.electronAPI) {
        alert("Electron API 不可用");
        return;
      }
      const result = await window.electronAPI.showOpenDialog({
        properties: ['openFile', 'openDirectory'],
        title: "选择要备份的文件或目录",
      });
      if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
        setSavePath(result.filePaths[0]);
      }
    } catch (error) {
      console.error("Failed to select path:", error);
      alert("选择路径失败，请重试");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !savePath.trim()) {
      alert("请填写名称和存档路径");
      return;
    }

    setIsSubmitting(true);
    try {
      if (gameSave) {
        await GameSaveService.updateGameSave(gameSave.id, {
          name,
          alias: alias.trim() || undefined,
          savePath,
          description,
          enabled,
          webdavUrl: webdavUrl.trim() || undefined,
          webdavUsername: webdavUsername.trim() || undefined,
          webdavPassword: webdavPassword.trim() || undefined,
          webdavRemotePath: webdavRemotePath.trim() || undefined,
        });
      } else {
        await GameSaveService.createGameSave({
          name,
          alias: alias.trim() || undefined,
          savePath,
          description,
          webdavUrl: webdavUrl.trim() || undefined,
          webdavUsername: webdavUsername.trim() || undefined,
          webdavPassword: webdavPassword.trim() || undefined,
          webdavRemotePath: webdavRemotePath.trim() || undefined,
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save game save:", error);
      alert("保存失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        label="项目名称"
        placeholder="例如：我的世界"
        value={name}
        onValueChange={setName}
        isRequired
        description="项目的完整名称"
      />
      <Input
        label="别名（可选）"
        placeholder="例如：MC、GTA5"
        value={alias}
        onValueChange={setAlias}
        description="简短别名，方便快速识别"
      />
      <div>
        <Input
          label="备份地址（文件或目录路径）"
          placeholder="选择要备份的文件或目录"
          value={savePath}
          onValueChange={setSavePath}
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
      
      <Divider className="my-4" />
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Cloud className="w-4 h-4" />
          <span>WebDAV 云端同步（可选）</span>
        </div>
        <Input
          label="WebDAV URL"
          placeholder="https://example.com/webdav"
          value={webdavUrl}
          onValueChange={setWebdavUrl}
          description="WebDAV 服务器地址"
        />
        <Input
          label="用户名"
          placeholder="WebDAV 用户名"
          value={webdavUsername}
          onValueChange={setWebdavUsername}
        />
        <Input
          label="密码"
          type="password"
          placeholder="WebDAV 密码"
          value={webdavPassword}
          onValueChange={setWebdavPassword}
        />
        <Input
          label="远程路径（文件夹）"
          placeholder="例如：/backups/game1 或 backups/my-game"
          value={webdavRemotePath}
          onValueChange={setWebdavRemotePath}
          description="指定备份存储的 WebDAV 文件夹路径，如果不存在会自动创建。留空则使用项目ID作为文件夹名"
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="light" onPress={() => onSuccess()}>
          取消
        </Button>
        <Button
          color="primary"
          onPress={handleSubmit}
          isLoading={isSubmitting}
        >
          {gameSave ? "保存" : "创建"}
        </Button>
      </div>
    </div>
  );
}
