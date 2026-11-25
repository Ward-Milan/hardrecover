use crate::math_engine::{analyze_block_entropy, compute_exponential_skip_sectors};
use chrono::Local;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::time::Instant;
use uuid::Uuid;
use walkdir::WalkDir;
use xxhash_rust::xxh3::Xxh3;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskImageJobState {
    pub id: String,
    pub source_device_name: String,
    pub source_path: String,
    pub output_image_path: String,
    pub map_file_path: String,
    pub status: String,
    pub phase_label: String,
    pub processed_bytes: u64,
    pub total_bytes: u64,
    pub speed_bps: u64,
    pub eta_seconds: Option<u64>,
    pub healthy_blocks: u32,
    pub slow_blocks: u32,
    pub bad_sectors: u32,
    pub current_skip_step_sectors: u64,
    pub sector_grid: Vec<u8>, // 1=healthy, 2=slow, 3=bad/error
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SurfaceHealthReport {
    pub device_name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub smart_status: String,
    pub nand_wear_percent: u8,
    pub avg_latency_us: u64,
    pub p99_latency_us: u64,
    pub max_latency_us: u64,
    pub slow_cells_count: u32,
    pub bad_sectors_count: u32,
    pub is_counterfeit_capacity: bool,
    pub real_capacity_bytes: u64,
    pub counterfeit_note: String,
    pub entropy_distribution: String,
    pub tested_blocks_grid: Vec<u8>, // 1=fast (<1ms), 2=normal (1-10ms), 3=slow (10-50ms), 4=critical (>=50ms or I/O error)
    pub auto_micro_scans: Vec<MicroScanResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MicroScanResult {
    pub probe_index: usize,
    pub start_byte: u64,
    pub end_byte: u64,
    pub slice_bytes: u64,
    pub start_lba: u64,
    pub end_lba: u64,
    pub tested_pages_count: usize,
    pub bad_lbas: Vec<u64>,
    pub bad_blocks_count: u32,
    pub quarantined_bytes: u64,
    pub exact_dead_block_offset: u64,
    pub summary: String,
    pub is_pinpointed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NandRegenerationResult {
    pub device_name: String,
    pub mount_point: String,
    pub regenerated_blocks_count: u32,
    pub regenerated_bytes: u64,
    pub avg_latency_before_us: u64,
    pub avg_latency_after_us: u64,
    pub speedup_factor: f64,
    pub summary: String,
    pub details: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuarantineResult {
    pub device_name: String,
    pub original_bytes: u64,
    pub quarantined_bytes: u64,
    pub usable_bytes: u64,
    pub isolated_clusters_count: u32,
    pub isolation_method: String,
    pub summary: String,
    pub steps_performed: Vec<String>,
}

#[cfg(target_os = "macos")]
fn set_fd_nocache(file: &File) {
    use std::os::unix::io::AsRawFd;
    unsafe {
        let _ = libc::fcntl(file.as_raw_fd(), libc::F_NOCACHE, 1);
    }
}

#[cfg(not(target_os = "macos"))]
fn set_fd_nocache(_file: &File) {}

fn is_ignored_volume_entry(path: &Path) -> bool {
    let s = path.to_string_lossy();
    s.contains("/.Spotlight-V100")
        || s.contains("/.fseventsd")
        || s.contains("/.TemporaryItems")
        || s.contains("/.DocumentRevisions-V100")
        || s.contains("/.Trashes")
}

fn downsample_outcomes_to_grid(outcomes: &[u8], target_cells: usize) -> Vec<u8> {
    if outcomes.is_empty() {
        return Vec::new();
    }
    if outcomes.len() <= target_cells {
        return outcomes.to_vec();
    }
    let mut grid = Vec::with_capacity(target_cells);
    for cell_idx in 0..target_cells {
        let start = (cell_idx * outcomes.len()) / target_cells;
        let end = (((cell_idx + 1) * outcomes.len()) / target_cells).max(start + 1);
        let worst = outcomes[start..end.min(outcomes.len())]
            .iter()
            .copied()
            .max()
            .unwrap_or(1);
        grid.push(worst);
    }
    grid
}

/// Creates a real read-only rescue disk image (raw `.img` for raw files/devices, read-only `.dmg` via `hdiutil` for mounted volumes)
/// plus a `.hrmap.json` progress/sector map. Never writes to the source volume.
pub fn create_forensic_disk_image(
    source_path: &str,
    source_name: &str,
    output_dir: &str,
    s0_sectors: u64,
    s_max_sectors: u64,
) -> Result<DiskImageJobState, String> {
    if source_path == "/" {
        return Err(
            "Verrouillage Forensique : Impossible de créer une image disque brute depuis le volume système racine actif."
                .to_string(),
        );
    }

    let source_p = Path::new(source_path);
    if !source_p.exists() {
        return Err(format!("Source introuvable : {}", source_path));
    }

    let out_folder = PathBuf::from(output_dir);
    fs::create_dir_all(&out_folder).map_err(|e| e.to_string())?;

    let src_canon = fs::canonicalize(source_p).unwrap_or_else(|_| source_p.to_path_buf());
    let out_canon = fs::canonicalize(&out_folder).unwrap_or_else(|_| out_folder.clone());
    if out_canon.starts_with(&src_canon) {
        return Err(
            "Verrouillage Forensique : Impossible d'enregistrer l'image disque sur le support source lui-même."
                .to_string(),
        );
    }

    let safe_name = source_name
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();
    let stamp = Local::now().format("%Y%m%d_%H%M%S");
    let map_path = out_canon.join(format!("Rescue_{}_{}.hrmap.json", safe_name, stamp));

    let start_instant = Instant::now();

    if source_p.is_file() || source_path.starts_with("/dev/") {
        let img_path = out_canon.join(format!("Rescue_{}_{}.img", safe_name, stamp));
        let mut src_file = File::open(source_p)
            .map_err(|e| format!("Impossible d'ouvrir la source en lecture seule : {}", e))?;
        set_fd_nocache(&src_file);

        let src_len = src_file.metadata().map(|m| m.len()).unwrap_or(0);
        let mut img_file = File::create(&img_path).map_err(|e| e.to_string())?;
        set_fd_nocache(&img_file);

        const CHUNK_SIZE: usize = 1024 * 1024; // 1 MiB
        let mut buf = vec![0u8; CHUNK_SIZE];
        let mut outcomes: Vec<u8> = Vec::new();
        let mut healthy_blocks = 0u32;
        let mut slow_blocks = 0u32;
        let mut bad_sectors = 0u32;
        let mut consecutive_errors = 0u32;
        let mut max_skip_seen = s0_sectors;
        let mut total_written = 0u64;
        let mut offset = 0u64;

        loop {
            let chunk_start = Instant::now();
            match src_file.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    img_file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
                    total_written = total_written.saturating_add(n as u64);
                    offset = offset.saturating_add(n as u64);
                    consecutive_errors = 0;

                    if chunk_start.elapsed().as_millis() > 50 {
                        slow_blocks += 1;
                        outcomes.push(2);
                    } else {
                        healthy_blocks += 1;
                        outcomes.push(1);
                    }
                }
                Err(_) => {
                    bad_sectors += 1;
                    consecutive_errors += 1;
                    let skip_sectors = compute_exponential_skip_sectors(
                        consecutive_errors,
                        s0_sectors,
                        s_max_sectors,
                    );
                    if skip_sectors > max_skip_seen {
                        max_skip_seen = skip_sectors;
                    }
                    let step_bytes = (skip_sectors * 512).clamp(4096, CHUNK_SIZE as u64) as usize;
                    let write_len = if src_len > 0 {
                        step_bytes.min(src_len.saturating_sub(offset) as usize)
                    } else {
                        step_bytes
                    };
                    if write_len == 0 {
                        break;
                    }
                    let zeros = vec![0u8; write_len];
                    img_file.write_all(&zeros).map_err(|e| e.to_string())?;
                    total_written = total_written.saturating_add(write_len as u64);
                    offset = offset.saturating_add(write_len as u64);
                    if src_file.seek(SeekFrom::Start(offset)).is_err() {
                        break;
                    }
                    outcomes.push(3);
                }
            }
        }

        img_file.sync_all().map_err(|e| e.to_string())?;
        let elapsed_secs = start_instant.elapsed().as_secs_f64().max(0.001);
        let speed = ((total_written as f64) / elapsed_secs) as u64;
        let sector_grid = downsample_outcomes_to_grid(&outcomes, 240);

        let job_state = DiskImageJobState {
            id: Uuid::new_v4().to_string(),
            source_device_name: source_name.to_string(),
            source_path: source_path.to_string(),
            output_image_path: img_path.to_string_lossy().to_string(),
            map_file_path: map_path.to_string_lossy().to_string(),
            status: "completed".to_string(),
            phase_label: if bad_sectors == 0 {
                "Clonage binaire direct terminé (0 erreur de lecture)".to_string()
            } else {
                format!(
                    "Clonage adaptatif terminé ({} zone(s) illisible(s) contournée(s))",
                    bad_sectors
                )
            },
            processed_bytes: total_written,
            total_bytes: total_written,
            speed_bps: speed,
            eta_seconds: Some(0),
            healthy_blocks,
            slow_blocks,
            bad_sectors,
            current_skip_step_sectors: max_skip_seen,
            sector_grid,
        };

        if let Ok(json_str) = serde_json::to_string_pretty(&job_state) {
            let _ = fs::write(&map_path, json_str);
        }
        return Ok(job_state);
    }

    // Directory / mounted volume: build a real read-only macOS disk image via `hdiutil create`
    #[cfg(target_os = "macos")]
    {
        let dmg_path = out_canon.join(format!("Rescue_{}_{}.dmg", safe_name, stamp));
        let dmg_str = dmg_path
            .to_str()
            .ok_or_else(|| "Chemin de destination invalide.".to_string())?;

        let output = std::process::Command::new("/usr/bin/hdiutil")
            .args([
                "create",
                "-srcfolder",
                source_path,
                "-format",
                "UDRO",
                "-ov",
                dmg_str,
            ])
            .output()
            .map_err(|e| format!("Échec d'exécution de hdiutil : {}", e))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(format!("Échec de création de l'image disque : {}", err));
        }

        let dmg_meta = fs::metadata(&dmg_path).map_err(|e| e.to_string())?;
        let total_written = dmg_meta.len();
        let elapsed_secs = start_instant.elapsed().as_secs_f64().max(0.001);
        let speed = ((total_written as f64) / elapsed_secs) as u64;

        // Sample up to 240 evenly-spaced reads across the created image to verify readability
        let mut outcomes = Vec::new();
        let mut healthy_blocks = 0u32;
        let mut slow_blocks = 0u32;
        let mut bad_sectors = 0u32;

        if let Ok(mut f) = File::open(&dmg_path) {
            set_fd_nocache(&f);
            let sample_count = 240usize.min(((total_written / 4096).max(1)) as usize);
            let mut probe = [0u8; 4096];
            for idx in 0..sample_count {
                let off = if sample_count > 1 && total_written > 4096 {
                    ((idx as u64) * (total_written - 4096)) / ((sample_count - 1) as u64)
                } else {
                    0
                };
                let t0 = Instant::now();
                if f.seek(SeekFrom::Start(off)).is_ok() && f.read(&mut probe).is_ok() {
                    if t0.elapsed().as_millis() > 20 {
                        slow_blocks += 1;
                        outcomes.push(2);
                    } else {
                        healthy_blocks += 1;
                        outcomes.push(1);
                    }
                } else {
                    bad_sectors += 1;
                    outcomes.push(3);
                }
            }
        }

        let job_state = DiskImageJobState {
            id: Uuid::new_v4().to_string(),
            source_device_name: source_name.to_string(),
            source_path: source_path.to_string(),
            output_image_path: dmg_path.to_string_lossy().to_string(),
            map_file_path: map_path.to_string_lossy().to_string(),
            status: "completed".to_string(),
            phase_label: "Image disque lecture seule générée et vérifiée".to_string(),
            processed_bytes: total_written,
            total_bytes: total_written,
            speed_bps: speed,
            eta_seconds: Some(0),
            healthy_blocks,
            slow_blocks,
            bad_sectors,
            current_skip_step_sectors: s0_sectors,
            sector_grid: outcomes,
        };

        if let Ok(json_str) = serde_json::to_string_pretty(&job_state) {
            let _ = fs::write(&map_path, json_str);
        }

        Ok(job_state)
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (s_max_sectors, stamp, map_path);
        Err("La création d'image à partir d'un volume monté nécessite macOS hdiutil.".to_string())
    }
}

fn query_real_smart_status(mount_point: &str) -> String {
    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = std::process::Command::new("/usr/sbin/diskutil")
            .args(["info", mount_point])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                if let Some((k, v)) = trimmed.split_once(':') {
                    if k.trim() == "SMART Status" {
                        return v.trim().to_string();
                    }
                }
            }
        }
    }
    #[cfg(not(target_os = "macos"))]
    let _ = mount_point;

    "Non exposé".to_string()
}

