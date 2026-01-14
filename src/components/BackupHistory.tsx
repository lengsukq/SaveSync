import { useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { MoreVertical, Download, Trash2, HardDrive } from "lucide-react";
import { GameSaveService } from "../services/gameSaveService";
import { Backup, GameSave } from "../types";
import { format } from "date-fns";

interface BackupHistoryProps {
  gameSave: GameSave;
  onClose: () => void;
}

export function BackupHistory({ gameSave, onClose }: BackupHistoryProps) {
  const [backups, setBackups] = useState<Backup[]>([]);

  useEffect(() => {
    loadBackups();
  }, [gameSave.id]);

  const loadBackups = async () => {
    try {
      const data = await GameSaveService.listBackups(gameSave.id);
      setBackups(data);
    } catch (error) {
      console.error("Failed to load backups:", error);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (confirm("确定要恢复这个备份吗？当前存档将被覆盖。")) {
      try {
        await GameSaveService.restoreBackup(backupId);
        alert("恢复成功！");
        onClose();
      } catch (error) {
        console.error("Failed to restore backup:", error);
        alert("恢复失败，请重试");
      }
    }
  };

  const handleDelete = async (backupId: string) => {
    if (confirm("确定要删除这个备份吗？")) {
      try {
        await GameSaveService.deleteBackup(backupId);
        await loadBackups();
      } catch (error) {
        console.error("Failed to delete backup:", error);
        alert("删除失败，请重试");
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          <div>
            <h3 className="text-xl font-semibold">{gameSave.name} - 备份历史</h3>
            <p className="text-sm text-default-500 mt-1">
              共 {backups.length} 个备份
            </p>
          </div>
        </ModalHeader>
        <ModalBody>
          {backups.length === 0 ? (
            <div className="text-center py-12">
              <HardDrive className="w-16 h-16 text-default-300 mx-auto mb-4" />
              <p className="text-default-500">还没有备份记录</p>
            </div>
          ) : (
            <Table aria-label="备份历史">
              <TableHeader>
                <TableColumn>名称</TableColumn>
                <TableColumn>类型</TableColumn>
                <TableColumn>大小</TableColumn>
                <TableColumn>创建时间</TableColumn>
                <TableColumn>操作</TableColumn>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell>{backup.name}</TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={backup.type === "local" ? "primary" : "secondary"}
                      >
                        {backup.type === "local" ? "本地" : "云端"}
                      </Chip>
                    </TableCell>
                    <TableCell>{formatFileSize(backup.size)}</TableCell>
                    <TableCell>
                      {format(backup.createdAt, "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Dropdown>
                        <DropdownTrigger>
                          <Button isIconOnly variant="light" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu aria-label="Actions">
                          <DropdownItem
                            key="restore"
                            startContent={<Download className="w-4 h-4" />}
                            onPress={() => handleRestore(backup.id)}
                          >
                            恢复
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            startContent={<Trash2 className="w-4 h-4" />}
                            onPress={() => handleDelete(backup.id)}
                          >
                            删除
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
