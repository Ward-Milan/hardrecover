export interface StorageDevice {
  id: string;
  name: string;
  mountPoint: string;
  bsdName: string; // e.g. "disk4s1" or "disk4"
  rawDevicePath: string; // e.g. "/dev/rdisk4"
  fileSystem: string;
  partitionScheme: string; // "GPT" | "MBR" | "APFS Container" | "RAW"
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
  blockSize: number;
  isRemovable: boolean;
  isMounted: boolean;
  deviceType: string; // "sd_card" | "ssd" | "hdd" | "internal_ssd" | "raw_image"
  protocolLabel: string;
  smartStatus: "Verified" | "Warning" | "Failing" | "Simulated";
  healthPercent: number;
  temperatureC: number | null;
}

export type ScanMode = "quick_and_deep" | "deep_carving_only" | "partition_rebuild" | "demo";

export type FileCategory = "video" | "photo_raw" | "photo_raster" | "audio" | "document" | "other";

export type IntegrityStatus = "intact" | "reconstructed" | "fragmented" | "damaged_header";

export interface RecoverableFileItem {
  id: string;
  name: string;
  extension: string;
  category: FileCategory;
  folderPath: string; // e.g. "DCIM/100MSDCF" or "Carved/MOV_ProRes"
  sourcePath: string | null; // if accessible on disk or carved virtual offset
  sizeBytes: number;
  lbaOffset: number;
  clusterCount: number;
  fragmentCount: number;
  entropyScore: number; // 0.0 - 8.0 bits/byte
  integrity: IntegrityStatus;
  recoveryProbability: number; // 0 - 100%
  isDeleted: boolean;
  modifiedAt: string;
  codecOrFormatInfo: string; // e.g. "H.265 10-bit 4:2:2 • 3840×2160 • 23.976 fps"
  headerHexPreview: string; // First 64 bytes hex dump
  needsSurgicalRepair: boolean;
  healthBadge?: "intact" | "needs_repair" | "corrupted";
  isProxyOrThumb?: boolean;
}

export interface RecoveryScanJob {
  id: string;
  deviceName: string;
  devicePath: string;
  scanMode: ScanMode;
  status: "scanning_fs" | "deep_carving" | "defragmenting" | "paused" | "completed" | "cancelled" | "failed";
  phaseLabel: string;
  scannedBytes: number;
  totalBytes: number;
  speedBps: number;
  etaSeconds: number | null;
  badSectorsCount: number;
  partitionsFound: number;
  filesFoundCount: number;
  totalRecoverableBytes: number;
  sectorMapSample: number[]; // 0=unscanned, 1=healthy_data, 2=free_zero, 3=carved_signature, 4=slow_sector, 5=bad_sector
  items: RecoverableFileItem[];
  startedAt: string;
}

export interface RecoveryExportResult {
  recoveredCount: number;
  totalBytesWritten: number;
  autoRepairedCount: number;
  destinationFolder: string;
  reportPath: string;
}

export interface AtomNode {
  fourcc: string;
  offset: number;
  size: number;
  status: "valid" | "missing" | "truncated" | "synthesized";
  description: string;
}

export interface MediaRepairItem {
  id: string;
  path: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
  mediaType: "video" | "photo_raw" | "audio";
  healthStatus: "corrupted" | "healthy" | "repaired" | "repairing" | "failed";
  corruptionSeverity: "critical" | "moderate" | "minor" | "none";
  anomalySummary: string;
  diagnosticDetails: string[];
  detectedCodec: string;
  resolutionOrSampleRate: string;
  entropyBitsPerByte: number;
  chiSquareScore: number;
  mdatOffset: number | null;
  mdatSize: number | null;
  moovPresent: boolean;
  ftypPresent: boolean;
  estimatedFramesOrSamples: number;
  atoms: AtomNode[];
  headerHex: string;
  repairedOutputPath: string | null;
  repairLog: string[];
}

