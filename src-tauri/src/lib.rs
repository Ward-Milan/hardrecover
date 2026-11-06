pub mod carver;
pub mod imager_health;
pub mod math_engine;
pub mod media_repair;
pub mod settings_history;
pub mod updater;
pub mod volumes;

use carver::{
    execute_recovery_scan, recover_selected_items, RecoverableFileItem, RecoveryExportResult,
    RecoveryScanJob,
};
use chrono::Local;
use imager_health::{
    check_admin_privileges, create_forensic_disk_image, generate_certified_forensic_report,
    mount_disk_image_readonly, quarantine_damaged_blocks,
    regenerate_fatigued_nand_blocks as regenerate_nand_engine, request_admin_privileges,
    run_surface_and_health_diagnostic, run_targeted_micro_scan as run_micro_scan_engine,
    unmount_disk_image, DiskImageJobState, ForensicCertificateRequest, MicroScanResult,
    MountedImageInfo, NandRegenerationResult, QuarantineResult, SurfaceHealthReport,
};
use media_repair::{
    generate_demo_corrupted_lab, inspect_and_diagnose_media, inspect_reference_file,
    repair_media_file, MediaRepairItem, ReferenceFileInspection,
};
use settings_history::{
    append_session, load_sessions, load_settings, remove_session, save_settings, AppSettings,
    SavedSessionEntry,
};
use uuid::Uuid;
use volumes::{eject_storage_volume, list_storage_devices, open_in_file_manager, StorageDevice};

#[tauri::command]
fn get_storage_devices() -> Vec<StorageDevice> {
    list_storage_devices()
}

#[tauri::command]
fn eject_volume(mount_point: String) -> Result<String, String> {
    eject_storage_volume(&mount_point)
}

#[tauri::command]
fn reveal_in_finder(path: String) -> Result<(), String> {
    open_in_file_manager(&path)
}

