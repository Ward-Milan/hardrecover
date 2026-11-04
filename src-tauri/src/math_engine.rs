/// Mathematical & Statistical Forensic Primitives for HardRecover
/// Implements:
/// 1. Shannon Entropy H(X) in [0, 8] bits/byte & Chi-Square Uniformity Test
/// 2. Jensen-Shannon Divergence D_JS(P || Q) for fragmented cluster reassembly
/// 3. Exponential Bad-Sector Jump Step S_k = min(S_max, S_0 * 2^min(k, k_max))
/// 4. Discrete PCM Autocorrelation E(C, b) for headerless audio parameter inference
/// 5. Multi-Signature Magic Bytes Detector for File Carving

#[derive(Debug, Clone)]
pub struct BlockEntropyMetrics {
    pub entropy_bits: f64,
    pub chi_square: f64,
    pub is_all_zero: bool,
    pub classification: &'static str,
}

/// Computes Shannon Entropy H(C) and Chi-Square statistic on a byte slice.
pub fn analyze_block_entropy(data: &[u8]) -> BlockEntropyMetrics {
    if data.is_empty() {
        return BlockEntropyMetrics {
            entropy_bits: 0.0,
            chi_square: 0.0,
            is_all_zero: true,
            classification: "Vide (0 octet)",
        };
    }

    // Fast all-zero or constant byte check
    let first = data[0];
    if data.iter().all(|&b| b == first) {
        return BlockEntropyMetrics {
            entropy_bits: 0.0,
            chi_square: 0.0,
            is_all_zero: first == 0,
            classification: if first == 0 {
                "Secteur vierge (0x00)"
            } else {
                "Secteur constant (0xFF)"
            },
        };
    }

    let mut counts = [0u32; 256];
    for &b in data {
        counts[b as usize] += 1;
    }

    let len_f = data.len() as f64;
    let expected = len_f / 256.0;
    let mut entropy = 0.0f64;
    let mut chi_sq = 0.0f64;

    for &c in &counts {
        if c > 0 {
            let p = (c as f64) / len_f;
            entropy -= p * p.log2();
        }
        let diff = (c as f64) - expected;
        chi_sq += (diff * diff) / expected;
    }

    let classification = if entropy < 1.0 {
        "Table d'allocation / Padding faible densité"
    } else if entropy <= 5.2 {
        "Métadonnées FS / B-Tree / Structure XML"
    } else if entropy <= 7.45 {
        "Flux PCM Audio / Matrice RAW non compressée"
    } else if entropy <= 7.985 {
        "Bitstream Vidéo/Image compressé (H.264/HEVC/ProRes/JPEG)"
    } else if chi_sq < 310.0 {
        "Bloc chiffré haute entropie ou bruit pseudo-aléatoire"
    } else {
        "Flux média haute densité"
    };

    BlockEntropyMetrics {
        entropy_bits: (entropy * 1000.0).round() / 1000.0,
        chi_square: (chi_sq * 10.0).round() / 10.0,
        is_all_zero: false,
        classification,
    }
}

/// Computes normalized byte histogram P(x) for a slice.
pub fn compute_distribution(data: &[u8]) -> [f64; 256] {
    let mut dist = [0.0f64; 256];
    if data.is_empty() {
        return dist;
    }
    let mut counts = [0u32; 256];
    for &b in data {
        counts[b as usize] += 1;
    }
    let inv = 1.0 / (data.len() as f64);
    for i in 0..256 {
        dist[i] = (counts[i] as f64) * inv;
    }
    dist
}

/// Computes Jensen-Shannon Divergence D_JS(P || Q) in [0, 1] between two byte distributions.
/// Used to evaluate statistical continuity between the tail of fragment F_u and head of F_v.
pub fn jensen_shannon_divergence(p: &[f64; 256], q: &[f64; 256]) -> f64 {
    let mut kl_pm = 0.0f64;
    let mut kl_qm = 0.0f64;
    for i in 0..256 {
        let m = 0.5 * (p[i] + q[i]);
        if m > 1e-12 {
            if p[i] > 1e-12 {
                kl_pm += p[i] * (p[i] / m).log2();
            }
            if q[i] > 1e-12 {
                kl_qm += q[i] * (q[i] / m).log2();
            }
        }
    }
    0.5 * (kl_pm + kl_qm)
}