/// Strictly read-only diagnostic probing real files across the volume with `F_NOCACHE`.
/// Never fabricates synthetic latencies and never writes onto the inspected storage.
pub fn run_surface_and_health_diagnostic(
    mount_point: &str,
    device_name: &str,
    total_bytes: u64,
    _device_type: Option<&str>,
) -> Result<SurfaceHealthReport, String> {
    let root = Path::new(mount_point);
    if !root.exists() {
        return Err(format!("Le point de montage '{}' est introuvable.", mount_point));
    }

    let mut candidate_files: Vec<(PathBuf, u64)> = Vec::new();
    for entry in WalkDir::new(root)
        .max_depth(5)
        .follow_links(false)
        .into_iter()
        .flatten()
    {
        if candidate_files.len() >= 120 {
            break;
        }
        let p = entry.path();
        if is_ignored_volume_entry(p) {
            continue;
        }
        if entry.file_type().is_file() {
            if let Ok(meta) = entry.metadata() {
                if meta.len() > 0 {
                    candidate_files.push((p.to_path_buf(), meta.len()));
                }
            }
        }
    }

    let mut latencies_us: Vec<u64> = Vec::new();
    let mut grid: Vec<u8> = Vec::new();
    let mut slow_cells = 0u32;
    let mut critical_cells = 0u32;
    let mut entropy_acc = 0.0f64;
    let mut entropy_samples = 0usize;
    let mut slow_file_indices: Vec<(usize, PathBuf, u64)> = Vec::new();

    if !candidate_files.is_empty() {
        let target_probes = 240usize;
        let probes_per_file = (target_probes / candidate_files.len()).clamp(1, 24);
        let mut buf = [0u8; 65536];

        'outer: for (file_path, file_len) in &candidate_files {
            if let Ok(mut f) = File::open(file_path) {
                set_fd_nocache(&f);
                for slot in 0..probes_per_file {
                    if latencies_us.len() >= target_probes {
                        break 'outer;
                    }
                    let offset = if probes_per_file > 1 && *file_len > buf.len() as u64 {
                        ((slot as u64) * (*file_len - buf.len() as u64))
                            / ((probes_per_file - 1) as u64)
                    } else {
                        0
                    };
                    if f.seek(SeekFrom::Start(offset)).is_err() {
                        critical_cells += 1;
                        let probe_idx = latencies_us.len();
                        latencies_us.push(100_000);
                        grid.push(4);
                        slow_file_indices.push((probe_idx, file_path.clone(), offset));
                        continue;
                    }
                    let t0 = Instant::now();
                    match f.read(&mut buf) {
                        Ok(n) if n > 0 => {
                            let us = t0.elapsed().as_micros() as u64;
                            let probe_idx = latencies_us.len();
                            latencies_us.push(us);
                            let ent = analyze_block_entropy(&buf[..n]);
                            entropy_acc += ent.entropy_bits;
                            entropy_samples += 1;

                            if us < 1000 {
                                grid.push(1);
                            } else if us < 10_000 {
                                grid.push(2);
                            } else if us < 50_000 {
                                slow_cells += 1;
                                grid.push(3);
                                slow_file_indices.push((probe_idx, file_path.clone(), offset));
                            } else {
                                critical_cells += 1;
                                grid.push(4);
                                slow_file_indices.push((probe_idx, file_path.clone(), offset));
                            }
                        }
                        Ok(_) => {}
                        Err(_) => {
                            critical_cells += 1;
                            let probe_idx = latencies_us.len();
                            latencies_us.push(100_000);
                            grid.push(4);
                            slow_file_indices.push((probe_idx, file_path.clone(), offset));
                        }
                    }
                }
            }
        }
    }

    let real_smart = query_real_smart_status(mount_point);
    if latencies_us.is_empty() {
        return Ok(SurfaceHealthReport {
            device_name: device_name.to_string(),
            mount_point: mount_point.to_string(),
            total_bytes,
            smart_status: format!(
                "Volume vide ou aucun fichier lisible — S.M.A.R.T. : {}",
                real_smart
            ),
            nand_wear_percent: 0,
            avg_latency_us: 0,
            p99_latency_us: 0,
            max_latency_us: 0,
            slow_cells_count: 0,
            bad_sectors_count: 0,
            is_counterfeit_capacity: false,
            real_capacity_bytes: total_bytes,
            counterfeit_note:
                "Test de capacité non exécuté en mode lecture seule strict (utilisez HardHub pour un test d'écriture/vérification sur support vide)."
                    .to_string(),
            entropy_distribution: "Aucune donnée mesurée".to_string(),
            tested_blocks_grid: Vec::new(),
            auto_micro_scans: Vec::new(),
        });
    }

    let mut sorted = latencies_us.clone();
    sorted.sort_unstable();
    let avg_us = sorted.iter().sum::<u64>() / (sorted.len() as u64);
    let p99_us = sorted[((sorted.len() * 99) / 100).min(sorted.len() - 1)];
    let max_us = *sorted.last().unwrap_or(&avg_us);

    let avg_entropy = if entropy_samples > 0 {
        entropy_acc / (entropy_samples as f64)
    } else {
        0.0
    };

    let mut auto_micro_scans = Vec::new();
    for (probe_idx, file_path, offset) in slow_file_indices.into_iter().take(2) {
        if let Ok(micro) = probe_file_region_nocache(&file_path, offset, probe_idx, latencies_us.len()) {
            auto_micro_scans.push(micro);
        }
    }

    let smart_status = if critical_cells > 0 {
        format!(
            "{} erreur(s) ou latence(s) critique(s) (> 50 ms) sur {} sondes — S.M.A.R.T. : {}",
            critical_cells,
            latencies_us.len(),
            real_smart
        )
    } else if slow_cells > 0 {
        format!(
            "{} zone(s) lente(s) (10-50 ms) sur {} sondes — S.M.A.R.T. : {}",
            slow_cells,
            latencies_us.len(),
            real_smart
        )
    } else {
        format!(
            "Lecture saine ({} sondes physiques F_NOCACHE) — S.M.A.R.T. : {}",
            latencies_us.len(),
            real_smart
        )
    };

    Ok(SurfaceHealthReport {
        device_name: device_name.to_string(),
        mount_point: mount_point.to_string(),
        total_bytes,
        smart_status,
        nand_wear_percent: 0,
        avg_latency_us: avg_us,
        p99_latency_us: p99_us,
        max_latency_us: max_us,
        slow_cells_count: slow_cells,
        bad_sectors_count: critical_cells,
        is_counterfeit_capacity: false,
        real_capacity_bytes: total_bytes,
        counterfeit_note:
            "Test de capacité non exécuté en mode lecture seule strict (utilisez HardHub pour un test d'écriture/vérification sur support vide)."
                .to_string(),
        entropy_distribution: format!("{:.2} bits/octet", avg_entropy),
        tested_blocks_grid: grid,
        auto_micro_scans,
    })
}

