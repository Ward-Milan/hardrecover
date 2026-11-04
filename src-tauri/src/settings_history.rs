use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub default_export_dir: String,
    pub bad_sector_timeout_ms: u32,
    pub initial_jump_sectors: u64,
    pub max_jump_sectors: u64,
    pub auto_repair_carved_media: bool,
    pub bypass_os_cache: bool,
    pub generate_forensic_report: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let default_dir = PathBuf::from(home)
            .join("Downloads")
            .join("HardRecover_Vault")
            .to_string_lossy()
            .to_string();
        Self {
            default_export_dir: default_dir,
            bad_sector_timeout_ms: 250,
            initial_jump_sectors: 64,
            max_jump_sectors: 32768,
            auto_repair_carved_media: true,
            bypass_os_cache: true,
            generate_forensic_report: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedSessionEntry {
    pub id: String,
    pub timestamp: String,
    pub session_type: String, // "recovery" | "repair" | "imaging"
    pub target_name: String,
    pub target_path: String,
    pub files_processed: usize,
    pub total_bytes: u64,
    pub status_label: String,
    pub destination_path: Option<String>,
    pub report_path: Option<String>,
}

fn config_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let dir = PathBuf::from(home).join(".hardrecover");
    let _ = fs::create_dir_all(&dir);
    dir
}

pub fn load_settings() -> AppSettings {
    let path = config_dir().join("settings.json");
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(parsed) = serde_json::from_str::<AppSettings>(&content) {
            return parsed;
        }
    }
    AppSettings::default()
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = config_dir().join("settings.json");
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

pub fn load_sessions() -> Vec<SavedSessionEntry> {
    let path = config_dir().join("sessions.json");
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(parsed) = serde_json::from_str::<Vec<SavedSessionEntry>>(&content) {
            return parsed;
        }
    }
    Vec::new()
}

pub fn append_session(entry: SavedSessionEntry) -> Vec<SavedSessionEntry> {
    let mut list = load_sessions();
    list.insert(0, entry);
    if list.len() > 60 {
        list.truncate(60);
    }
    let path = config_dir().join("sessions.json");
    if let Ok(json) = serde_json::to_string_pretty(&list) {
        let _ = fs::write(path, json);
    }
    list
}

pub fn remove_session(id: &str) -> Vec<SavedSessionEntry> {
    let mut list = load_sessions();
    list.retain(|item| item.id != id);
    let path = config_dir().join("sessions.json");
    if let Ok(json) = serde_json::to_string_pretty(&list) {
        let _ = fs::write(path, json);
    }
    list
}