/// Computes total fragment join divergence score D(F_u, F_v):
/// D(F_u, F_v) = w1 * Phi_syn + w2 * D_JS(P_u || P_v) + w3 * ln(1 + |LBA_v - LBA_u|)
pub fn fragment_join_divergence_score(
    tail_u: &[u8],
    head_v: &[u8],
    lba_end_u: u64,
    lba_start_v: u64,
) -> f64 {
    let p_u = compute_distribution(tail_u);
    let p_v = compute_distribution(head_v);
    let d_js = jensen_shannon_divergence(&p_u, &p_v);

    // Syntactic continuity bonus if NAL unit / frame boundary transitions cleanly
    let mut phi_syn = 0.35;
    if head_v.len() >= 4 {
        if head_v[0..4] == [0x00, 0x00, 0x00, 0x01]
            || head_v[0..3] == [0x00, 0x00, 0x01]
            || &head_v[4..8.min(head_v.len())] == b"icpf"
        {
            phi_syn = 0.05; // Clean NAL or ProRes frame boundary
        }
    }

    let delta_lba = lba_start_v.abs_diff(lba_end_u) as f64;
    let lba_penalty = (1.0 + delta_lba).ln() * 0.02;

    0.45 * phi_syn + 0.40 * d_js + 0.15 * lba_penalty
}

/// Exponential Bad-Sector Jump Step:
/// S_k = min(S_max, S_0 * 2^min(k, k_max))
pub fn compute_exponential_skip_sectors(
    consecutive_errors: u32,
    s0_sectors: u64,
    s_max_sectors: u64,
) -> u64 {
    let exp = consecutive_errors.min(12);
    let step = s0_sectors.saturating_mul(1u64 << exp);
    step.min(s_max_sectors).max(1)
}

#[derive(Debug, Clone)]
pub struct InferredPcmFormat {
    pub channels: u16,
    pub bits_per_sample: u16,
    pub sample_rate: u32,
    pub normalized_diff_energy: f64,
}

/// Discrete Autocorrelation for Raw PCM Audio Inference:
/// Evaluates E(C, b) = (1/M) * sum (Sample_b(n + C) - Sample_b(n))^2 / Var(Sample_b)
/// to determine the exact channel count C and bit depth b on headerless WAV/BWF streams.
pub fn infer_raw_pcm_parameters(raw_audio: &[u8]) -> InferredPcmFormat {
    let window = if raw_audio.len() > 16384 {
        &raw_audio[..16384]
    } else {
        raw_audio
    };

    if window.len() < 256 {
        return InferredPcmFormat {
            channels: 2,
            bits_per_sample: 24,
            sample_rate: 48000,
            normalized_diff_energy: 0.12,
        };
    }

    let candidate_channels: [usize; 4] = [1, 2, 4, 8];
    let candidate_bytes: [usize; 2] = [2, 3]; // 16-bit and 24-bit PCM

    let mut best_score = f64::MAX;
    let mut best_ch = 2u16;
    let mut best_bits = 16u16;

    for &b in &candidate_bytes {
        for &ch in &candidate_channels {
            let stride = ch * b;
            if window.len() < stride * 16 {
                continue;
            }
            let num_frames = (window.len() / stride).min(256);
            let mut diff_sq_sum = 0.0f64;
            let mut val_sq_sum = 0.0f64;

            for n in 0..(num_frames - 1) {
                let idx1 = n * stride;
                let idx2 = (n + 1) * stride;

                let s1 = decode_pcm_sample(&window[idx1..idx1 + b]);
                let s2 = decode_pcm_sample(&window[idx2..idx2 + b]);
                let d = s2 - s1;
                diff_sq_sum += d * d;
                val_sq_sum += s1 * s1;
            }

            if val_sq_sum > 1e-6 {
                let ratio = diff_sq_sum / val_sq_sum;
                if ratio < best_score {
                    best_score = ratio;
                    best_ch = ch as u16;
                    best_bits = (b * 8) as u16;
                }
            }
        }
    }

    InferredPcmFormat {
        channels: best_ch,
        bits_per_sample: best_bits,
        sample_rate: 48000, // Broadcast standard default
        normalized_diff_energy: (best_score * 1000.0).round() / 1000.0,
    }
}

fn decode_pcm_sample(bytes: &[u8]) -> f64 {
    match bytes.len() {
        2 => i16::from_le_bytes([bytes[0], bytes[1]]) as f64 / 32768.0,
        3 => {
            let v = ((bytes[2] as i32) << 24)
                | ((bytes[1] as i32) << 16)
                | ((bytes[0] as i32) << 8);
            (v >> 8) as f64 / 8_388_608.0
        }
        _ => 0.0,
    }
}

/// Formats the first N bytes of a buffer into a clean hexadecimal string.
pub fn format_hex_preview(data: &[u8], max_bytes: usize) -> String {
    let take = data.len().min(max_bytes);
    data[..take]
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect::<Vec<_>>()
        .join(" ")
}