fn probe_file_region_nocache(
    file_path: &Path,
    base_offset: u64,
    probe_index: usize,
    _probes_count: usize,
) -> Result<MicroScanResult, String> {
    let mut f = File::open(file_path).map_err(|e| e.to_string())?;
    set_fd_nocache(&f);
    let file_len = f.metadata().map(|m| m.len()).unwrap_or(0);
    let end_offset = (base_offset + 512 * 1024).min(file_len);
    let pages_to_test = 16usize;
    let mut bad_lbas = Vec::new();
    let mut buf = [0u8; 4096];

    for page_idx in 0..pages_to_test {
        let off = base_offset + (page_idx as u64) * 32768;
        if off >= file_len {
            break;
        }
        if f.seek(SeekFrom::Start(off)).is_err() {
            bad_lbas.push(off / 512);
            continue;
        }
        let t0 = Instant::now();
        match f.read(&mut buf) {
            Ok(_) => {
                if t0.elapsed().as_micros() >= 50_000 {
                    bad_lbas.push(off / 512);
                }
            }
            Err(_) => {
                bad_lbas.push(off / 512);
            }
        }
    }

    let bad_blocks_count = bad_lbas.len() as u32;
    let fname = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("fichier");

    let summary = if bad_blocks_count > 0 {
        format!(
            "Sonde ciblée sur {} : {} page(s) en erreur ou > 50 ms détectée(s). Créez immédiatement une image de sauvetage.",
            fname, bad_blocks_count
        )
    } else {
        format!(
            "Sonde ciblée sur {} : lecture secondaire confirmée sans erreur I/O ({} pages 4K testées).",
            fname, pages_to_test
        )
    };

    Ok(MicroScanResult {
        probe_index,
        start_byte: base_offset,
        end_byte: end_offset,
        slice_bytes: end_offset.saturating_sub(base_offset),
        start_lba: base_offset / 512,
        end_lba: end_offset / 512,
        tested_pages_count: pages_to_test,
        bad_lbas,
        bad_blocks_count,
        quarantined_bytes: 0,
        exact_dead_block_offset: base_offset,
        summary,
        is_pinpointed: bad_blocks_count > 0,
    })
}