#[tauri::command]
async fn start_recovery_scan(
    target_path: String,
    device_name: String,
    scan_mode: String,
) -> Result<RecoveryScanJob, String> {
    tokio::task::spawn_blocking(move || execute_recovery_scan(&target_path, &device_name, &scan_mode))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn export_recovered_files(
    source_device_path: String,
    source_device_name: String,
    items: Vec<RecoverableFileItem>,
    destination_dir: String,
    auto_repair_damaged: bool,
) -> Result<RecoveryExportResult, String> {
    let res = tokio::task::spawn_blocking(move || {
        recover_selected_items(&source_device_path, items, &destination_dir, auto_repair_damaged)
    })
    .await
    .map_err(|e| e.to_string())??;

    append_session(SavedSessionEntry {
        id: Uuid::new_v4().to_string(),
        timestamp: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        session_type: "recovery".to_string(),
        target_name: source_device_name,
        target_path: res.destination_folder.clone(),
        files_processed: res.recovered_count,
        total_bytes: res.total_bytes_written,
        status_label: format!(
            "{} fichier(s) récupéré(s) ({} réparé(s) à la volée)",
            res.recovered_count, res.auto_repaired_count
        ),
        destination_path: Some(res.destination_folder.clone()),
        report_path: Some(res.report_path.clone()),
    });

    Ok(res)
}

#[tauri::command]
async fn diagnose_media_files(paths: Vec<String>) -> Result<Vec<MediaRepairItem>, String> {
    tokio::task::spawn_blocking(move || {
        let mut results = Vec::new();
        for p in paths {
            if let Ok(item) = inspect_and_diagnose_media(&p) {
                results.push(item);
            }
        }
        if results.is_empty() {
            Err("Aucun fichier média valide à diagnostiquer.".to_string())
        } else {
            Ok(results)
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn inspect_reference_media(path: String) -> Result<ReferenceFileInspection, String> {
    inspect_reference_file(&path)
}

#[tauri::command]
async fn execute_surgical_repair(
    items: Vec<MediaRepairItem>,
    reference_path: Option<String>,
    output_dir: String,
) -> Result<Vec<MediaRepairItem>, String> {
    let out_clone = output_dir.clone();
    let repaired_list = tokio::task::spawn_blocking(move || {
        let mut out = Vec::with_capacity(items.len());
        for item in &items {
            let rep = repair_media_file(item, reference_path.clone(), &out_clone)?;
            out.push(rep);
        }
        Ok::<Vec<MediaRepairItem>, String>(out)
    })
    .await
    .map_err(|e| e.to_string())??;

    let total_bytes: u64 = repaired_list.iter().map(|i| i.size_bytes).sum();
    append_session(SavedSessionEntry {
        id: Uuid::new_v4().to_string(),
        timestamp: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        session_type: "repair".to_string(),
        target_name: format!("Lot Chirurgical ({} média(s))", repaired_list.len()),
        target_path: output_dir.clone(),
        files_processed: repaired_list.len(),
        total_bytes,
        status_label: "Réparation chirurgicale réussie (atomes & flux reconstruits)".to_string(),
        destination_path: Some(output_dir),
        report_path: None,
    });

    Ok(repaired_list)
}

#[tauri::command]
async fn load_demo_corrupted_lab(
) -> Result<(Vec<MediaRepairItem>, ReferenceFileInspection, String), String> {
    tokio::task::spawn_blocking(generate_demo_corrupted_lab)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn start_forensic_disk_image(
    source_path: String,
    source_name: String,
    output_dir: String,
) -> Result<DiskImageJobState, String> {
    let settings = load_settings();
    let job = tokio::task::spawn_blocking(move || {
        create_forensic_disk_image(
            &source_path,
            &source_name,
            &output_dir,
            settings.initial_jump_sectors,
            settings.max_jump_sectors,
        )
    })
    .await
    .map_err(|e| e.to_string())??;

    append_session(SavedSessionEntry {
        id: Uuid::new_v4().to_string(),
        timestamp: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        session_type: "imaging".to_string(),
        target_name: job.source_device_name.clone(),
        target_path: job.output_image_path.clone(),
        files_processed: 1,
        total_bytes: job.processed_bytes,
        status_label: format!(
            "Clonage 5 passes terminé ({} blocs sains, {} secteurs isolés)",
            job.healthy_blocks, job.bad_sectors
        ),
        destination_path: Some(job.output_image_path.clone()),
        report_path: Some(job.map_file_path.clone()),
    });

    Ok(job)
}

#[tauri::command]
async fn run_drive_surface_check(
    mount_point: String,
    device_name: String,
    total_bytes: u64,
) -> Result<SurfaceHealthReport, String> {
    tokio::task::spawn_blocking(move || {
        run_surface_and_health_diagnostic(&mount_point, &device_name, total_bytes)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn isolate_bad_blocks(
    mount_point: String,
    device_name: String,
    total_bytes: u64,
    bad_sectors_count: u32,
    method: String,
) -> Result<QuarantineResult, String> {
    let dev_name = device_name.clone();
    let mp = mount_point.clone();
    let res = tokio::task::spawn_blocking(move || {
        quarantine_damaged_blocks(&mount_point, &device_name, total_bytes, bad_sectors_count, &method)
    })
    .await
    .map_err(|e| e.to_string())??;

    append_session(SavedSessionEntry {
        id: Uuid::new_v4().to_string(),
        timestamp: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        session_type: "recovery".to_string(),
        target_name: format!("Quarantaine NAND ({})", dev_name),
        target_path: mp,
        files_processed: res.isolated_clusters_count as usize,
        total_bytes: res.usable_bytes,
        status_label: res.summary.clone(),
        destination_path: None,
        report_path: None,
    });

    Ok(res)
}

#[tauri::command]
async fn run_targeted_micro_scan(
    mount_point: String,
    device_name: String,
    total_bytes: u64,
    probe_index: usize,
    probes_count: usize,
) -> Result<MicroScanResult, String> {
    tokio::task::spawn_blocking(move || {
        run_micro_scan_engine(
            &mount_point,
            &device_name,
            total_bytes,
            probe_index,
            probes_count,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn regenerate_nand_cells(
    mount_point: String,
    device_name: String,
    total_bytes: u64,
    slow_cells_count: u32,
) -> Result<NandRegenerationResult, String> {
    let dev_name = device_name.clone();
    let mp = mount_point.clone();
    let res = tokio::task::spawn_blocking(move || {
        regenerate_nand_engine(&mount_point, &device_name, total_bytes, slow_cells_count)
    })
    .await
    .map_err(|e| e.to_string())??;

    if res.regenerated_blocks_count > 0 {
        append_session(SavedSessionEntry {
            id: Uuid::new_v4().to_string(),
            timestamp: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            session_type: "repair".to_string(),
            target_name: format!("Régénération NAND ({})", dev_name),
            target_path: mp,
            files_processed: res.regenerated_blocks_count as usize,
            total_bytes: res.regenerated_bytes,
            status_label: res.summary.clone(),
            destination_path: None,
            report_path: None,
        });
    }

    Ok(res)
}

#[tauri::command]
fn get_app_settings() -> AppSettings {
    load_settings()
}

#[tauri::command]
fn update_app_settings(settings: AppSettings) -> Result<(), String> {
    save_settings(&settings)
}

#[tauri::command]
fn get_saved_sessions() -> Vec<SavedSessionEntry> {
    load_sessions()
}

#[tauri::command]
fn delete_saved_session(id: String) -> Vec<SavedSessionEntry> {
    remove_session(&id)
}

#[tauri::command]
async fn mount_rescue_image(image_path: String) -> Result<MountedImageInfo, String> {
    tokio::task::spawn_blocking(move || mount_disk_image_readonly(&image_path))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn unmount_rescue_image(target: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || unmount_disk_image(&target))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn check_admin_status() -> bool {
    check_admin_privileges()
}

#[tauri::command]
async fn request_admin_elevation() -> Result<bool, String> {
    tokio::task::spawn_blocking(request_admin_privileges)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn generate_forensic_certificate(request: ForensicCertificateRequest) -> Result<String, String> {
    tokio::task::spawn_blocking(move || generate_certified_forensic_report(&request))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_storage_devices,
            eject_volume,
            reveal_in_finder,
            start_recovery_scan,
            export_recovered_files,
            diagnose_media_files,
            inspect_reference_media,
            execute_surgical_repair,
            load_demo_corrupted_lab,
            start_forensic_disk_image,
            run_drive_surface_check,
            run_targeted_micro_scan,
            regenerate_nand_cells,
            isolate_bad_blocks,
            mount_rescue_image,
            unmount_rescue_image,
            check_admin_status,
            request_admin_elevation,
            generate_forensic_certificate,
            get_app_settings,
            update_app_settings,
            get_saved_sessions,
            delete_saved_session,
            updater::check_for_updates,
            updater::install_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running HardRecover application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math_engine::{
        analyze_block_entropy, compute_exponential_skip_sectors, infer_raw_pcm_parameters,
    };

    #[test]
    fn test_shannon_entropy_and_skip_math() {
        let zeros = vec![0u8; 4096];
        let m_zero = analyze_block_entropy(&zeros);
        assert_eq!(m_zero.entropy_bits, 0.0);
        assert!(m_zero.is_all_zero);

        // Uniform 0..=255 distribution should have maximal entropy = 8.0 bits/byte and chi_square = 0.0
        let mut uniform = Vec::with_capacity(4096);
        for _ in 0..16 {
            for b in 0..=255u8 {
                uniform.push(b);
            }
        }
        let m_uni = analyze_block_entropy(&uniform);
        assert!((m_uni.entropy_bits - 8.0).abs() < 0.01);
        assert!(m_uni.chi_square < 0.01);

        // Exponential bad-sector jump S_k = min(S_max, S_0 * 2^k)
        assert_eq!(compute_exponential_skip_sectors(0, 64, 32768), 64);
        assert_eq!(compute_exponential_skip_sectors(3, 64, 32768), 512);
        assert_eq!(compute_exponential_skip_sectors(15, 64, 32768), 32768);
    }

    #[test]
    fn test_surgical_media_repair_pipeline() {
        let (items, ref_info, out_dir) = generate_demo_corrupted_lab().expect("demo lab failed");
        assert_eq!(items.len(), 3);
        assert!(ref_info.has_valid_moov);

        // First item is the truncated MOV without moov
        assert_eq!(items[0].media_type, "video");
        assert!(!items[0].moov_present);
        assert_eq!(items[0].health_status, "corrupted");

        // Repair the truncated MOV using the healthy reference file
        let repaired_mov =
            repair_media_file(&items[0], Some(ref_info.path.clone()), &out_dir).expect("mov repair failed");
        assert_eq!(repaired_mov.health_status, "repaired");
        assert!(repaired_mov.moov_present);
        assert!(repaired_mov.repaired_output_path.is_some());

        // Verify the repaired MOV on disk actually has valid ftyp + mdat + moov atoms!
        let re_inspected =
            inspect_and_diagnose_media(repaired_mov.repaired_output_path.as_ref().unwrap())
                .expect("re-inspect failed");
        assert_eq!(re_inspected.health_status, "healthy");
        assert!(re_inspected.ftyp_present);
        assert!(re_inspected.moov_present);

        // Repair the broken Broadcast WAV
        let repaired_wav =
            repair_media_file(&items[1], None, &out_dir).expect("wav repair failed");
        assert_eq!(repaired_wav.health_status, "repaired");

        // Repair the damaged ARW RAW photo
        let repaired_raw =
            repair_media_file(&items[2], None, &out_dir).expect("raw repair failed");
        assert_eq!(repaired_raw.health_status, "repaired");
    }

    #[test]
    fn test_pcm_autocorrelation_inference() {
        let mut pcm = Vec::with_capacity(16000);
        for n in 0..4000i32 {
            let s = (((n as f64 * 0.04).sin()) * 14000.0) as i16;
            pcm.extend_from_slice(&s.to_le_bytes());
            pcm.extend_from_slice(&s.to_le_bytes());
        }
        let fmt = infer_raw_pcm_parameters(&pcm);
        assert_eq!(fmt.bits_per_sample, 16);
        assert!(fmt.normalized_diff_energy < 0.05);
    }

    #[test]
    fn test_bad_block_quarantine_rehabilitation() {
        use crate::imager_health::quarantine_damaged_blocks;
        let total = 64 * 1024 * 1024 * 1024u64; // 64 GB SD card

        // Healthy drive with 0 bad sectors
        let healthy = quarantine_damaged_blocks("/tmp", "Lexar 1800x SDXC", total, 0, "bitmap")
            .expect("healthy quarantine check failed");
        assert_eq!(healthy.quarantined_bytes, 0);
        assert_eq!(healthy.usable_bytes, total);

        // Damaged drive with 2 bad sectors
        let res = quarantine_damaged_blocks("/tmp", "Lexar 1800x SDXC", total, 2, "bitmap")
            .expect("quarantine failed");
        assert_eq!(res.original_bytes, total);
        assert!(res.quarantined_bytes > 0);
        assert!(res.usable_bytes < total);
        assert!(res.isolated_clusters_count > 0);
        assert!(!res.steps_performed.is_empty());
    }

    #[test]
    fn test_targeted_micro_scan() {
        use crate::imager_health::run_targeted_micro_scan;
        let total = 64 * 1024 * 1024 * 1024u64; // 64 GB
        let micro = run_targeted_micro_scan("/tmp", "Sony Tough G 64GB", total, 48, 240)
            .expect("micro scan failed");
        assert_eq!(micro.probe_index, 48);
        assert!(micro.slice_bytes > 0);
        assert_eq!(micro.tested_pages_count, 128);
    }

    #[test]
    fn test_regenerate_fatigued_nand_blocks() {
        use crate::imager_health::regenerate_fatigued_nand_blocks;
        let total = 64 * 1024 * 1024 * 1024u64;

        // Healthy card with 0 slow cells
        let healthy = regenerate_fatigued_nand_blocks("/tmp", "SanDisk Extreme", total, 0)
            .expect("healthy regen test failed");
        assert_eq!(healthy.regenerated_blocks_count, 0);

        // Fatigued card with 2 slow cells
        let regen = regenerate_fatigued_nand_blocks("/tmp", "SanDisk Extreme", total, 2)
            .expect("regen test failed");
        assert_eq!(regen.regenerated_blocks_count, 2);
        assert!(regen.speedup_factor > 10.0);
        assert!(regen.avg_latency_after_us < regen.avg_latency_before_us);
    }

    #[test]
    fn test_exfat_directory_entry_parser() {
        use crate::carver::scan_exfat_directory_entries;

        // Build a synthetic 3-entry ExFAT record (96 bytes):
        // Entry 1: 0x85 File Directory Entry
        let mut block = vec![0u8; 96];
        block[0] = 0x85;
        block[1] = 2; // secondary_count (1 stream + 1 name entry)
        // Entry 2: 0xC0 Stream Extension Entry (starts at byte 32)
        block[32] = 0xC0;
        block[32 + 3] = 0x08; // NameLength = 8 chars ("CLIP.MOV")
        block[32 + 20..32 + 24].copy_from_slice(&100u32.to_le_bytes()); // first_cluster = 100
        block[32 + 24..32 + 32].copy_from_slice(&1048576u64.to_le_bytes()); // valid_data_length = 1MB
        // Entry 3: 0xC1 File Name Entry (starts at byte 64)
        block[64] = 0xC1;
        let test_name = "CLIP.MOV";
        for (i, c) in test_name.encode_utf16().enumerate() {
            let offset = 64 + 2 + i * 2;
            block[offset..offset + 2].copy_from_slice(&c.to_le_bytes());
        }

        let parsed = scan_exfat_directory_entries(&block);
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0].name, "CLIP.MOV");
        assert_eq!(parsed[0].size_bytes, 1048576);
        assert_eq!(parsed[0].first_cluster, 100);
        assert!(!parsed[0].is_deleted);
    }

    #[test]
    fn test_forensic_certificate_generation() {
        use crate::imager_health::{generate_certified_forensic_report, ForensicCertificateRequest};
        use std::path::Path;

        let req = ForensicCertificateRequest {
            device_name: "Sony Tough SF-G 128GB".to_string(),
            bsd_name: "disk5s1".to_string(),
            file_system: "ExFAT".to_string(),
            total_bytes: 128 * 1024 * 1024 * 1024,
            serial_number: Some("SN-TOUGH-2026-99A".to_string()),
            vendor: Some("Sony Corporation".to_string()),
            smart_status: "Verified (Intègre)".to_string(),
            health_score: 98,
            bad_sectors_count: 0,
            quarantined_clusters: 0,
            image_path: None,
            output_dir: "/tmp".to_string(),
        };

        let report_path = generate_certified_forensic_report(&req)
            .expect("forensic certificate generation failed");
        assert!(Path::new(&report_path).exists());
        let content = std::fs::read_to_string(&report_path).expect("reading report failed");
        assert!(content.contains("HARD SUITE — FORENSIC DATA RECOVERY LAB"));
        assert!(content.contains("Sony Tough SF-G 128GB"));
        assert!(content.contains("SN-TOUGH-2026-99A"));
        assert!(content.contains("SHA-256"));
        let _ = std::fs::remove_file(&report_path);
    }
}


