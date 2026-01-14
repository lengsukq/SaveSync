import { useState, useEffect } from "react";
import { Button, Input, Textarea, Switch, Divider } from "@heroui/react";
import { FolderOpen, Cloud } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { GameSaveService } from "../services/gameSaveService";
import { GameSave } from "../types";

interface GameSaveFormProps {
  gameSave?: GameSave | null;
  onSuccess: () => void;
}

export function GameSaveForm({ gameSave, onSuccess }: GameSaveFormProps) {
  const [name, setName] = useState("");
  const [savePath, setSavePath] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [webdavUrl, setWebdavUrl] = useState("");
  const [webdavUsername, setWebdavUsername] = useState("");
  const [webdavPassword, setWebdavPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (gameSave) {
      setName(gameSave.name);
      setSavePath(gameSave.savePath);
      setDescription(gameSave.description || "");
      setEnabled(gameSave.enabled);
      setWebdavUrl(gameSave.webdavUrl || "");
      setWebdavUsername(gameSave.webdavUsername || "");
      setWebdavPassword(gameSave.webdavPassword || "");
    }
  }, [gameSave]);

  const handleSelectPath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择游戏存档目录",
      });
      if (selected && typeof selected === "string") {
        setSavePath(selected);
      }
    } catch (error) {
      console.error("Failed to select path:", error);
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
          savePath,
          description,
          enabled,
          webdavUrl: webdavUrl.trim() || undefined,
          webdavUsername: webdavUsername.trim() || undefined,
          webdavPassword: webdavPassword.trim() || undefined,
        });
      } else {
        await GameSaveService.createGameSave({
          name,
          savePath,
          description,
          webdavUrl: webdavUrl.trim() || undefined,
          webdavUsername: webdavUsername.trim() || undefined,
          webdavPassword: webdavPassword.trim() || undefined,
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
        label="游戏名称"
        placeholder="例如：我的世界"
        value={name}
        onValueChange={setName}
        isRequired
      />
      <div>
        <Input
          label="存档路径"
          placeholder="选择游戏存档目录"
          value={savePath}
          onValueChange={setSavePath}
          isRequired
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
          description="配置后备份将自动上传到云端"
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