/// Read-only micro-scan helper targeting real files on the volume.
pub fn run_targeted_micro_scan(
    mount_point: &str,
    _device_name: &str,
    total_bytes: u64,
    probe_index: usize,
    probes_count: usize,
) -> Result<MicroScanResult, String> {
    let count = probes_count.max(1);
    let slice_bytes = total_bytes / (count as u64);
    let start_byte = (probe_index as u64) * slice_bytes;
    let end_byte = ((probe_index as u64 + 1) * slice_bytes).min(total_bytes);

    let root = Path::new(mount_point);
    if root.exists() && root.is_dir() {
        for entry in WalkDir::new(root).max_depth(3).into_iter().flatten() {
            if entry.file_type().is_file() {
                if let Ok(res) = probe_file_region_nocache(entry.path(), 0, probe_index, count) {
                    return Ok(res);
                }
            }
        }
    }

    Ok(MicroScanResult {
        probe_index,
        start_byte,
        end_byte,
        slice_bytes: end_byte.saturating_sub(start_byte),
        start_lba: start_byte / 512,
        end_lba: end_byte / 512,
        tested_pages_count: 0,
        bad_lbas: Vec::new(),
        bad_blocks_count: 0,
        quarantined_bytes: 0,
        exact_dead_block_offset: 0,
        summary: "Aucun fichier lisible dans cette zone (mode lecture seule strict).".to_string(),
        is_pinpointed: false,
    })
}

