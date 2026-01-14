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
import { useGameSaveStore } from "../stores/gameSaveStore";
import { GameSaveService } from "../services/gameSaveService";
import { GameSave } from "../types";
import { format } from "date-fns";
import { GameSaveForm } from "./GameSaveForm";
import { BackupHistory } from "./BackupHistory";

export function GameSaveManager() {
  const {
    gameSaves,
    setGameSaves,
    selectedGameSave,
    setSelectedGameSave,
  } = useGameSaveStore();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingSave, setEditingSave] = useState<GameSave | null>(null);

  useEffect(() => {
    loadGameSaves();
  }, []);

  const loadGameSaves = async () => {
    try {
      const saves = await GameSaveService.listGameSaves();
      setGameSaves(saves);
    } catch (error) {
      console.error("Failed to load game saves:", error);
    }
  };

  const handleCreate = () => {
    setEditingSave(null);
    onOpen();
  };

  const handleEdit = (save: GameSave) => {
    setEditingSave(save);
    onOpen();
  };

  const handleDelete = async (id: string) => {
    if (confirm("确定要删除这个游戏存档配置吗？")) {
      try {
        await GameSaveService.deleteGameSave(id);
        await loadGameSaves();
      } catch (error) {
        console.error("Failed to delete game save:", error);
      }
    }
  };

  const handleBackup = async (save: GameSave) => {
    try {
      await GameSaveService.createBackup(save.id);
      await loadGameSaves();
    } catch (error) {
      console.error("Failed to create backup:", error);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">游戏存档管理</h2>
          <p className="text-default-500 mt-1">
            管理你的游戏存档配置和备份
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="w-5 h-5" />}
          onPress={handleCreate}
        >
          添加游戏存档
        </Button>
      </div>

      {gameSaves.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-default-300 mx-auto mb-4" />
            <p className="text-default-500 text-lg mb-4">
              还没有添加任何游戏存档
            </p>
            <Button color="primary" onPress={handleCreate}>
              添加第一个游戏存档
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gameSaves.map((save) => (
            <Card key={save.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {save.alias || save.name}
                    </h3>
                    {save.alias && (
                      <span className="text-xs text-default-400">
                        ({save.name})
                      </span>
                    )}
                  </div>
                  {save.description && (
                    <p className="text-sm text-default-500 mt-1">
                      {save.description}
                    </p>
                  )}
                </div>
                <Dropdown>
                  <DropdownTrigger>
                    <Button isIconOnly variant="light" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="Actions">
                    <DropdownItem
                      key="edit"
                      onPress={() => handleEdit(save)}
                    >
                      编辑
                    </DropdownItem>
                    <DropdownItem
                      key="backup"
                      onPress={() => handleBackup(save)}
                    >
                      创建备份
                    </DropdownItem>
                    <DropdownItem
                      key="history"
                      onPress={() => setSelectedGameSave(save)}
                    >
                      查看备份历史
                    </DropdownItem>
                    <DropdownItem
                      key="delete"
                      className="text-danger"
                      color="danger"
                      onPress={() => handleDelete(save.id)}
                    >
                      删除
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-default-600">
                    <FolderOpen className="w-4 h-4" />
                    <span className="truncate">{save.savePath}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Chip
                      size="sm"
                      variant={save.enabled ? "solid" : "flat"}
                      color={save.enabled ? "success" : "default"}
                    >
                      {save.enabled ? "已启用" : "已禁用"}
                    </Chip>
                    <div className="flex gap-2 text-xs text-default-500">
                      {save.localBackupCount !== undefined && save.localBackupCount > 0 && (
                        <span>本地: {save.localBackupCount}</span>
                      )}
                      {save.cloudBackupCount !== undefined && save.cloudBackupCount > 0 && (
                        <span>云端: {save.cloudBackupCount}</span>
                      )}
                      {(!save.localBackupCount || save.localBackupCount === 0) && 
                       (!save.cloudBackupCount || save.cloudBackupCount === 0) && (
                        <span>总计: {save.backupCount}</span>
                      )}
                    </div>
                  </div>
                  {save.lastBackup && (
                    <div className="flex items-center gap-2 text-xs text-default-500">
                      <Clock className="w-3 h-3" />
                      <span>
                        最后备份: {format(save.lastBackup, "yyyy-MM-dd HH:mm")}
                      </span>
                    </div>
                  )}
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    className="w-full"
                    onPress={() => handleBackup(save)}
                  >
                    立即备份
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            {editingSave ? "编辑游戏存档" : "添加游戏存档"}
          </ModalHeader>
          <ModalBody>
            <GameSaveForm
              gameSave={editingSave}
              onSuccess={() => {
                onClose();
                loadGameSaves();
              }}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {selectedGameSave && (
        <BackupHistory
          gameSave={selectedGameSave}
          onClose={() => setSelectedGameSave(null)}
        />
      )}
    </div>
  );
}