#[derive(Debug, Clone)]
pub struct CarvedSignatureMatch {
    pub extension: &'static str,
    pub category: &'static str,
    pub description: &'static str,
}

/// Detects known file signatures (Magic Bytes) at the beginning of a sector/buffer.
pub fn detect_magic_signature(buf: &[u8]) -> Option<CarvedSignatureMatch> {
    if buf.len() < 16 {
        return None;
    }

    // ISO-BMFF: MOV / MP4 / CR3 / HEIC ("ftyp" at offset 4, or "moov"/"mdat"/"wide" for headerless streams)
    if &buf[4..8] == b"ftyp" {
        let brand = &buf[8..12];
        if brand == b"qt  " {
            return Some(CarvedSignatureMatch {
                extension: "mov",
                category: "video",
                description: "Conteneur Apple QuickTime (.MOV)",
            });
        } else if brand == b"crx " {
            return Some(CarvedSignatureMatch {
                extension: "cr3",
                category: "photo_raw",
                description: "Canon RAW v3 ISO-BMFF (.CR3)",
            });
        } else if brand == b"heic" || brand == b"mif1" {
            return Some(CarvedSignatureMatch {
                extension: "heic",
                category: "photo_raster",
                description: "Image HEIF/HEIC Haute Efficacité",
            });
        } else {
            return Some(CarvedSignatureMatch {
                extension: "mp4",
                category: "video",
                description: "Conteneur Vidéo ISO-BMFF (.MP4)",
            });
        }
    }

    if &buf[4..8] == b"mdat" || &buf[4..8] == b"wide" || &buf[4..8] == b"moov" {
        return Some(CarvedSignatureMatch {
            extension: "mov",
            category: "video",
            description: "Flux Vidéo QuickTime/MP4 (Atome mdat/moov direct)",
        });
    }

    // SMPTE MXF Partition Pack Header: 06 0E 2B 34 02 05 01 01
    if buf[0..8] == [0x06, 0x0E, 0x2B, 0x34, 0x02, 0x05, 0x01, 0x01] {
        return Some(CarvedSignatureMatch {
            extension: "mxf",
            category: "video",
            description: "Conteneur Broadcast SMPTE MXF (OP1a / OP-Atom)",
        });
    }

    // RED Digital Cinema R3D ("RED2" or "RED1")
    if &buf[4..8] == b"RED2" || &buf[0..4] == b"RED2" {
        return Some(CarvedSignatureMatch {
            extension: "r3d",
            category: "video",
            description: "Cinéma REDcode RAW (.R3D)",
        });
    }

    // TIFF / Camera RAW (Sony ARW, Nikon NEF, Canon CR2, Adobe DNG)
    if buf[0..4] == [0x49, 0x49, 0x2A, 0x00] || buf[0..4] == [0x4D, 0x4D, 0x00, 0x2A] {
        if &buf[8..10] == b"CR" {
            return Some(CarvedSignatureMatch {
                extension: "cr2",
                category: "photo_raw",
                description: "Canon RAW TIFF-EP (.CR2)",
            });
        }
        return Some(CarvedSignatureMatch {
            extension: "arw",
            category: "photo_raw",
            description: "Photographie RAW TIFF/IFD (.ARW / .DNG / .NEF)",
        });
    }

    // Fujifilm RAF ("FUJIFILMCCD-RAW")
    if buf.starts_with(b"FUJIFILMCCD-RAW") {
        return Some(CarvedSignatureMatch {
            extension: "raf",
            category: "photo_raw",
            description: "Fujifilm RAW (.RAF)",
        });
    }

    // JPEG (FF D8 FF)
    if buf[0..3] == [0xFF, 0xD8, 0xFF] {
        return Some(CarvedSignatureMatch {
            extension: "jpg",
            category: "photo_raster",
            description: "Image JPEG (Marqueur SOI 0xFFD8)",
        });
    }

    // PNG
    if buf[0..8] == [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] {
        return Some(CarvedSignatureMatch {
            extension: "png",
            category: "photo_raster",
            description: "Image PNG Sans Perte",
        });
    }

    // RIFF WAVE / BWF Audio
    if &buf[0..4] == b"RIFF" && &buf[8..12] == b"WAVE" {
        return Some(CarvedSignatureMatch {
            extension: "wav",
            category: "audio",
            description: "Audio Broadcast PCM (.WAV / .BWF)",
        });
    }

    // RF64 Broadcast Wave (> 4 GB)
    if &buf[0..4] == b"RF64" && &buf[8..12] == b"WAVE" {
        return Some(CarvedSignatureMatch {
            extension: "wav",
            category: "audio",
            description: "Audio Broadcast RF64 64-bit (.WAV)",
        });
    }

    None
}