/// HardRecover strictly operates read-only and refuses to write onto a failing drive.
pub fn quarantine_damaged_blocks(
    _mount_point: &str,
    _device_name: &str,
    _total_bytes: u64,
    _bad_sectors_count: u32,
    _method: &str,
    _device_type: Option<&str>,
) -> Result<QuarantineResult, String> {
    Err("Mode Lecture Seule Strict : HardRecover n'écrit jamais sur un support potentiellement défectueux. Sauvegardez une image disque puis reformatez ou remplacez le support."
        .to_string())
}

/// HardRecover strictly operates read-only and refuses to write onto a failing drive.
pub fn regenerate_fatigued_nand_blocks(
    _mount_point: &str,
    _device_name: &str,
    _total_bytes: u64,
    _slow_cells_count: u32,
    _device_type: Option<&str>,
) -> Result<NandRegenerationResult, String> {
    Err("Mode Lecture Seule Strict : HardRecover n'écrit jamais sur un support en cours de diagnostic. Sauvegardez vos données sur un autre disque."
        .to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MountedImageInfo {
    pub image_path: String,
    pub mount_point: String,
    pub disk_identifier: String,
    pub is_read_only: bool,
}

/// Mounts a rescue disk image (.img or .dmg) as a strictly read-only volume in macOS.
pub fn mount_disk_image_readonly(image_path: &str) -> Result<MountedImageInfo, String> {
    let p = Path::new(image_path);
    if !p.exists() {
        return Err(format!("Fichier image disque introuvable : {}", image_path));
    }

    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("/usr/bin/hdiutil")
            .args(["attach", "-readonly", "-plist", image_path])
            .output()
            .map_err(|e| format!("Échec d'exécution de hdiutil : {}", e))?;

        let stdout_str = String::from_utf8_lossy(&output.stdout);
        let stderr_str = String::from_utf8_lossy(&output.stderr);

        if !output.status.success() && !stdout_str.contains("<key>mount-point</key>") {
            return Err(format!(
                "Erreur lors du montage de l'image disque : {}",
                stderr_str.trim()
            ));
        }

        let mut mount_point = String::new();
        let mut disk_id = String::new();

        let lines: Vec<&str> = stdout_str.lines().collect();
        for (idx, line) in lines.iter().enumerate() {
            if line.contains("<key>mount-point</key>") && idx + 1 < lines.len() {
                let next = lines[idx + 1];
                if let Some(start) = next.find("<string>") {
                    if let Some(end) = next.find("</string>") {
                        mount_point = next[start + 8..end].to_string();
                    }
                }
            }
            if line.contains("<key>dev-entry</key>") && idx + 1 < lines.len() {
                let next = lines[idx + 1];
                if let Some(start) = next.find("<string>") {
                    if let Some(end) = next.find("</string>") {
                        disk_id = next[start + 8..end].to_string();
                    }
                }
            }
        }

        if mount_point.is_empty() {
            return Err(
                "Image attachée sans système de fichiers montable par macOS.".to_string(),
            );
        }

        Ok(MountedImageInfo {
            image_path: image_path.to_string(),
            mount_point,
            disk_identifier: if disk_id.is_empty() {
                "indisponible".to_string()
            } else {
                disk_id
            },
            is_read_only: true,
        })
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Montage hdiutil disponible uniquement sur macOS.".to_string())
    }
}

/// Unmounts and detaches a mounted rescue volume or disk image safely.
pub fn unmount_disk_image(target_mount_or_disk: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("/usr/bin/hdiutil")
            .args(["detach", target_mount_or_disk, "-force"])
            .output()
            .map_err(|e| format!("Échec du détachement hdiutil : {}", e))?;

        if !output.status.success() {
            let err_msg = String::from_utf8_lossy(&output.stderr);
            if !err_msg.contains("No such file or directory")
                && !err_msg.contains("not currently mounted")
            {
                return Err(format!("Erreur lors du démontage : {}", err_msg.trim()));
            }
        }
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = target_mount_or_disk;
        Ok(())
    }
}