export interface ReferenceFileInspection {
  path: string;
  fileName: string;
  sizeBytes: number;
  detectedCodec: string;
  resolutionOrSampleRate: string;
  timescale: number;
  frameDuration: number;
  hasValidMoov: boolean;
  hasValidStsd: boolean;
  summary: string;
}

export interface DiskImageJobState {
  id: string;
  sourceDeviceName: string;
  sourcePath: string;
  outputImagePath: string;
  mapFilePath: string;
  status: "phase1_sweep" | "phase2_trim" | "phase3_scrape" | "phase4_retry" | "completed" | "paused" | "failed";
  phaseLabel: string;
  processedBytes: number;
  totalBytes: number;
  speedBps: number;
  etaSeconds: number | null;
  healthyBlocks: number;
  slowBlocks: number;
  badSectors: number;
  currentSkipStepSectors: number;
  sectorGrid: number[]; // 240 cells: 0=pending, 1=healthy, 2=slow_nand, 3=bad_sector, 4=skipped_jump
}

export interface SurfaceHealthReport {
  deviceName: string;
  mountPoint: string;
  totalBytes: number;
  smartStatus: string;
  nandWearPercent: number;
  avgLatencyUs: number;
  p99LatencyUs: number;
  maxLatencyUs: number;
  slowCellsCount: number;
  badSectorsCount: number;
  isCounterfeitCapacity: boolean;
  realCapacityBytes: number;
  counterfeitNote: string;
  entropyDistribution: string;
  testedBlocksGrid: number[]; // 1=fast (<1ms), 2=normal (1-5ms), 3=weak_nand (5-50ms), 4=critical (>50ms or error)
  autoMicroScans: MicroScanResult[];
}

export interface QuarantineResult {
  deviceName: string;
  originalBytes: number;
  quarantinedBytes: number;
  usableBytes: number;
  isolatedClustersCount: number;
  isolationMethod: string;
  summary: string;
  stepsPerformed: string[];
}

export interface MicroScanResult {
  probeIndex: number;
  startByte: number;
  endByte: number;
  sliceBytes: number;
  startLba: number;
  endLba: number;
  testedPagesCount: number;
  badLbas: number[];
  badBlocksCount: number;
  quarantinedBytes: number;
  exactDeadBlockOffset: number;
  summary: string;
  isPinpointed: boolean;
}

export interface NandRegenerationResult {
  deviceName: string;
  mountPoint: string;
  regeneratedBlocksCount: number;
  regeneratedBytes: number;
  avgLatencyBeforeUs: number;
  avgLatencyAfterUs: number;
  speedupFactor: number;
  summary: string;
  details: string[];
}

export interface SavedSessionEntry {
  id: string;
  timestamp: string;
  sessionType: "recovery" | "repair" | "imaging";
  targetName: string;
  targetPath: string;
  filesProcessed: number;
  totalBytes: number;
  statusLabel: string;
  destinationPath: string | null;
  reportPath: string | null;
}

export interface AppSettings {
  defaultExportDir: string;
  badSectorTimeoutMs: number;
  initialJumpSectors: number;
  maxJumpSectors: number;
  autoRepairCarvedMedia: boolean;
  bypassOsCache: boolean;
  generateForensicReport: boolean;
}

export interface MountedImageInfo {
  imagePath: string;
  mountPoint: string;
  diskIdentifier: string;
  isReadOnly: boolean;
}

export interface ForensicCertificateRequest {
  deviceName: string;
  bsdName: string;
  fileSystem: string;
  totalBytes: number;
  serialNumber?: string;
  vendor?: string;
  smartStatus: string;
  healthScore: number;
  badSectorsCount: number;
  quarantinedClusters: number;
  imagePath?: string;
  outputDir: string;
}

export interface UpdateCheckInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  assetName: string;
  assetSize: number;
  assetUpdatedAt: string;
  downloadUrl: string;
}


