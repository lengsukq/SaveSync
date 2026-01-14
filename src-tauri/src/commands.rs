use crate::models::{Backup, GameSave, GameSaveConfig};
use chrono::Utc;
use serde_json;
use std::fs;
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use uuid::Uuid;
use zip::write::FileOptions;
use zip::ZipWriter;

fn get_data_dir() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("SaveSync")
}

fn get_backup_dir() -> PathBuf {
    get_data_dir().join("backups")
}

fn get_temp_dir() -> PathBuf {
    get_data_dir().join("temp")
}

fn ensure_data_dir() -> std::io::Result<()> {
    let data_dir = get_data_dir();
    fs::create_dir_all(&data_dir)?;
    fs::create_dir_all(get_backup_dir())?;
    fs::create_dir_all(get_temp_dir())?;
    Ok(())
}

fn load_game_saves() -> Vec<GameSave> {
    let data_file = get_data_dir().join("game_saves.json");
    if data_file.exists() {
        if let Ok(content) = fs::read_to_string(&data_file) {
            if let Ok(saves) = serde_json::from_str::<Vec<GameSave>>(&content) {
                return saves;
            }
        }
    }
    Vec::new()
}

fn save_game_saves(saves: &[GameSave]) -> Result<(), String> {
    ensure_data_dir().map_err(|e| e.to_string())?;
    let data_file = get_data_dir().join("game_saves.json");
    let content = serde_json::to_string_pretty(saves).map_err(|e| e.to_string())?;
    fs::write(&data_file, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn load_backups() -> Vec<Backup> {
    let backup_file = get_data_dir().join("backups.json");
    if backup_file.exists() {
        if let Ok(content) = fs::read_to_string(&backup_file) {
            if let Ok(backups) = serde_json::from_str::<Vec<Backup>>(&content) {
                return backups;
            }
        }
    }
    Vec::new()
}

fn save_backups(backups: &[Backup]) -> Result<(), String> {
    ensure_data_dir().map_err(|e| e.to_string())?;
    let backup_file = get_data_dir().join("backups.json");
    let content = serde_json::to_string_pretty(backups).map_err(|e| e.to_string())?;
    fs::write(&backup_file, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn calculate_dir_size(path: &Path) -> u64 {
    let mut size = 0;
    if path.is_dir() {
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if entry_path.is_dir() {
                    size += calculate_dir_size(&entry_path);
                } else if let Ok(metadata) = entry_path.metadata() {
                    size += metadata.len();
                }
            }
        }
    } else if let Ok(metadata) = path.metadata() {
        size = metadata.len();
    }
    size
}

fn add_to_zip(
    zip: &mut ZipWriter<File>,
    path: &Path,
    name: &str,
    options: &FileOptions,
) -> Result<(), String> {
    if path.is_dir() {
        zip.add_directory(name, *options).map_err(|e| e.to_string())?;
        for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let entry_path = entry.path();
            let entry_name = entry.file_name();
            let entry_name_str = entry_name.to_string_lossy();
            let new_name = if name.is_empty() {
                entry_name_str.to_string()
            } else {
                format!("{}/{}", name, entry_name_str)
            };
            add_to_zip(zip, &entry_path, &new_name, options)?;
        }
    } else {
        let mut file = File::open(path).map_err(|e| e.to_string())?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
        zip.start_file(name, *options).map_err(|e| e.to_string())?;
        zip.write_all(&buffer).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn zip_directory(source: &Path, zip_path: &Path) -> Result<u64, String> {
    let file = File::create(zip_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    if source.is_dir() {
        add_to_zip(&mut zip, source, "", &options)?;
    } else {
        let file_name = source
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("file");
        add_to_zip(&mut zip, source, file_name, &options)?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    let size = zip_path.metadata().map_err(|e| e.to_string())?.len();
    Ok(size)
}

fn unzip_file(zip_path: &Path, dest_dir: &Path) -> Result<(), String> {
    fs::create_dir_all(dest_dir).map_err(|e| e.to_string())?;

    let file = File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match file.enclosed_name() {
            Some(path) => dest_dir.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(p).map_err(|e| e.to_string())?;
                }
            }
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn upload_to_webdav(
    file_path: &Path,
    url: &str,
    username: &str,
    password: &str,
    remote_path: &str,
) -> Result<(), String> {
    let file = File::open(file_path).map_err(|e| e.to_string())?;
    let mut file_data = Vec::new();
    std::io::Read::read_to_end(&mut std::io::BufReader::new(file), &mut file_data)
        .map_err(|e| e.to_string())?;

    let full_url = if url.ends_with('/') {
        format!("{}{}", url, remote_path)
    } else {
        format!("{}/{}", url, remote_path)
    };

    let client = reqwest::blocking::Client::new();
    let response = client
        .put(&full_url)
        .basic_auth(username, Some(password))
        .body(file_data)
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("WebDAV upload failed: {}", response.status()));
    }

    Ok(())
}

fn download_from_webdav(
    url: &str,
    username: &str,
    password: &str,
    remote_path: &str,
    local_path: &Path,
) -> Result<(), String> {
    let full_url = if url.ends_with('/') {
        format!("{}{}", url, remote_path)
    } else {
        format!("{}/{}", url, remote_path)
    };

    let client = reqwest::blocking::Client::new();
    let response = client
        .get(&full_url)
        .basic_auth(username, Some(password))
        .send()
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("WebDAV download failed: {}", response.status()));
    }

    let mut file = File::create(local_path).map_err(|e| e.to_string())?;
    let mut content = std::io::Cursor::new(response.bytes().map_err(|e| e.to_string())?);
    std::io::copy(&mut content, &mut file).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn list_game_saves() -> Result<Vec<GameSave>, String> {
    Ok(load_game_saves())
}

#[tauri::command]
pub fn create_game_save(config: GameSaveConfig) -> Result<GameSave, String> {
    let mut saves = load_game_saves();

    let game_save = GameSave {
        id: Uuid::new_v4().to_string(),
        name: config.name,
        save_path: config.save_path,
        description: config.description,
        enabled: true,
        last_backup: None,
        last_sync: None,
        backup_count: 0,
        created_at: Utc::now(),
        updated_at: Utc::now(),
        webdav_url: config.webdav_url,
        webdav_username: config.webdav_username,
        webdav_password: config.webdav_password,
    };

    saves.push(game_save.clone());
    save_game_saves(&saves)?;

    Ok(game_save)
}

#[tauri::command]
pub fn update_game_save(
    id: String,
    updates: serde_json::Value,
) -> Result<GameSave, String> {
    let mut saves = load_game_saves();

    let save = saves
        .iter_mut()
        .find(|s| s.id == id)
        .ok_or_else(|| "Game save not found".to_string())?;

    if let Some(name) = updates.get("name").and_then(|v| v.as_str()) {
        save.name = name.to_string();
    }
    if let Some(save_path) = updates.get("savePath").and_then(|v| v.as_str()) {
        save.save_path = save_path.to_string();
    }
    if let Some(description) = updates.get("description") {
        save.description = description.as_str().map(|s| s.to_string());
    }
    if let Some(enabled) = updates.get("enabled").and_then(|v| v.as_bool()) {
        save.enabled = enabled;
    }
    if let Some(webdav_url) = updates.get("webdavUrl") {
        save.webdav_url = webdav_url.as_str().map(|s| s.to_string());
    }
    if let Some(webdav_username) = updates.get("webdavUsername") {
        save.webdav_username = webdav_username.as_str().map(|s| s.to_string());
    }
    if let Some(webdav_password) = updates.get("webdavPassword") {
        save.webdav_password = webdav_password.as_str().map(|s| s.to_string());
    }

    save.updated_at = Utc::now();
    let result = save.clone();
    save_game_saves(&saves)?;

    Ok(result)
}

#[tauri::command]
pub fn delete_game_save(id: String) -> Result<(), String> {
    let mut saves = load_game_saves();
    saves.retain(|s| s.id != id);
    save_game_saves(&saves)?;
    Ok(())
}

#[tauri::command]
pub fn create_backup(game_save_id: String) -> Result<Backup, String> {
    let mut saves = load_game_saves();
    let save = saves
        .iter_mut()
        .find(|s| s.id == game_save_id)
        .ok_or_else(|| "Game save not found".to_string())?;

    let source_path = Path::new(&save.save_path);
    if !source_path.exists() {
        return Err("Save path does not exist".to_string());
    }

    let backup_id = Uuid::new_v4().to_string();
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let backup_name = format!("{}_{}.zip", save.name.replace(" ", "_"), timestamp);
    
    ensure_data_dir().map_err(|e| e.to_string())?;
    
    // Create zip file
    let zip_path = get_backup_dir().join(&backup_name);
    let size = zip_directory(source_path, &zip_path).map_err(|e| e.to_string())?;

    let backup_type = if save.webdav_url.is_some() {
        "cloud"
    } else {
        "local"
    };

    let backup = Backup {
        id: backup_id.clone(),
        game_save_id: game_save_id.clone(),
        name: backup_name.clone(),
        path: zip_path.to_string_lossy().to_string(),
        size,
        created_at: Utc::now(),
        backup_type: backup_type.to_string(),
    };

    // Upload to WebDAV if configured
    if backup_type == "cloud" {
        if let (Some(url), Some(username), Some(password)) = (
            &save.webdav_url,
            &save.webdav_username,
            &save.webdav_password,
        ) {
            let remote_path = format!("{}/{}", save.id, backup_name);
            upload_to_webdav(&zip_path, url, username, password, &remote_path)
                .map_err(|e| format!("WebDAV upload failed: {}", e))?;
            save.last_sync = Some(Utc::now());
        }
    }

    let mut backups = load_backups();
    backups.push(backup.clone());
    save_backups(&backups)?;

    save.last_backup = Some(Utc::now());
    save.backup_count += 1;
    save_game_saves(&saves)?;

    Ok(backup)
}

#[tauri::command]
pub fn list_backups(game_save_id: Option<String>) -> Result<Vec<Backup>, String> {
    let backups = load_backups();
    if let Some(id) = game_save_id {
        Ok(backups.into_iter().filter(|b| b.game_save_id == id).collect())
    } else {
        Ok(backups)
    }
}

#[tauri::command]
pub fn restore_backup(backup_id: String) -> Result<(), String> {
    let backups = load_backups();
    let backup = backups
        .iter()
        .find(|b| b.id == backup_id)
        .ok_or_else(|| "Backup not found".to_string())?;

    let mut saves = load_game_saves();
    let save = saves
        .iter_mut()
        .find(|s| s.id == backup.game_save_id)
        .ok_or_else(|| "Game save not found".to_string())?;

    let save_path = Path::new(&save.save_path);
    ensure_data_dir().map_err(|e| e.to_string())?;

    // Download from WebDAV if it's a cloud backup
    let zip_path = if backup.backup_type == "cloud" {
        let temp_zip = get_temp_dir().join(&backup.name);
        
        if let (Some(url), Some(username), Some(password)) = (
            &save.webdav_url,
            &save.webdav_username,
            &save.webdav_password,
        ) {
            let remote_path = format!("{}/{}", save.id, backup.name);
            download_from_webdav(url, username, password, &remote_path, &temp_zip)
                .map_err(|e| format!("WebDAV download failed: {}", e))?;
        } else {
            return Err("WebDAV credentials not configured".to_string());
        }
        temp_zip
    } else {
        PathBuf::from(&backup.path)
    };

    if !zip_path.exists() {
        return Err("Backup file not found".to_string());
    }

    // Create temporary extraction directory
    let temp_extract_dir = get_temp_dir().join(format!("extract_{}", Uuid::new_v4()));
    
    // Extract zip to temporary directory
    unzip_file(&zip_path, &temp_extract_dir).map_err(|e| e.to_string())?;

    // Backup current save if it exists (safety measure)
    if save_path.exists() {
        let _current_backup_path = get_temp_dir().join(format!("current_backup_{}", Uuid::new_v4()));
        let _ = copy_directory(save_path, &_current_backup_path);
    }

    // Remove existing save directory
    if save_path.exists() {
        fs::remove_dir_all(save_path).map_err(|e| e.to_string())?;
    }

    // Copy extracted files to save path
    // Find the first directory or file in temp_extract_dir
    let entries: Vec<_> = fs::read_dir(&temp_extract_dir)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    if entries.len() == 1 {
        let entry = &entries[0];
        let entry_path = entry.path();
        if entry_path.is_dir() {
            copy_directory(&entry_path, save_path).map_err(|e| e.to_string())?;
        } else {
            fs::create_dir_all(save_path.parent().unwrap()).map_err(|e| e.to_string())?;
            fs::copy(&entry_path, save_path).map_err(|e| e.to_string())?;
        }
    } else {
        copy_directory(&temp_extract_dir, save_path).map_err(|e| e.to_string())?;
    }

    // Clean up temporary files
    let _ = fs::remove_dir_all(&temp_extract_dir);
    if backup.backup_type == "cloud" {
        let _ = fs::remove_file(&zip_path);
    }

    save.updated_at = Utc::now();
    save_game_saves(&saves)?;

    Ok(())
}

fn copy_directory(source: &Path, dest: &Path) -> std::io::Result<()> {
    if source.is_dir() {
        fs::create_dir_all(dest)?;
        for entry in fs::read_dir(source)? {
            let entry = entry?;
            let path = entry.path();
            let dest_path = dest.join(entry.file_name());

            if path.is_dir() {
                copy_directory(&path, &dest_path)?;
            } else {
                fs::copy(&path, &dest_path)?;
            }
        }
    } else {
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(source, dest)?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_backup(backup_id: String) -> Result<(), String> {
    let mut backups = load_backups();
    let backup = backups
        .iter()
        .find(|b| b.id == backup_id)
        .ok_or_else(|| "Backup not found".to_string())?;

    // Delete local backup file
    let backup_path = Path::new(&backup.path);
    if backup_path.exists() {
        fs::remove_file(backup_path).map_err(|e| e.to_string())?;
    }

    // Delete from WebDAV if it's a cloud backup
    if backup.backup_type == "cloud" {
        let saves = load_game_saves();
        if let Some(save) = saves.iter().find(|s| s.id == backup.game_save_id) {
            if let (Some(url), Some(username), Some(password)) = (
                &save.webdav_url,
                &save.webdav_username,
                &save.webdav_password,
            ) {
                let remote_path = format!("{}/{}", save.id, backup.name);
                let full_url = if url.ends_with('/') {
                    format!("{}{}", url, remote_path)
                } else {
                    format!("{}/{}", url, remote_path)
                };

                let client = reqwest::blocking::Client::new();
                let _ = client
                    .delete(&full_url)
                    .basic_auth(username, Some(password))
                    .send();
            }
        }
    }

    // Update game save backup count
    let mut saves = load_game_saves();
    if let Some(save) = saves.iter_mut().find(|s| s.id == backup.game_save_id) {
        save.backup_count = save.backup_count.saturating_sub(1);
        save_game_saves(&saves)?;
    }

    backups.retain(|b| b.id != backup_id);
    save_backups(&backups)?;

    Ok(())
}