/// Checks whether the current process is actually running as root (`geteuid() == 0`).
pub fn check_admin_privileges() -> bool {
    #[cfg(unix)]
    unsafe {
        libc::geteuid() == 0
    }
    #[cfg(not(unix))]
    {
        false
    }
}

pub fn request_admin_privileges() -> Result<bool, String> {
    Ok(check_admin_privileges())
}

pub fn revoke_admin_privileges() -> Result<bool, String> {
    Ok(true)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForensicCertificateRequest {
    pub device_name: String,
    pub bsd_name: String,
    pub file_system: String,
    pub total_bytes: u64,
    pub serial_number: Option<String>,
    pub vendor: Option<String>,
    pub smart_status: String,
    pub health_score: u8,
    pub bad_sectors_count: u32,
    pub quarantined_clusters: u32,
    pub image_path: Option<String>,
    pub output_dir: String,
    pub device_type: Option<String>,
}

fn escape_html(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}

fn stream_hash_image_file(path: &Path) -> Result<(String, String), String> {
    let mut f = File::open(path).map_err(|e| e.to_string())?;
    set_fd_nocache(&f);
    let mut sha = Sha256::new();
    let mut xxh = Xxh3::new();
    let mut buf = vec![0u8; 1024 * 1024];
    loop {
        let n = f.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        sha.update(&buf[..n]);
        xxh.update(&buf[..n]);
    }
    let sha_hex = format!("{:x}", sha.finalize());
    let xxh_hex = format!("{:016x}", xxh.digest());
    Ok((sha_hex, xxh_hex))
}

/// Generates an honest, XSS-safe technical HTML report with real cryptographic digests
/// when an image file is present on disk.
pub fn generate_certified_forensic_report(
    req: &ForensicCertificateRequest,
) -> Result<String, String> {
    let out_folder = if req.output_dir.trim().is_empty() {
        std::env::var("HOME")
            .map(|h| PathBuf::from(h).join("Desktop"))
            .unwrap_or_else(|_| std::env::temp_dir())
    } else {
        PathBuf::from(&req.output_dir)
    };
    fs::create_dir_all(&out_folder).map_err(|e| e.to_string())?;

    let stamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let display_date = Local::now().format("%d/%m/%Y à %H:%M:%S").to_string();

    let (sha256_hash, xxh3_hash) = if let Some(ref img_p) = req.image_path {
        let p = Path::new(img_p);
        if p.exists() && p.is_file() {
            stream_hash_image_file(p).unwrap_or_else(|_| {
                (
                    "Erreur de lecture lors du hachage".to_string(),
                    "Erreur de lecture".to_string(),
                )
            })
        } else {
            (
                "Aucune image disque associée à ce rapport".to_string(),
                "Aucune image disque associée à ce rapport".to_string(),
            )
        }
    } else {
        (
            "Aucune image disque associée à ce rapport".to_string(),
            "Aucune image disque associée à ce rapport".to_string(),
        )
    };

    let safe_device: String = req
        .device_name
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let file_name = format!("RAPPORT_TECHNIQUE_HARDRECOVER_{}_{}.html", safe_device, stamp);
    let report_file_path = out_folder.join(file_name);

    let is_hdd = req.device_type.as_deref() == Some("hdd");
    let compliance_text = if is_hdd {
        "Audit réalisé localement en mode lecture seule strict (F_NOCACHE). Les mesures reflètent uniquement les lectures physiques exécutées sur les fichiers accessibles du support."
    } else {
        "Audit réalisé localement en mode lecture seule strict (F_NOCACHE). Aucune écriture ni modification de table de partition n'a été effectuée sur le support analysé."
    };

    let vendor_raw = req
        .vendor
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("Non communiqué par le contrôleur");
    let serial_raw = req
        .serial_number
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("Non communiqué par le contrôleur");
    let image_raw = req
        .image_path
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("Aucune image disque associée");

    let html_content = format!(
        r#"<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport Technique — {device_name}</title>
  <style>
    @media print {{
      body {{ background: #fff !important; color: #000 !important; margin: 0; padding: 20px; }}
      .no-print {{ display: none !important; }}
      .card {{ border: 1px solid #ccc !important; box-shadow: none !important; background: #fff !important; color: #000 !important; }}
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #121212;
      color: #EDEDEC;
      margin: 0;
      padding: 40px;
      line-height: 1.5;
    }}
    .container {{ max-width: 900px; margin: 0 auto; }}
    .card {{
      background: #1C1C1C;
      border: 1px solid #2F2F2F;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }}
    .header-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #2F2F2F;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }}
    .badge {{
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
    }}
    .badge-green {{ background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #34D399; }}
    .badge-blue {{ background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.4); color: #60A5FA; }}
    h1 {{ font-size: 20px; margin: 0; color: #EDEDEC; font-weight: 800; }}
    h2 {{ font-size: 14px; margin: 0 0 14px 0; color: #F59E0B; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; }}
    .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }}
    .prop-row {{ display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid #262626; font-size: 13px; }}
    .prop-label {{ color: #9B9A97; }}
    .prop-val {{ font-family: ui-monospace, Menlo, Monaco, monospace; color: #EDEDEC; font-weight: 600; text-align: right; }}
    .hash-box {{ background: #0E0E0E; border: 1px solid #242424; padding: 12px; border-radius: 10px; font-family: ui-monospace, Menlo, Monaco, monospace; font-size: 11px; color: #60A5FA; word-break: break-all; margin-top: 8px; }}
    .btn-print {{ background: #10B981; color: #000; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 13px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header-bar">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #10B981; font-weight: 800; margin-bottom: 4px;">
            HARD SUITE — HARDRECOVER DIAGNOSTIC
          </div>
          <h1>Rapport Technique d'Inspection Locale</h1>
          <div style="font-size: 12px; color: #9B9A97; margin-top: 4px;">
            Généré le {display_date} • Rapport technique généré localement par HardRecover
          </div>
        </div>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">Imprimer / Sauvegarder PDF</button>
        </div>
      </div>

      <div class="grid-2">
        <div>
          <h2>1. Identité du Support</h2>
          <div class="prop-row"><span class="prop-label">Nom Commercial :</span><span class="prop-val">{device_name}</span></div>
          <div class="prop-row"><span class="prop-label">Identifiant BSD macOS :</span><span class="prop-val">/dev/{bsd_name}</span></div>
          <div class="prop-row"><span class="prop-label">Fabricant / Marque :</span><span class="prop-val">{vendor}</span></div>
          <div class="prop-row"><span class="prop-label">Numéro de Série :</span><span class="prop-val">{serial}</span></div>
          <div class="prop-row"><span class="prop-label">Système de Fichiers :</span><span class="prop-val">{file_system}</span></div>
          <div class="prop-row"><span class="prop-label">Capacité Déclarée :</span><span class="prop-val">{total_formatted}</span></div>
        </div>

        <div>
          <h2>2. Audit de Lecture &amp; Politique d'Accès</h2>
          <div class="prop-row"><span class="prop-label">Statut S.M.A.R.T. :</span><span class="prop-val badge badge-green">{smart_status}</span></div>
          <div class="prop-row"><span class="prop-label">Indice observé :</span><span class="prop-val badge badge-green">{health_score} %</span></div>
          <div class="prop-row"><span class="prop-label">Erreurs / Latences Critiques :</span><span class="prop-val">{bad_sectors}</span></div>
          <div class="prop-row"><span class="prop-label">Test Contrefaçon Écriture :</span><span class="prop-val badge badge-blue">Non exécuté (Mode Lecture Seule Strict)</span></div>
          <div class="prop-row"><span class="prop-label">Politique d'Accès :</span><span class="prop-val">Lecture seule stricte (aucune écriture sur le support)</span></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>3. Image Disque &amp; Empreintes Cryptographiques</h2>
      <div style="font-size: 12px; font-weight: 700; color: #EDEDEC; margin-top: 10px;">
        Empreinte SHA-256 :
      </div>
      <div class="hash-box">{sha256_hash}</div>

      <div style="font-size: 12px; font-weight: 700; color: #EDEDEC; margin-top: 14px;">
        Empreinte XXH3-64 :
      </div>
      <div class="hash-box">{xxh3_hash}</div>

      <div class="prop-row" style="margin-top: 16px;">
        <span class="prop-label">Fichier Image Disque :</span>
        <span class="prop-val">{image_path}</span>
      </div>
    </div>

    <div class="card">
      <h2>4. Méthodologie &amp; Portée</h2>
      <p style="font-size: 12px; color: #9B9A97; line-height: 1.6;">
        {compliance_text}
      </p>
    </div>
  </div>
</body>
</html>"#,
        device_name = escape_html(&req.device_name),
        display_date = escape_html(&display_date),
        bsd_name = escape_html(&req.bsd_name),
        vendor = escape_html(vendor_raw),
        serial = escape_html(serial_raw),
        file_system = escape_html(&req.file_system),
        total_formatted = escape_html(&format_bytes_display(req.total_bytes)),
        smart_status = escape_html(&req.smart_status),
        health_score = req.health_score,
        bad_sectors = req.bad_sectors_count,
        sha256_hash = escape_html(&sha256_hash),
        xxh3_hash = escape_html(&xxh3_hash),
        image_path = escape_html(image_raw),
        compliance_text = escape_html(compliance_text),
    );

    fs::write(&report_file_path, html_content).map_err(|e| e.to_string())?;

    Ok(report_file_path.to_string_lossy().to_string())
}

fn format_bytes_display(bytes: u64) -> String {
    let k = 1024u64;
    if bytes >= k * k * k * k {
        format!("{:.2} To", bytes as f64 / (k * k * k * k) as f64)
    } else if bytes >= k * k * k {
        format!("{:.2} Go", bytes as f64 / (k * k * k) as f64)
    } else if bytes >= k * k {
        format!("{:.1} Mo", bytes as f64 / (k * k) as f64)
    } else {
        format!("{} octets", bytes)
    }
}
