use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameSave {
    pub id: String,
    pub name: String,
    pub save_path: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub last_backup: Option<DateTime<Utc>>,
    pub last_sync: Option<DateTime<Utc>>,
    pub backup_count: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub webdav_url: Option<String>,
    pub webdav_username: Option<String>,
    pub webdav_password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Backup {
    pub id: String,
    pub game_save_id: String,
    pub name: String,
    pub path: String,
    pub size: u64,
    pub created_at: DateTime<Utc>,
    pub backup_type: String, // "local" or "cloud"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameSaveConfig {
    pub name: String,
    pub save_path: String,
    pub description: Option<String>,
    pub webdav_url: Option<String>,
    pub webdav_username: Option<String>,
    pub webdav_password: Option<String>,
}
