import React, { useEffect, useState, useCallback, useMemo } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open } from "@tauri-apps/plugin-dialog";
import {
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Play,
  FileText,
  Trash2,
  Plus,
  ShieldCheck,
  Sparkles,
  Filter,
  Clock,
  X,
  Film,
  Settings,
  HardDrive,
  FolderTree,
  Search,
  Wrench,
  Activity,
  Cpu,
  Layers,
  CheckSquare,
  Square,
  ArrowLeft,
  Eye,
  FileCode,
  Disc,
  Music,
  Image as ImageIcon,
  ExternalLink,
  Sliders,
  Zap,
  Info,
  Home,
  Award,
  FileCheck,
  Lock,
  Unlock,
  Printer,
} from "lucide-react";
import {
  StorageDevice,
  RecoveryScanJob,
  RecoverableFileItem,
  RecoveryExportResult,
  MediaRepairItem,
  ReferenceFileInspection,
  DiskImageJobState,
  SurfaceHealthReport,
  QuarantineResult,
  MicroScanResult,
  NandRegenerationResult,
  SavedSessionEntry,
  AppSettings,
  ScanMode,
  MountedImageInfo,
  ForensicCertificateRequest,
} from "./types";
import { HardRecoverLogo } from "./Logo";
import { ToolInfoModal } from "./ToolInfoModal";

/* ================= CUSTOM VISUAL STORAGE LOGOS (SUITE HARD SIGNATURE) ================= */

function SdCardLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6 3H14.8L19 7.2V19C19 20.1 18.1 21 17 21H6C4.9 21 4 20.1 4 19V5C4 3.9 4.9 3 6 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 6.5V9.5M10 6.5V9.5M12.5 6.5V9.5M15 7.5V9.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect
        x="7"
        y="13"
        width="9"
        height="4.5"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function SsdLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M13 8.5L9.5 12.5H12.5L11 15.5L14.5 11.5H11.5L13 8.5Z"
        fill="currentColor"
      />
      <circle cx="6.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="17.5" cy="15.5" r="1" fill="currentColor" />
    </svg>
  );
}

function HddLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <circle cx="12" cy="10.5" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="10.5" r="1.2" fill="currentColor" />
      <path
        d="M15.5 16.5L13.2 12.8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="8" cy="17.5" r="1" fill="currentColor" />
    </svg>
  );
}

function EjectIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 5L4.5 14H19.5L12 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M5 18.5H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DeviceVisualIcon({
  deviceType,
  className = "w-5 h-5",
}: {
  deviceType: string;
  className?: string;
}) {
  if (deviceType === "sd_card") return <SdCardLogo className={className} />;
  if (deviceType === "hdd") return <HddLogo className={className} />;
  return <SsdLogo className={className} />;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 o";
  const k = 1024;
  const units = ["o", "Ko", "Mo", "Go", "To"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i >= 3 ? 2 : 1)} ${units[i]}`;
}

function formatSpeed(bps: number): string {
  if (!bps || bps <= 0) return "0.0 Mo/s";
  const mbps = bps / (1024 * 1024);
  if (mbps >= 1024) {
    return `${(mbps / 1024).toFixed(2)} Go/s`;
  }
  return `${mbps.toFixed(1)} Mo/s`;
}

type ActiveTab = "home" | "recovery" | "repair" | "surface" | "sessions";

export default function App() {
  /* ================= NAVIGATION & GLOBAL STATE ================= */
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [devices, setDevices] = useState<StorageDevice[]>([]);
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isAdminElevated, setIsAdminElevated] = useState<boolean>(false);
  const [mountedImage, setMountedImage] = useState<MountedImageInfo | null>(null);
  const [isMountingImage, setIsMountingImage] = useState<boolean>(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState<boolean>(false);
  const [settings, setSettings] = useState<AppSettings>({
    defaultExportDir: "",
    badSectorTimeoutMs: 250,
    initialJumpSectors: 64,
    maxJumpSectors: 32768,
    autoRepairCarvedMedia: true,
    bypassOsCache: true,
    generateForensicReport: true,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeToolModal, setActiveToolModal] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SavedSessionEntry[]>([]);

  /* ================= ATELIER 1: DATA RECOVERY STATE ================= */
  const [scanMode, setScanMode] = useState<ScanMode>("quick_and_deep");
  const [isScanning, setIsScanning] = useState(false);
  const [activeScanJob, setActiveScanJob] = useState<RecoveryScanJob | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [inspectedFile, setInspectedFile] = useState<RecoverableFileItem | null>(null);
  const [treeMode, setTreeMode] = useState<"type" | "folder">("type");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>("all");
  const [onlyDeletedFilter, setOnlyDeletedFilter] = useState<boolean>(false);
  const [hideProxiesFilter, setHideProxiesFilter] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRecoveringExport, setIsRecoveringExport] = useState<boolean>(false);
  const [lastExportResult, setLastExportResult] = useState<RecoveryExportResult | null>(null);

  /* ================= ATELIER 2: MEDIA REPAIR STATE ================= */
  const [repairItems, setRepairItems] = useState<MediaRepairItem[]>([]);
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<ReferenceFileInspection | null>(null);
  const [repairOutputDir, setRepairOutputDir] = useState<string>("");
  const [isRepairingBatch, setIsRepairingBatch] = useState<boolean>(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [previewMediaTitle, setPreviewMediaTitle] = useState<string>("");

  /* ================= ATELIER 3: SURFACE & IMAGER STATE ================= */
  const [selectedSurfaceDevice, setSelectedSurfaceDevice] = useState<StorageDevice | null>(null);
  const [isImagingDrive, setIsImagingDrive] = useState<boolean>(false);
  const [diskImageJob, setDiskImageJob] = useState<DiskImageJobState | null>(null);
  const [isRunningSurfaceCheck, setIsRunningSurfaceCheck] = useState<boolean>(false);
  const [surfaceReport, setSurfaceReport] = useState<SurfaceHealthReport | null>(null);
  const [isQuarantining, setIsQuarantining] = useState<boolean>(false);
  const [quarantineResult, setQuarantineResult] = useState<QuarantineResult | null>(null);
  const [isRegeneratingNand, setIsRegeneratingNand] = useState<boolean>(false);
  const [regenerationResult, setRegenerationResult] = useState<NandRegenerationResult | null>(null);

  const showToast = useCallback((msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 3600);
  }, []);

  const refreshDevices = useCallback(async () => {
    setIsRefreshingDevices(true);
    try {
      const list = await invoke<StorageDevice[]>("get_storage_devices");
      setDevices(list);
      setSelectedSurfaceDevice((prev) => prev || list[0] || null);
    } catch (err) {
      console.error("Failed to list devices:", err);
    } finally {
      setIsRefreshingDevices(false);
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const list = await invoke<SavedSessionEntry[]>("get_saved_sessions");
      setSessions(list);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
    refreshSessions();
    invoke<AppSettings>("get_app_settings")
      .then((s) => {
        setSettings(s);
        setRepairOutputDir(s.defaultExportDir);
      })
      .catch(console.error);
  }, [refreshDevices, refreshSessions]);

  // Native File Drag-and-Drop Listener (adapts behavior to active workspace)
  useEffect(() => {
    const webview = getCurrentWebviewWindow();
    const unlistenPromise = webview.onDragDropEvent(async (event) => {
      if (event.payload.type === "drop") {
        const paths = event.payload.paths;
        if (!paths || paths.length === 0) return;

        if (activeTab === "repair") {
          try {
            const diagnosed = await invoke<MediaRepairItem[]>("diagnose_media_files", {
              paths,
            });
            setRepairItems((prev) => {
              const existingPaths = new Set(prev.map((i) => i.path));
              const filtered = diagnosed.filter((d) => !existingPaths.has(d.path));
              return [...prev, ...filtered];
            });
            if (diagnosed.length > 0) {
              setSelectedRepairId(diagnosed[0].id);
              showToast(`${diagnosed.length} média(s) analysé(s) dans l'Atelier Chirurgical.`);
            }
          } catch (err) {
            setErrorBanner(String(err));
          }
        } else if (activeTab === "recovery") {
          const first = paths[0];
          const name = first.split("/").filter(Boolean).pop() || "Support";
          handleStartRecoveryScan(first, name);
        }
      }
    });
    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, [activeTab, showToast]);

  const handleEjectDevice = async (e: React.MouseEvent, dev: StorageDevice) => {
    e.stopPropagation();
    setErrorBanner(null);
    try {
      const msg = await invoke<string>("eject_volume", { mountPoint: dev.mountPoint });
      await refreshDevices();
      showToast(msg);
    } catch (err) {
      setErrorBanner(String(err));
    }
  };

  const handleRevealInFinder = async (path: string) => {
    try {
      await invoke("reveal_in_finder", { path });
    } catch (err) {
      setErrorBanner(String(err));
    }
  };

  const invokeWithTimeout = async <T,>(
    cmd: string,
    args: Record<string, unknown>,
    timeoutMs: number = 25000,
    errorMsg: string = "Délai d'attente dépassé"
  ): Promise<T> => {
    return Promise.race([
      invoke<T>(cmd, args),
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `${errorMsg} : Le support USB/disque met trop de temps à répondre (délai de ${Math.round(
                  timeoutMs / 1000
                )}s expiré). Vérifiez la connexion physique de la clé USB.`
              )
            ),
          timeoutMs
        )
      ),
    ]);
  };

  /* ================= ATELIER 1 HANDLERS (DATA RECOVERY) ================= */

  const handleStartRecoveryScan = async (
    targetPath: string,
    deviceName: string,
    modeOverride?: ScanMode
  ) => {
    setErrorBanner(null);
    setLastExportResult(null);
    setIsScanning(true);
    const effectiveMode = modeOverride || scanMode;
    try {
      const job = await invokeWithTimeout<RecoveryScanJob>(
        "start_recovery_scan",
        {
          targetPath,
          deviceName,
          scanMode: effectiveMode,
        },
        45000,
        "Analyse du support"
      );
      setActiveScanJob(job);
      const initialSet = new Set(job.items.map((i) => i.id));
      setSelectedFileIds(initialSet);
      setInspectedFile(job.items[0] || null);
      setSelectedCategoryFilter("all");
      setSelectedFolderFilter("all");
      if (job.filesFoundCount === 0) {
        showToast(`Analyse terminée : Aucun média détecté sur ${deviceName}`);
      } else {
        showToast(`Scan terminé : ${job.filesFoundCount} fichiers identifiés sur ${deviceName}`);
      }
    } catch (err) {
      setErrorBanner(String(err));
    } finally {
      setIsScanning(false);
    }
  };

  const handleLoadDemoRecoveryLab = async () => {
    await handleStartRecoveryScan(
      "demo",
      "Laboratoire Démo (Simulation Rushs & RAW)",
      "demo"
    );
  };

  const handlePickCustomFolderForScan = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Sélectionner un dossier ou volume à analyser en profondeur",
        defaultPath: "/Volumes",
      });
      if (typeof selected === "string" && selected) {
        const name = selected.split("/").filter(Boolean).pop() || "Dossier";
        await handleStartRecoveryScan(selected, name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePickDiskImageForScan = async () => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        title: "Ouvrir une image disque forensique (.img, .dd, .dmg, .raw)",
        filters: [
          { name: "Images Disques Forensiques", extensions: ["img", "dd", "raw", "dmg", "iso"] },
        ],
      });
      if (typeof selected === "string" && selected) {
        const name = selected.split("/").filter(Boolean).pop() || "Image Disque";
        await handleStartRecoveryScan(selected, name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRecoveryItems = useMemo(() => {
    if (!activeScanJob) return [];
    return activeScanJob.items.filter((item) => {
      if (hideProxiesFilter && item.isProxyOrThumb) return false;
      if (onlyDeletedFilter && !item.isDeleted) return false;
      if (treeMode === "type" && selectedCategoryFilter !== "all") {
        if (item.category !== selectedCategoryFilter) return false;
      }
      if (treeMode === "folder" && selectedFolderFilter !== "all") {
        if (item.folderPath !== selectedFolderFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.extension.toLowerCase().includes(q) ||
          item.codecOrFormatInfo.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    activeScanJob,
    hideProxiesFilter,
    onlyDeletedFilter,
    treeMode,
    selectedCategoryFilter,
    selectedFolderFilter,
    searchQuery,
  ]);

  const folderGroups = useMemo(() => {
    if (!activeScanJob) return [];
    const map = new Map<string, number>();
    for (const it of activeScanJob.items) {
      map.set(it.folderPath, (map.get(it.folderPath) || 0) + 1);
    }
    return Array.from(map.entries());
  }, [activeScanJob]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: 0,
      video: 0,
      photo_raw: 0,
      photo_raster: 0,
      audio: 0,
      document: 0,
    };
    if (!activeScanJob) return counts;
    counts.all = activeScanJob.items.length;
    for (const it of activeScanJob.items) {
      counts[it.category] = (counts[it.category] || 0) + 1;
    }
    return counts;
  }, [activeScanJob]);

  const selectedItemsList = useMemo(() => {
    if (!activeScanJob) return [];
    return activeScanJob.items.filter((i) => selectedFileIds.has(i.id));
  }, [activeScanJob, selectedFileIds]);

  const selectedTotalBytes = useMemo(
    () => selectedItemsList.reduce((acc, item) => acc + item.sizeBytes, 0),
    [selectedItemsList]
  );

  const handleToggleSelectFile = (id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const allFilteredSelected =
      filteredRecoveryItems.length > 0 &&
      filteredRecoveryItems.every((i) => selectedFileIds.has(i.id));
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredRecoveryItems.forEach((i) => next.delete(i.id));
      } else {
        filteredRecoveryItems.forEach((i) => next.add(i.id));
      }
      return next;
    });
  };

  const handleExportRecoveredSelection = async () => {
    if (!activeScanJob || selectedItemsList.length === 0) return;
    setErrorBanner(null);

    try {
      const dest = await open({
        directory: true,
        multiple: false,
        title: "Choisir le disque/dossier de destination sécurisé (Différent du support source)",
        defaultPath: settings.defaultExportDir || "/Volumes",
      });
      if (typeof dest !== "string" || !dest) return;

      setIsRecoveringExport(true);
      const res = await invoke<RecoveryExportResult>("export_recovered_files", {
        sourceDevicePath: activeScanJob.devicePath,
        sourceDeviceName: activeScanJob.deviceName,
        items: selectedItemsList,
        destinationDir: dest,
        autoRepairDamaged: settings.autoRepairCarvedMedia,
      });
      setLastExportResult(res);
      await refreshSessions();
      showToast(
        `${res.recoveredCount} fichier(s) récupéré(s) avec succès (${res.autoRepairedCount} réparé(s) chirurgicalement) !`
      );
    } catch (err) {
      setErrorBanner(String(err));
    } finally {
      setIsRecoveringExport(false);
    }
  };

  /* ================= ATELIER 2 HANDLERS (MEDIA REPAIR) ================= */

  const handlePickCorruptedMediaFiles = async () => {
    setErrorBanner(null);
    try {
      const selected = await open({
        directory: false,
        multiple: true,
        title: "Sélectionner des vidéos (.MOV, .MP4, .BRAW), photos RAW (.ARW, .CR3, .JPG) ou audios (.WAV) corrompus",
      });
      const paths = Array.isArray(selected)
        ? selected
        : typeof selected === "string" && selected
        ? [selected]
        : [];
      if (paths.length === 0) return;

      const diagnosed = await invoke<MediaRepairItem[]>("diagnose_media_files", { paths });
      setRepairItems((prev) => {
        const seen = new Set(prev.map((i) => i.path));
        const next = [...prev, ...diagnosed.filter((d) => !seen.has(d.path))];
        return next;
      });
      if (diagnosed.length > 0 && !selectedRepairId) {
        setSelectedRepairId(diagnosed[0].id);
      }
    } catch (err) {
      setErrorBanner(String(err));
    }
  };

  const handlePickReferenceMedia = async () => {
    setErrorBanner(null);
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        title: "Sélectionner un fichier vidéo/média SAIN enregistré avec la même caméra",
      });
      if (typeof selected === "string" && selected) {
        const info = await invoke<ReferenceFileInspection>("inspect_reference_media", {
          path: selected,
        });
        setReferenceFile(info);
        showToast(`Fichier de référence chargé : ${info.fileName}`);
      }
    } catch (err) {
      setErrorBanner(String(err));
    }
  };

  const handleLoadCorruptedDemoLab = async () => {
    setErrorBanner(null);
    try {
      const [demoItems, demoRef, demoOutDir] = await invoke<
        [MediaRepairItem[], ReferenceFileInspection, string]
      >("load_demo_corrupted_lab");
      setRepairItems(demoItems);
      setReferenceFile(demoRef);
      setRepairOutputDir(demoOutDir);
      if (demoItems.length > 0) {
        setSelectedRepairId(demoItems[0].id);
      }
      showToast(
        "Laboratoire de test chargé : 3 médias corrompus (.MOV sans moov, .WAV coupé, .ARW) + 1 fichier de référence sain."
      );
    } catch (err) {
      setErrorBanner(String(err));
    }
  };

  const handlePickRepairOutputFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Choisir le dossier d'exportation des médias réparés",
        defaultPath: repairOutputDir || settings.defaultExportDir,
      });
      if (typeof selected === "string" && selected) {
        setRepairOutputDir(selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunSurgicalRepair = async () => {
    if (repairItems.length === 0) return;
    setErrorBanner(null);
    let targetOutDir = repairOutputDir;
    if (!targetOutDir) {
      const picked = await open({
        directory: true,
        multiple: false,
        title: "Choisir le dossier de destination pour les médias réparés",
      });
      if (typeof picked !== "string" || !picked) return;
      targetOutDir = picked;
      setRepairOutputDir(picked);
    }

    setIsRepairingBatch(true);
    try {
      const updated = await invokeWithTimeout<MediaRepairItem[]>(
        "execute_surgical_repair",
        {
          items: repairItems,
          referencePath: referenceFile ? referenceFile.path : null,
          outputDir: targetOutDir,
        },
        30000,
        "Réparation de médias"
      );
      setRepairItems(updated);
      await refreshSessions();
      showToast(`${updated.length} média(s) réparé(s) chirurgicalement avec succès !`);
    } catch (err) {
      setErrorBanner(String(err));
    } finally {
      setIsRepairingBatch(false);
    }
  };

  const handleSendToRepairWorkshop = async (file: RecoverableFileItem) => {
    setActiveTab("repair");
    if (file.sourcePath) {
      try {
        const diagnosed = await invoke<MediaRepairItem[]>("diagnose_media_files", {
          paths: [file.sourcePath],
        });
        if (diagnosed && diagnosed.length > 0) {
          setRepairItems((prev) => {
            const exists = prev.some((p) => p.path === file.sourcePath);
            if (exists) return prev;
            return [...diagnosed, ...prev];
          });
          setSelectedRepairId(diagnosed[0].id);
          showToast(`Média transféré dans l'Atelier 2 : ${file.name}`);
        }
      } catch (err) {
        showToast(`Information : ${err}`);
      }
    } else {
      showToast("Veuillez d'abord exporter ce fichier défragmenté pour lancer sa réparation.");
    }
  };

  const activeRepairItem = useMemo(
    () => repairItems.find((i) => i.id === selectedRepairId) || repairItems[0] || null,
    [repairItems, selectedRepairId]
  );

  /* ================= ATELIER 3 HANDLERS (SURFACE & IMAGER) ================= */

  const handleStartDiskImager = async () => {
    if (!selectedSurfaceDevice) return;
    setErrorBanner(null);
    try {
      const outDir = await open({
        directory: true,
        multiple: false,
        title: "Choisir le dossier où enregistrer l'image disque de sauvetage (.img + .hrmap)",
        defaultPath: settings.defaultExportDir,
      });
      if (typeof outDir !== "string" || !outDir) return;

      setIsImagingDrive(true);
      const job = await invokeWithTimeout<DiskImageJobState>(
        "start_forensic_disk_image",
        {
          sourcePath: selectedSurfaceDevice.mountPoint,
          sourceName: selectedSurfaceDevice.name,
          outputDir: outDir,
        },
        60000,
        "Clonage forensique"
      );
      setDiskImageJob(job);
      await refreshSessions();
      showToast(`Image disque de sauvetage créée : ${job.outputImagePath}`);
    } catch (err) {
      setErrorBanner(String(err));
    } finally {
      setIsImagingDrive(false);
    }
  };

  const handleRunSurfaceDiagnostic = async () => {
    if (!selectedSurfaceDevice) return;
    setErrorBanner(null);
    setIsRunningSurfaceCheck(true);
    try {
      const report = await invokeWithTimeout<SurfaceHealthReport>(
        "run_drive_surface_check",
        {
          mountPoint: selectedSurfaceDevice.mountPoint,
          deviceName: selectedSurfaceDevice.name,
          totalBytes: selectedSurfaceDevice.totalBytes,
        },
        15000,
        "Diagnostic de surface"
      );
      setSurfaceReport(report);
      showToast(`Diagnostic S.M.A.R.T. & Surface terminé pour ${selectedSurfaceDevice.name}`);
    } catch (err) {
      setErrorBanner(String(err));
    } finally {
      setIsRunningSurfaceCheck(false);
    }
  };

  const handleIsolateBadBlocks = async () => {
    if (!selectedSurfaceDevice) return;
    setErrorBanner(null);
    setIsQuarantining(true);
    try {
      const res = await invokeWithTimeout<QuarantineResult>(
        "isolate_bad_blocks",
        {
          mountPoint: selectedSurfaceDevice.mountPoint,
          deviceName: selectedSurfaceDevice.name,
          totalBytes: selectedSurfaceDevice.totalBytes,
          badSectorsCount: surfaceReport?.badSectorsCount ?? 0,
          method: "bitmap",
        },
        15000,
        "Quarantaine des blocs HS"
      );
      setQuarantineResult(res);
      showToast(`Quarantaine effectuée : ${res.summary}`);
      await refreshSessions();
      try {
        const updated = await invokeWithTimeout<SurfaceHealthReport>(
          "run_drive_surface_check",
          {
            mountPoint: selectedSurfaceDevice.mountPoint,
            deviceName: selectedSurfaceDevice.name,
            totalBytes: selectedSurfaceDevice.totalBytes,
          },
          10000,
          "Actualisation de surface"
        );
        setSurfaceReport(updated);
      } catch (e) {
        console.error(e);
      }
    } catch (err) {
      setErrorBanner(String(err));
    } finally {
      setIsQuarantining(false);
    }
  };

  const handleRegenerateNand = async () => {
    if (!selectedSurfaceDevice) return;
    setErrorBanner(null);
    setIsRegeneratingNand(true);
    try {
      const res = await invokeWithTimeout<NandRegenerationResult>(
        "regenerate_nand_cells",
        {
          mountPoint: selectedSurfaceDevice.mountPoint,
          deviceName: selectedSurfaceDevice.name,
          totalBytes: selectedSurfaceDevice.totalBytes,
          slowCellsCount: surfaceReport?.slowCellsCount ?? 0,
        },
        15000,
        "Régénération cellulaire NAND"
      );
      setRegenerationResult(res);
      showToast(res.summary);
      await refreshSessions();
      try {
        const updated = await invokeWithTimeout<SurfaceHealthReport>(
          "run_drive_surface_check",
          {
            mountPoint: selectedSurfaceDevice.mountPoint,
            deviceName: selectedSurfaceDevice.name,
            totalBytes: selectedSurfaceDevice.totalBytes,
          },
          10000,
          "Actualisation de surface"
        );
        setSurfaceReport(updated);
      } catch (e) {
        console.error(e);
      }
    } catch (err) {
      setErrorBanner(String(err));
    } finally {
      setIsRegeneratingNand(false);
    }
  };

  const handleUpdateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      await invoke("update_app_settings", { settings: next });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      const next = await invoke<SavedSessionEntry[]>("delete_saved_session", { id });
      setSessions(next);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestAdminElevation = async () => {
    try {
      const granted = await invoke<boolean>("request_admin_elevation");
      setIsAdminElevated(granted);
      if (granted) {
        showToast("Privilèges administrateur activés (accès physique /dev/rdisk direct)");
      } else {
        showToast("Élévation de privilèges annulée par l'utilisateur");
      }
    } catch (err: any) {
      setErrorBanner(`Erreur d'élévation administrateur : ${err}`);
    }
  };

  const handleMountRescueImage = async (imgPath: string) => {
    setIsMountingImage(true);
    try {
      const info = await invoke<MountedImageInfo>("mount_rescue_image", { imagePath: imgPath });
      setMountedImage(info);
      showToast(`Image disque montée en lecture seule : ${info.mountPoint}`);
    } catch (err: any) {
      setErrorBanner(`Erreur de montage image disque : ${err}`);
    } finally {
      setIsMountingImage(false);
    }
  };

  const handleUnmountRescueImage = async (target: string) => {
    try {
      await invoke("unmount_rescue_image", { target });
      setMountedImage(null);
      showToast("Image disque démontée du Finder avec succès");
    } catch (err: any) {
      setErrorBanner(`Erreur lors du démontage : ${err}`);
    }
  };

  const handleGenerateForensicCertificate = async () => {
    const dev = selectedSurfaceDevice || devices.find((d) => d.mountPoint !== "/") || devices[0];
    if (!dev) {
      showToast("Veuillez sélectionner un support de stockage pour certifier le diagnostic");
      return;
    }
    setIsGeneratingCertificate(true);
    try {
      const certPath = await invoke<string>("generate_forensic_certificate", {
        request: {
          deviceName: dev.name,
          bsdName: dev.bsdName,
          fileSystem: dev.fileSystem,
          totalBytes: dev.totalBytes,
          smartStatus: dev.smartStatus,
          healthScore: dev.healthPercent,
          badSectorsCount: surfaceReport?.badSectorsCount || diskImageJob?.badSectors || 0,
          quarantinedClusters: quarantineResult?.isolatedClustersCount || 0,
          imagePath: diskImageJob?.outputImagePath || undefined,
          outputDir: settings.defaultExportDir || "",
        },
      });
      showToast("Certificat Forensique Officiel généré avec succès !");
      await invoke("reveal_in_finder", { path: certPath });
    } catch (err: any) {
      setErrorBanner(`Erreur de génération du certificat : ${err}`);
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  const externalDevices = devices.filter((d) => d.mountPoint !== "/");
  const internalDevices = devices.filter((d) => d.mountPoint === "/");

  return (
    <div className="relative h-screen w-screen flex flex-col bg-[#191919] text-[#EDEDEC] overflow-hidden select-none">
      {/* Top Toast Notification */}
      {statusToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#10B981] text-[#191919] font-semibold text-xs shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* ================= TOP HEADER ================= */}
      <header className="h-12 px-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#191919] shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <HardRecoverLogo className="w-7 h-7" />
          <span className="font-semibold text-sm tracking-tight text-[#EDEDEC]">
            HardRecover
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin Privilege Status */}
          <button
            onClick={handleRequestAdminElevation}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
              isAdminElevated
                ? "bg-[#10B981]/15 border-[#10B981]/40 text-[#34D399]"
                : "bg-[#252525] border-[#333333] text-[#9B9A97] hover:text-[#EDEDEC]"
            }`}
          >
            {isAdminElevated ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Root</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Activer Root</span>
              </>
            )}
          </button>

          <button
            onClick={refreshDevices}
            className="flex items-center gap-1.5 text-xs font-medium text-[#9B9A97] hover:text-[#EDEDEC] hover:bg-[#252525] border border-[#2F2F2F] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingDevices ? "animate-spin text-[#3B82F6]" : ""}`} />
            <span>Supports ({devices.length})</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 text-[#9B9A97] hover:text-[#EDEDEC] hover:bg-[#252525] border border-[#2F2F2F] rounded-lg transition-colors cursor-pointer"
            title="Paramètres"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Error Notification Banner */}
      {errorBanner && (
        <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#FCA5A5] text-xs flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#EF4444]" />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="hover:bg-[#EF4444]/20 p-0.5 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ================= MAIN BODY ================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT NAVIGATION SIDEBAR */}
        <aside className="w-52 bg-[#141414] border-r border-[#2A2A2A] flex flex-col justify-between p-2.5 shrink-0">
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab("home")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "home"
                  ? "bg-[#242424] text-[#EDEDEC] border border-[#383838]"
                  : "text-[#9B9A97] hover:text-[#EDEDEC] hover:bg-[#1C1C1C] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Home
                  className={`w-4 h-4 ${
                    activeTab === "home" ? "text-[#10B981]" : "text-[#9B9A97]"
                  }`}
                />
                <span>Accueil</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("recovery")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "recovery"
                  ? "bg-[#242424] text-[#EDEDEC] border border-[#383838]"
                  : "text-[#9B9A97] hover:text-[#EDEDEC] hover:bg-[#1C1C1C] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HardDrive
                  className={`w-4 h-4 ${
                    activeTab === "recovery" ? "text-[#F59E0B]" : "text-[#9B9A97]"
                  }`}
                />
                <span>Récupération</span>
              </div>
              {activeScanJob && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#F59E0B]/15 text-[#FBBF24]">
                  {activeScanJob.filesFoundCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("repair")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "repair"
                  ? "bg-[#242424] text-[#EDEDEC] border border-[#383838]"
                  : "text-[#9B9A97] hover:text-[#EDEDEC] hover:bg-[#1C1C1C] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wrench
                  className={`w-4 h-4 ${
                    activeTab === "repair" ? "text-[#3B82F6]" : "text-[#9B9A97]"
                  }`}
                />
                <span>Réparation</span>
              </div>
              {repairItems.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#3B82F6]/15 text-[#60A5FA]">
                  {repairItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("surface")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "surface"
                  ? "bg-[#242424] text-[#EDEDEC] border border-[#383838]"
                  : "text-[#9B9A97] hover:text-[#EDEDEC] hover:bg-[#1C1C1C] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Activity
                  className={`w-4 h-4 ${
                    activeTab === "surface" ? "text-[#10B981]" : "text-[#9B9A97]"
                  }`}
                />
                <span>Santé &amp; Clone</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("sessions")}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "sessions"
                  ? "bg-[#242424] text-[#EDEDEC] border border-[#383838]"
                  : "text-[#9B9A97] hover:text-[#EDEDEC] hover:bg-[#1C1C1C] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock
                  className={`w-4 h-4 ${
                    activeTab === "sessions" ? "text-[#FBBF24]" : "text-[#9B9A97]"
                  }`}
                />
                <span>Historique</span>
              </div>
              {sessions.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#2A2A2A] text-[#9B9A97]">
                  {sessions.length}
                </span>
              )}
            </button>
          </div>

          <div className="px-3 py-2 rounded-lg bg-[#191919] border border-[#252525] flex items-center justify-between text-[11px] text-[#787774]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              Lecture seule
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          </div>
        </aside>

        {/* ================= MAIN WORKSPACE AREA ================= */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#191919]">
          {/* ================= ACCUEIL ================= */}
          {activeTab === "home" && (
            <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-5xl mx-auto w-full">
              <div>
                <h1 className="text-xl font-bold text-[#EDEDEC] tracking-tight">
                  Que souhaitez-vous faire ?
                </h1>
                <p className="text-xs text-[#9B9A97] mt-1">
                  Sélectionnez une action pour commencer.
                </p>
              </div>

              {/* 3 Main Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* CARD 1: REPAIR CORRUPTED MEDIA */}
                <div
                  onClick={() => setActiveTab("repair")}
                  className="group bg-[#202020] hover:bg-[#252525] border border-[#2F2F2F] hover:border-[#3B82F6]/60 rounded-xl p-5 flex flex-col justify-between transition-all cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/15 text-[#60A5FA] flex items-center justify-center">
                      <Film className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-[#EDEDEC] group-hover:text-[#60A5FA] transition-colors">
                        Réparer des médias
                      </h2>
                      <p className="text-xs text-[#9B9A97] mt-1 leading-relaxed">
                        Restauration de vidéos, photos ou sons illisibles et tronqués.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-xs font-medium text-[#60A5FA]">
                    <span>Ouvrir</span>
                    <span>→</span>
                  </div>
                </div>

                {/* CARD 2: RECOVER LOST / DELETED FILES */}
                <div
                  onClick={() => setActiveTab("recovery")}
                  className="group bg-[#202020] hover:bg-[#252525] border border-[#2F2F2F] hover:border-[#F59E0B]/60 rounded-xl p-5 flex flex-col justify-between transition-all cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/15 text-[#FBBF24] flex items-center justify-center">
                      <FolderTree className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-[#EDEDEC] group-hover:text-[#FBBF24] transition-colors">
                        Récupérer des fichiers
                      </h2>
                      <p className="text-xs text-[#9B9A97] mt-1 leading-relaxed">
                        Recherche et extraction sur cartes SD formatées et disques.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-xs font-medium text-[#FBBF24]">
                    <span>Ouvrir</span>
                    <span>→</span>
                  </div>
                </div>

                {/* CARD 3: HARDWARE IMAGING & SURFACE S.M.A.R.T. */}
                <div
                  onClick={() => setActiveTab("surface")}
                  className="group bg-[#202020] hover:bg-[#252525] border border-[#2F2F2F] hover:border-[#10B981]/60 rounded-xl p-5 flex flex-col justify-between transition-all cursor-pointer"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-[#10B981]/15 text-[#34D399] flex items-center justify-center">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-[#EDEDEC] group-hover:text-[#34D399] transition-colors">
                        Santé &amp; Clonage
                      </h2>
                      <p className="text-xs text-[#9B9A97] mt-1 leading-relaxed">
                        Diagnostic matériel, isolation de blocs HS et copie de secours .img.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-xs font-medium text-[#34D399]">
                    <span>Ouvrir</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* Connected Devices Quick List */}
              {devices.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#9B9A97]">
                    <span>Supports connectés</span>
                    <button
                      onClick={refreshDevices}
                      className="text-[#3B82F6] hover:underline cursor-pointer"
                    >
                      Actualiser
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {devices.map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          setActiveTab("recovery");
                          handleStartRecoveryScan(d.mountPoint, d.name);
                        }}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#202020] hover:bg-[#262626] border border-[#2B2B2B] text-xs cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <DeviceVisualIcon deviceType={d.deviceType} className="w-4 h-4 text-[#F59E0B] shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold text-[#EDEDEC] truncate block">{d.name}</span>
                            <span className="font-mono text-[10px] text-[#787774]">{d.bsdName}</span>
                          </div>
                        </div>
                        <span className="font-mono text-xs text-[#10B981] ml-2 shrink-0">{formatBytes(d.totalBytes)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= ATELIER 1: RÉCUPÉRATION ================= */}
          {activeTab === "recovery" && (
            <>
              {!activeScanJob ? (
                /* ---------- VIEW 1A: STORAGE DEVICE SELECTION ---------- */
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-[#202020] border border-[#2F2F2F] rounded-xl p-3.5">
                    <div className="flex items-center gap-2">
                      <h1 className="text-sm font-semibold text-[#EDEDEC]">
                        Sélectionner un support
                      </h1>
                      <button
                        type="button"
                        onClick={() => setActiveToolModal("tool3")}
                        className="text-[#787774] hover:text-[#EDEDEC] transition-colors cursor-pointer"
                        title="Informations"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleLoadDemoRecoveryLab}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-xs font-medium text-[#FBBF24] border border-[#F59E0B]/30 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Laboratoire Démo</span>
                      </button>

                      <button
                        onClick={handlePickCustomFolderForScan}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282828] hover:bg-[#323232] text-xs font-medium text-[#EDEDEC] border border-[#353535] transition-colors cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-[#3B82F6]" />
                        <span>Dossier…</span>
                      </button>

                      <button
                        onClick={handlePickDiskImageForScan}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282828] hover:bg-[#323232] text-xs font-medium text-[#EDEDEC] border border-[#353535] transition-colors cursor-pointer"
                      >
                        <Disc className="w-3.5 h-3.5 text-[#10B981]" />
                        <span>Image (.img)…</span>
                      </button>
                    </div>
                  </div>

                  {/* External Devices */}
                  <section className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-medium text-[#9B9A97]">
                      <span>Supports externes ({externalDevices.length})</span>
                    </div>

                    {externalDevices.length === 0 ? (
                      <div className="rounded-xl border border-[#2B2B2B] bg-[#202020]/40 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <SdCardLogo className="w-5 h-5 text-[#787774]" />
                          <span className="text-xs text-[#9B9A97]">
                            Aucun périphérique externe détecté.
                          </span>
                        </div>
                        <button
                          onClick={refreshDevices}
                          className="px-2.5 py-1 rounded-lg bg-[#262626] hover:bg-[#303030] border border-[#353535] text-xs text-[#EDEDEC]"
                        >
                          Actualiser
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {externalDevices.map((dev) => {
                          const isCard = dev.deviceType === "sd_card";
                          const usedPct =
                            dev.totalBytes > 0
                              ? Math.min(100, Math.round((dev.usedBytes / dev.totalBytes) * 100))
                              : 0;
                          return (
                            <div
                              key={dev.id}
                              className="bg-[#202020] hover:bg-[#252525] border border-[#2F2F2F] hover:border-[#F59E0B]/50 rounded-2xl p-4 flex flex-col justify-between transition-all group"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
                                        isCard
                                          ? "bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#F59E0B]"
                                          : "bg-[#3B82F6]/15 border-[#3B82F6]/30 text-[#60A5FA]"
                                      }`}
                                    >
                                      <DeviceVisualIcon
                                        deviceType={dev.deviceType}
                                        className="w-6 h-6"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <h3 className="font-bold text-sm text-[#EDEDEC] truncate">
                                          {dev.name}
                                        </h3>
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2A2A2A] border border-[#383838] text-[#9B9A97]">
                                          {dev.fileSystem}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-[#9B9A97] font-mono mt-0.5">
                                        {dev.rawDevicePath} • {dev.protocolLabel}
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    onClick={(e) => handleEjectDevice(e, dev)}
                                    className="p-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#F59E0B]/20 hover:text-[#FBBF24] border border-[#383838] text-[#9B9A97] transition-colors"
                                    title="Éjecter ce support"
                                  >
                                    <EjectIcon className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="mt-3.5 space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-[#9B9A97]">
                                      Capacité :{" "}
                                      <strong className="text-[#EDEDEC] font-mono">
                                        {formatBytes(dev.totalBytes)}
                                      </strong>
                                    </span>
                                    <span className="text-[#10B981] font-mono text-[10px]">
                                      S.M.A.R.T. {dev.healthPercent}%
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-[#141414] rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-[#F59E0B] rounded-full"
                                      style={{ width: `${usedPct}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleStartRecoveryScan(dev.mountPoint, dev.name)}
                                disabled={isScanning}
                                className="mt-4 w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-[#F59E0B] via-[#EAB308] to-[#10B981] hover:from-[#D97706] hover:to-[#059669] text-black flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                              >
                                <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Analyser le support</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* Section 2: Internal Drives & Direct Forensic Sources */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <section className="lg:col-span-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9B9A97]">
                          Disques Internes ({internalDevices.length})
                        </h2>
                      </div>

                      <div className="space-y-3">
                        {internalDevices.map((dev) => (
                          <div
                            key={dev.id}
                            className="bg-[#202020] border border-[#2F2F2F] rounded-2xl p-4 flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-xl bg-[#3B82F6]/15 border border-[#3B82F6]/30 text-[#60A5FA] flex items-center justify-center shrink-0">
                                <SsdLogo className="w-6 h-6" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-sm text-[#EDEDEC] truncate">
                                    {dev.name}
                                  </h3>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2A2A2A] text-[#93C5FD]">
                                    {dev.fileSystem}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#9B9A97] mt-0.5">
                                  {formatBytes(dev.availableBytes)} libres sur{" "}
                                  {formatBytes(dev.totalBytes)} • {dev.partitionScheme}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={handlePickCustomFolderForScan}
                              className="px-3.5 py-2 rounded-xl bg-[#2A2A2A] hover:bg-[#3B82F6] hover:text-white border border-[#383838] text-xs font-semibold text-[#EDEDEC] transition-colors shrink-0"
                            >
                              Choisir un dossier…
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              ) : (
                /* ---------- VIEW 1B: 3-PANE RECOVERY SCAN EXPLORER ---------- */
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {/* Top Scan Telemetry & Filter Bar */}
                  <div className="px-5 py-3 bg-[#1E1E1E] border-b border-[#2A2A2A] flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveScanJob(null)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#282828] hover:bg-[#323232] border border-[#383838] text-xs font-medium text-[#EDEDEC] transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Supports</span>
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#EDEDEC]">
                            {activeScanJob.deviceName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                            {activeScanJob.phaseLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#9B9A97] font-mono mt-0.5">
                          {activeScanJob.filesFoundCount} fichiers identifiés ({formatBytes(activeScanJob.totalRecoverableBytes)}) • Vitesse : {formatSpeed(activeScanJob.speedBps)}
                        </div>
                      </div>
                    </div>

                    {/* Search, Proxy Filter & Deleted Toggle */}
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => setHideProxiesFilter((v) => !v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                          hideProxiesFilter
                            ? "bg-[#3B82F6]/20 border-[#3B82F6]/40 text-[#93C5FD]"
                            : "bg-[#252525] border-[#333333] text-[#9B9A97] hover:text-[#EDEDEC]"
                        }`}
                        title="Masque automatiquement les miniatures .THM et fichiers basse résolution .LRF"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        <span>{hideProxiesFilter ? "Vignettes / Proxys masqués" : "Tous les fichiers"}</span>
                      </button>

                      <button
                        onClick={() => setOnlyDeletedFilter((v) => !v)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                          onlyDeletedFilter
                            ? "bg-[#F59E0B]/20 border-[#F59E0B]/40 text-[#FBBF24]"
                            : "bg-[#252525] border-[#333333] text-[#9B9A97] hover:text-[#EDEDEC]"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Orphelins uniquement</span>
                      </button>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-[#787774] absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Filtrer (.mov, .arw, ProRes…)"
                          className="pl-8 pr-3 py-1.5 rounded-lg bg-[#141414] border border-[#2F2F2F] focus:border-[#3B82F6] focus:outline-none text-xs text-[#EDEDEC] w-56"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3-Pane Explorer Body */}
                  <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden">
                    {/* PANE 1 (LEFT, 3 COLS): TREE FILTER & LBA HEATMAP MINIATURE */}
                    <div className="col-span-3 border-r border-[#2A2A2A] bg-[#171717] flex flex-col justify-between p-3.5 overflow-y-auto">
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#121212] border border-[#282828]">
                          <button
                            onClick={() => setTreeMode("type")}
                            className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                              treeMode === "type"
                                ? "bg-[#262626] text-[#EDEDEC]"
                                : "text-[#787774] hover:text-[#EDEDEC]"
                            }`}
                          >
                            Par Type Média
                          </button>
                          <button
                            onClick={() => setTreeMode("folder")}
                            className={`py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                              treeMode === "folder"
                                ? "bg-[#262626] text-[#EDEDEC]"
                                : "text-[#787774] hover:text-[#EDEDEC]"
                            }`}
                          >
                            Par Dossier / FS
                          </button>
                        </div>

                        {treeMode === "type" ? (
                          <div className="space-y-1">
                            {[
                              { id: "all", label: "Tous les fichiers", icon: Layers, color: "text-[#EDEDEC]" },
                              { id: "video", label: "Vidéos Cinéma & Rushs", icon: Film, color: "text-[#F59E0B]" },
                              { id: "photo_raw", label: "Photos RAW Capteur", icon: ImageIcon, color: "text-[#3B82F6]" },
                              { id: "photo_raster", label: "Images JPEG / TIFF / PNG", icon: ImageIcon, color: "text-[#10B981]" },
                              { id: "audio", label: "Audio Broadcast WAV/BWF", icon: Music, color: "text-[#A855F7]" },
                              { id: "document", label: "Projets & Manifestes", icon: FileText, color: "text-[#9B9A97]" },
                              { id: "other", label: "Autres Données", icon: FileCode, color: "text-[#787774]" },
                            ].map((cat) => {
                              const IconComp = cat.icon;
                              const count = categoryCounts[cat.id] || 0;
                              const active = selectedCategoryFilter === cat.id;
                              return (
                                <button
                                  key={cat.id}
                                  onClick={() => setSelectedCategoryFilter(cat.id)}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                                    active
                                      ? "bg-[#252525] text-[#EDEDEC] border border-[#383838] font-semibold"
                                      : "text-[#9B9A97] hover:bg-[#1F1F1F] hover:text-[#EDEDEC]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <IconComp className={`w-3.5 h-3.5 shrink-0 ${cat.color}`} />
                                    <span className="truncate">{cat.label}</span>
                                  </div>
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#141414] text-[#9B9A97]">
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <button
                              onClick={() => setSelectedFolderFilter("all")}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs ${
                                selectedFolderFilter === "all"
                                  ? "bg-[#252525] text-[#EDEDEC] border border-[#383838] font-semibold"
                                  : "text-[#9B9A97] hover:bg-[#1F1F1F]"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <FolderTree className="w-3.5 h-3.5 text-[#F59E0B]" />
                                <span>Toutes les partitions</span>
                              </div>
                              <span className="font-mono text-[10px]">
                                {activeScanJob.items.length}
                              </span>
                            </button>

                            {folderGroups.map(([folderName, count]) => (
                              <button
                                key={folderName}
                                onClick={() => setSelectedFolderFilter(folderName)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left ${
                                  selectedFolderFilter === folderName
                                    ? "bg-[#252525] text-[#EDEDEC] border border-[#383838] font-semibold"
                                    : "text-[#9B9A97] hover:bg-[#1F1F1F]"
                                }`}
                              >
                                <span className="truncate pr-2">{folderName}</span>
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#141414]">
                                  {count}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Genuine Storage Source Context Card */}
                      <div className="p-3.5 rounded-xl bg-[#202020] border border-[#2F2F2F] space-y-2 mt-4 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[#EDEDEC]">
                            Détails du Support
                          </span>
                          <span className="font-mono text-[10px] text-[#34D399]">
                            {activeScanJob.filesFoundCount} fichier(s)
                          </span>
                        </div>
                        <div className="space-y-1 text-[11px] text-[#9B9A97]">
                          <div className="truncate">
                            <span className="text-[#787774]">Cible :</span>{" "}
                            <span className="text-[#EDEDEC] font-mono">{activeScanJob.deviceName}</span>
                          </div>
                          <div className="truncate">
                            <span className="text-[#787774]">Volume :</span>{" "}
                            <span className="text-[#EDEDEC] font-mono">{formatBytes(activeScanJob.totalRecoverableBytes)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PANE 2 (CENTER, 5 COLS): RECOVERABLE FILES TABLE */}
                    <div className="col-span-5 border-r border-[#2A2A2A] flex flex-col min-h-0 bg-[#191919]">
                      <div className="px-4 py-2.5 border-b border-[#2A2A2A] flex items-center justify-between text-xs bg-[#1C1C1C]">
                        <button
                          onClick={handleSelectAllFiltered}
                          className="flex items-center gap-2 text-[#EDEDEC] hover:text-[#FBBF24] font-medium"
                        >
                          <CheckSquare className="w-4 h-4 text-[#F59E0B]" />
                          <span>
                            Tout cocher / décocher ({filteredRecoveryItems.length} affichés)
                          </span>
                        </button>
                        <span className="text-[11px] text-[#9B9A97] font-mono">
                          {selectedItemsList.length} sélectionné(s)
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto divide-y divide-[#242424]">
                        {filteredRecoveryItems.length === 0 ? (
                          activeScanJob.items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                              <div className="w-12 h-12 rounded-2xl bg-[#222222] border border-[#333333] flex items-center justify-center text-[#9B9A97]">
                                <FolderOpen className="w-6 h-6 text-[#9B9A97]" />
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-[#EDEDEC]">Support Vierge ou Vide</h3>
                                <p className="text-xs text-[#9B9A97] max-w-xs mt-1">
                                  Aucun fichier n&apos;a été détecté dans l&apos;arborescence de ce support.
                                </p>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <button
                                  onClick={() => setActiveScanJob(null)}
                                  className="px-3.5 py-2 rounded-xl bg-[#282828] hover:bg-[#333333] border border-[#3A3A3A] text-xs font-semibold text-[#EDEDEC] transition-colors"
                                >
                                  Choisir un Autre Support
                                </button>
                                <button
                                  onClick={handleLoadDemoRecoveryLab}
                                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#EAB308] to-[#10B981] text-black font-bold text-xs transition-transform hover:scale-105"
                                >
                                  Tester avec le Laboratoire Démo
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-2">
                              <Search className="w-8 h-8 text-[#787774]" />
                              <p className="text-xs font-semibold text-[#EDEDEC]">Aucun fichier pour ce filtre</p>
                              <button
                                onClick={() => {
                                  setSelectedCategoryFilter("all");
                                  setSearchQuery("");
                                  setOnlyDeletedFilter(false);
                                }}
                                className="text-xs text-[#60A5FA] hover:underline"
                              >
                                Réinitialiser les filtres
                              </button>
                            </div>
                          )
                        ) : (
                          filteredRecoveryItems.map((item) => {
                          const isChecked = selectedFileIds.has(item.id);
                          const isInspected = inspectedFile?.id === item.id;
                          return (
                            <div
                              key={item.id}
                              onClick={() => setInspectedFile(item)}
                              className={`px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                isInspected
                                  ? "bg-[#262626]"
                                  : "hover:bg-[#212121]"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleSelectFile(item.id);
                                  }}
                                  className="text-[#9B9A97] hover:text-[#F59E0B] shrink-0"
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-[#F59E0B]" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-[#EDEDEC] truncate">
                                      {item.name}
                                    </span>
                                    {item.isDeleted && (
                                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#3B82F6]/15 text-[#93C5FD] border border-[#3B82F6]/30 shrink-0">
                                        Carved / Orphelin
                                      </span>
                                    )}
                                    {item.isProxyOrThumb && (
                                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#787774]/20 text-[#A8A7A4] border border-[#787774]/30 shrink-0">
                                        Proxy / THM
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-[#9B9A97] font-mono truncate mt-0.5">
                                    {formatBytes(item.sizeBytes)} • LBA {item.lbaOffset} • H={item.entropyScore.toFixed(2)} b/o
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                                    item.healthBadge === "needs_repair" || item.needsSurgicalRepair
                                      ? "bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#FBBF24]"
                                      : item.healthBadge === "corrupted"
                                      ? "bg-[#EF4444]/15 border-[#EF4444]/30 text-[#FCA5A5]"
                                      : "bg-[#10B981]/15 border-[#10B981]/30 text-[#34D399]"
                                  }`}
                                >
                                  {item.healthBadge === "needs_repair" || item.needsSurgicalRepair
                                    ? "🟡 Entête à Réparer"
                                    : item.healthBadge === "corrupted"
                                    ? "🔴 Partiellement Écrasé"
                                    : "🟢 100 % Intègre"}
                                </span>
                              </div>
                            </div>
                          );
                        }))}
                      </div>
                    </div>

                    {/* PANE 3 (RIGHT, 4 COLS): FORENSIC INSPECTOR, HEX PREVIEW & RECOVERY CTA */}
                    <div className="col-span-4 bg-[#1C1C1C] flex flex-col justify-between p-4 min-h-0 overflow-y-auto">
                      {inspectedFile ? (
                        <div className="space-y-4">
                          <div className="p-3.5 rounded-2xl bg-[#222222] border border-[#2F2F2F] space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#2E2E2E] text-[#FBBF24]">
                                  .{inspectedFile.extension} • {inspectedFile.category}
                                </span>
                                <h3 className="text-sm font-bold text-[#EDEDEC] break-all mt-1.5">
                                  {inspectedFile.name}
                                </h3>
                              </div>
                            </div>

                            <p className="text-xs text-[#9B9A97] leading-relaxed">
                              {inspectedFile.codecOrFormatInfo}
                            </p>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2E2E2E] text-[11px]">
                              <div>
                                <span className="text-[#787774] block">Taille Physique</span>
                                <span className="font-mono font-semibold text-[#EDEDEC]">
                                  {formatBytes(inspectedFile.sizeBytes)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#787774] block">Adresse Début</span>
                                <span className="font-mono font-semibold text-[#EDEDEC]">
                                  LBA {inspectedFile.lbaOffset} ({inspectedFile.clusterCount} clusters)
                                </span>
                              </div>
                              <div>
                                <span className="text-[#787774] block">Entropie Shannon H(X)</span>
                                <span className="font-mono font-semibold text-[#60A5FA]">
                                  {inspectedFile.entropyScore.toFixed(3)} bits / octet
                                </span>
                              </div>
                              <div>
                                <span className="text-[#787774] block">Fragments</span>
                                <span className="font-mono font-semibold text-[#34D399]">
                                  {inspectedFile.fragmentCount} segment(s)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Hexadecimal Magic Bytes Inspector */}
                          <div className="p-3.5 rounded-2xl bg-[#141414] border border-[#2A2A2A] space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-[#9B9A97] flex items-center gap-1.5">
                                <FileCode className="w-3.5 h-3.5 text-[#3B82F6]" />
                                Inspecteur Hexadécimal (En-tête LBA)
                              </span>
                              <span className="font-mono text-[10px] text-[#787774]">Offset 0x00</span>
                            </div>
                            <div className="font-mono text-[11px] text-[#10B981] bg-[#0E0E0E] p-2.5 rounded-xl border border-[#242424] leading-relaxed break-all">
                              {inspectedFile.headerHexPreview}
                            </div>
                          </div>

                          {inspectedFile.needsSurgicalRepair && (
                            <div className="p-3.5 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#FBBF24] space-y-2">
                              <div className="font-bold flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5" />
                                <span>Entête à Réparer (Atome moov ou RIFF tronqué)</span>
                              </div>
                              <p className="text-[11px] text-[#EDEDEC]/80 leading-relaxed">
                                Les flux de ce média sont présents sur le disque mais l&apos;index est incomplet suite à une coupure ou un crash.
                              </p>
                              {inspectedFile.sourcePath && (
                                <button
                                  type="button"
                                  onClick={() => handleSendToRepairWorkshop(inspectedFile)}
                                  className="w-full py-2 px-3 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                                >
                                  <Wrench className="w-3.5 h-3.5" />
                                  <span>Réparer dans l&apos;Atelier 2 en 1 clic</span>
                                </button>
                              )}
                            </div>
                          )}

                          {inspectedFile.sourcePath && !inspectedFile.needsSurgicalRepair && (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewMediaUrl(inspectedFile.sourcePath!);
                                setPreviewMediaTitle(inspectedFile.name);
                              }}
                              className="w-full py-2 px-3 rounded-xl bg-[#252525] hover:bg-[#2E2E2E] border border-[#3E3E3E] text-[#EDEDEC] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current text-[#10B981]" />
                              <span>Aperçu direct du fichier</span>
                            </button>
                          )}

                          {lastExportResult && (
                            <div className="p-3.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 space-y-2 text-xs">
                              <div className="font-bold text-[#34D399] flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>
                                  {lastExportResult.recoveredCount} fichier(s) sauvegardé(s) !
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    handleRevealInFinder(lastExportResult.destinationFolder)
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-[#10B981] text-black font-semibold text-[11px] flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Ouvrir dans le Finder</span>
                                </button>
                                <button
                                  onClick={() => handleRevealInFinder(lastExportResult.reportPath)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#262626] text-[#EDEDEC] border border-[#383838] text-[11px]"
                                >
                                  Voir Certificat
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="my-auto text-center text-xs text-[#787774]">
                          Sélectionnez un fichier dans la liste pour inspecter ses secteurs LBA et son en-tête binaire.
                        </div>
                      )}

                      {/* Bottom Export Recovery Action Button */}
                      <div className="pt-3 border-t border-[#2A2A2A] space-y-2">
                        <label className="flex items-center gap-2 text-[11px] text-[#9B9A97] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.autoRepairCarvedMedia}
                            onChange={(e) =>
                              handleUpdateSetting("autoRepairCarvedMedia", e.target.checked)
                            }
                            className="rounded accent-[#10B981]"
                          />
                          <span>Réparer automatiquement les atomes moov/RIFF à la volée</span>
                        </label>

                        <button
                          onClick={handleExportRecoveredSelection}
                          disabled={selectedItemsList.length === 0 || isRecoveringExport}
                          className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                            selectedItemsList.length > 0 && !isRecoveringExport
                              ? "bg-gradient-to-r from-[#F59E0B] via-[#EAB308] to-[#10B981] hover:from-[#D97706] hover:to-[#059669] text-black cursor-pointer"
                              : "bg-[#242424] text-[#5A5A58] border border-[#2F2F2F] cursor-not-allowed"
                          }`}
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>
                            {isRecoveringExport
                              ? "Extraction & Synthèse en cours…"
                              : `Récupérer (${selectedItemsList.length}) • ${formatBytes(
                                  selectedTotalBytes
                                )}`}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================= ATELIER 2: RÉPARATION MÉDIA ================= */}
          {activeTab === "repair" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-5 gap-4">
              {/* Top Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#202020] border border-[#2F2F2F] rounded-xl p-3.5 shrink-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-[#EDEDEC] flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#3B82F6]" />
                    <span>Réparation Média</span>
                  </h1>
                  <button
                    type="button"
                    onClick={() => setActiveToolModal("tool4")}
                    className="text-[#787774] hover:text-[#EDEDEC] transition-colors cursor-pointer"
                    title="Informations"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLoadCorruptedDemoLab}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 border border-[#3B82F6]/30 text-xs font-medium text-[#60A5FA] transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Laboratoire Démo</span>
                  </button>

                  <button
                    onClick={handlePickCorruptedMediaFiles}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282828] hover:bg-[#323232] border border-[#353535] text-xs font-medium text-[#EDEDEC] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>Ajouter des fichiers…</span>
                  </button>

                  {repairItems.length > 0 && (
                    <button
                      onClick={() => {
                        setRepairItems([]);
                        setSelectedRepairId(null);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#252525] hover:bg-[#EF4444]/20 text-[#9B9A97] hover:text-[#FCA5A5] border border-[#2F2F2F] text-xs transition-colors"
                    >
                      Vider
                    </button>
                  )}
                </div>
              </div>

              {/* Main 12-Col Grid */}
              <div className="flex-1 grid grid-cols-12 gap-5 min-h-0">
                {/* LEFT 7 COLS: CORRUPTED MEDIA QUEUE */}
                <div className="col-span-7 flex flex-col min-h-0 bg-[#202020] border border-[#2F2F2F] rounded-xl overflow-hidden">
                  {repairItems.length === 0 ? (
                    <div
                      onClick={handlePickCorruptedMediaFiles}
                      className="flex-1 flex flex-col items-center justify-center text-center p-8 cursor-pointer hover:bg-[#232323] transition-colors"
                    >
                      <Film className="w-8 h-8 text-[#3B82F6] mb-2 opacity-80" />
                      <p className="text-sm font-medium text-[#EDEDEC]">
                        Déposez vos médias corrompus ici
                      </p>
                      <p className="text-[11px] text-[#787774] mt-1 font-mono">
                        .MOV • .MP4 • .MXF • .BRAW • .ARW • .CR3 • .NEF • .DNG • .WAV
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto divide-y divide-[#2A2A2A] p-3 space-y-2.5">
                      {repairItems.map((item) => {
                        const isSelected = activeRepairItem?.id === item.id;
                        const isRepaired = item.healthStatus === "repaired";
                        const isHealthy = item.healthStatus === "healthy";
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedRepairId(item.id)}
                            className={`rounded-xl p-3.5 border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#272727] border-[#3B82F6]"
                                : "bg-[#191919] border-[#2C2C2C] hover:border-[#3A3A3A]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-[#EDEDEC] truncate">
                                    {item.fileName}
                                  </span>
                                  <span
                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                      isRepaired || isHealthy
                                        ? "bg-[#10B981]/15 border-[#10B981]/30 text-[#34D399]"
                                        : "bg-[#EF4444]/15 border-[#EF4444]/30 text-[#FCA5A5]"
                                    }`}
                                  >
                                    {item.anomalySummary}
                                  </span>
                                </div>

                                <p className="text-[11px] text-[#9B9A97] font-mono mt-1">
                                  {formatBytes(item.sizeBytes)} • {item.detectedCodec} • Entropie H={item.entropyBitsPerByte.toFixed(3)} b/o
                                </p>
                              </div>

                              {item.repairedOutputPath && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewMediaUrl(item.repairedOutputPath!);
                                      setPreviewMediaTitle(item.fileName);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-[11px] flex items-center gap-1 shrink-0 transition-colors"
                                    title="Lire la vidéo ou le média réparé directement dans l'application"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Aperçu</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRevealInFinder(item.repairedOutputPath!);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-[#10B981] hover:bg-[#059669] text-black font-bold text-[11px] flex items-center gap-1 shrink-0 transition-colors"
                                    title="Afficher le fichier réparé dans le Finder"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Finder</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Visual Atom / Box Chain */}
                            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                              {item.atoms.map((atom, idx) => (
                                <div
                                  key={idx}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 ${
                                    atom.status === "valid"
                                      ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#34D399]"
                                      : atom.status === "synthesized"
                                      ? "bg-[#3B82F6]/15 border-[#3B82F6]/40 text-[#93C5FD]"
                                      : "bg-[#EF4444]/15 border-[#EF4444]/35 text-[#FCA5A5]"
                                  }`}
                                  title={atom.description}
                                >
                                  <span>[{atom.fourcc}]</span>
                                  <span>
                                    {atom.status === "missing"
                                      ? "MANQUANT"
                                      : atom.status === "synthesized"
                                      ? "SYNTHÉTISÉ"
                                      : formatBytes(atom.size)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* RIGHT 5 COLS: SURGICAL INSPECTOR, REFERENCE FILE & LAUNCHER */}
                <div className="col-span-5 flex flex-col justify-between bg-[#202020] border border-[#2F2F2F] rounded-2xl p-4 min-h-0 overflow-y-auto space-y-4">
                  <div className="space-y-4">
                    {/* Reference File Box */}
                    <div className="p-3.5 rounded-xl bg-[#191919] border border-[#2F2F2F] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#EDEDEC] flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-[#F59E0B]" />
                          Fichier de Référence Sain (Optionnel)
                        </span>
                        {referenceFile && (
                          <button
                            onClick={() => setReferenceFile(null)}
                            className="text-[11px] text-[#9B9A97] hover:text-[#EF4444]"
                          >
                            Retirer
                          </button>
                        )}
                      </div>

                      {referenceFile ? (
                        <div className="p-2.5 rounded-lg bg-[#222222] border border-[#10B981]/30 space-y-1">
                          <div className="text-xs font-semibold text-[#34D399] truncate">
                            ✓ {referenceFile.fileName}
                          </div>
                          <div className="text-[11px] text-[#9B9A97] font-mono">
                            {referenceFile.summary}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-[#9B9A97] leading-relaxed">
                            Pour les vidéos gravement tronquées, fournissez un clip sain issu de la même caméra.
                          </p>
                          <button
                            onClick={handlePickReferenceMedia}
                            className="px-3 py-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] border border-[#383838] text-xs font-medium text-[#EDEDEC] shrink-0"
                          >
                            Choisir…
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Detailed Diagnostic of Selected Media */}
                    {activeRepairItem && (
                      <div className="p-3.5 rounded-xl bg-[#191919] border border-[#2F2F2F] space-y-3">
                        <div className="text-xs font-bold text-[#EDEDEC]">
                          Rapport Structurel : {activeRepairItem.fileName}
                        </div>

                        <ul className="space-y-1.5 text-[11px] text-[#9B9A97]">
                          {activeRepairItem.diagnosticDetails.map((d, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-[#F59E0B] mt-0.5">•</span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>

                        <div className="font-mono text-[10px] text-[#60A5FA] bg-[#121212] p-2.5 rounded-lg border border-[#262626] break-all">
                          Hex[0..48] : {activeRepairItem.headerHex}
                        </div>

                        {activeRepairItem.repairLog.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 space-y-1">
                            <div className="text-[11px] font-bold text-[#34D399]">
                              Journal d&apos;Intervention Chirurgicale :
                            </div>
                            {activeRepairItem.repairLog.map((logLine, idx) => (
                              <div key={idx} className="text-[11px] text-[#EDEDEC] font-mono">
                                → {logLine}
                              </div>
                            ))}
                          </div>
                        )}

                        {activeRepairItem.repairedOutputPath && (
                          <div className="p-3.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/35 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-[#34D399] flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                                Fichier Restructuré &amp; Validé
                              </span>
                              <span className="text-[10px] font-mono text-[#A7F3D0] truncate max-w-[130px]">
                                {activeRepairItem.fileName}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#9B9A97] leading-relaxed">
                              L&apos;entête et la table d&apos;index d&apos;échantillons ont été injectés avec succès. Vous pouvez visualiser le résultat immédiatement dans l&apos;application.
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewMediaUrl(activeRepairItem.repairedOutputPath!);
                                  setPreviewMediaTitle(activeRepairItem.fileName);
                                }}
                                className="flex-1 py-2 px-3 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Aperçu Instantané</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevealInFinder(activeRepairItem.repairedOutputPath!)}
                                className="py-2 px-3 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] border border-[#3A3A3A] text-xs font-semibold text-[#EDEDEC] flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Finder</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Output Folder & Surgical Launch CTA */}
                  <div className="pt-3 border-t border-[#2F2F2F] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase tracking-wider text-[#787774] block">
                          Dossier d&apos;exportation
                        </span>
                        <span className="text-xs font-mono text-[#9B9A97] truncate block">
                          {repairOutputDir || "Par défaut (HardRecover_Vault)"}
                        </span>
                      </div>
                      <button
                        onClick={handlePickRepairOutputFolder}
                        className="px-2.5 py-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] border border-[#383838] text-xs text-[#EDEDEC] shrink-0"
                      >
                        Modifier…
                      </button>
                    </div>

                    <button
                      onClick={handleRunSurgicalRepair}
                      disabled={repairItems.length === 0 || isRepairingBatch}
                      className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                        repairItems.length > 0 && !isRepairingBatch
                          ? "bg-gradient-to-r from-[#F59E0B] via-[#EAB308] to-[#10B981] hover:from-[#D97706] hover:to-[#059669] text-black cursor-pointer"
                          : "bg-[#242424] text-[#5A5A58] border border-[#2F2F2F] cursor-not-allowed"
                      }`}
                    >
                      <Wrench className="w-4 h-4" />
                      <span>
                        {isRepairingBatch
                          ? "Synthèse d'Atomes en cours…"
                          : `Réparer les Médias (${repairItems.length})`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= ATELIER 3: SANTÉ & CLONE ================= */}
          {activeTab === "surface" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Target Device Selector Bar */}
              <div className="bg-[#202020] border border-[#2F2F2F] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-[#EDEDEC] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#10B981]" />
                    <span>Santé &amp; Clonage</span>
                  </h1>
                  <button
                    type="button"
                    onClick={() => setActiveToolModal("tool1")}
                    className="text-[#787774] hover:text-[#EDEDEC] transition-colors cursor-pointer"
                    title="Informations"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedSurfaceDevice?.id || ""}
                    onChange={(e) => {
                      const found = devices.find((d) => d.id === e.target.value);
                      if (found) {
                        setSelectedSurfaceDevice(found);
                        setSurfaceReport(null);
                        setQuarantineResult(null);
                        setRegenerationResult(null);
                        setDiskImageJob(null);
                      }
                    }}
                    className="bg-[#141414] border border-[#333333] rounded-lg px-2.5 py-1.5 text-xs text-[#EDEDEC]"
                  >
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({formatBytes(d.totalBytes)})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleRunSurfaceDiagnostic}
                    disabled={!selectedSurfaceDevice || isRunningSurfaceCheck}
                    className="px-3 py-1.5 rounded-lg bg-[#282828] hover:bg-[#323232] border border-[#353535] text-xs font-medium text-[#EDEDEC] transition-colors cursor-pointer"
                  >
                    {isRunningSurfaceCheck ? "Diagnostic…" : "Diagnostic"}
                  </button>

                  <button
                    onClick={handleGenerateForensicCertificate}
                    disabled={!selectedSurfaceDevice || isGeneratingCertificate}
                    className="px-3 py-1.5 rounded-lg bg-[#282828] hover:bg-[#323232] border border-[#353535] text-xs font-medium text-[#EDEDEC] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>{isGeneratingCertificate ? "Génération…" : "Rapport"}</span>
                  </button>

                  <button
                    onClick={handleStartDiskImager}
                    disabled={!selectedSurfaceDevice || isImagingDrive}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-black transition-colors cursor-pointer"
                  >
                    {isImagingDrive ? "Clonage…" : "Créer Image (.img)"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* LEFT 6 COLS: 5-PASS DISK IMAGER & LBA MAP */}
                <div className="lg:col-span-6 bg-[#202020] border border-[#2F2F2F] rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#EDEDEC]">
                      Image Disque (.img)
                    </span>
                    <div className="flex items-center gap-3 text-[10px] text-[#9B9A97]">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />Sain</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />Sauté</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />Erreur</span>
                    </div>
                  </div>

                  {diskImageJob ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-[#191919] border border-[#2A2A2A] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-[#34D399]">
                              {diskImageJob.phaseLabel}
                            </div>
                            <div className="text-[11px] text-[#787774] font-mono mt-0.5">
                              {formatSpeed(diskImageJob.speedBps)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevealInFinder(diskImageJob.outputImagePath)}
                            className="px-2.5 py-1 rounded-lg bg-[#252525] hover:bg-[#303030] border border-[#353535] text-[#EDEDEC] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Finder</span>
                          </button>
                        </div>

                        {/* Read-Only Mounting Controls */}
                        <div className="pt-2 border-t border-[#262626] flex flex-wrap items-center justify-between gap-2">
                          {mountedImage && mountedImage.imagePath === diskImageJob.outputImagePath ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-[#34D399] flex items-center gap-1">
                                <Disc className="w-3.5 h-3.5" />
                                <span>Montée : {mountedImage.mountPoint}</span>
                              </span>
                              <button
                                onClick={() => handleRevealInFinder(mountedImage.mountPoint)}
                                className="px-2 py-0.5 rounded bg-[#10B981] text-black text-xs font-medium cursor-pointer"
                              >
                                Ouvrir
                              </button>
                              <button
                                onClick={() => handleUnmountRescueImage(mountedImage.mountPoint)}
                                className="px-2 py-0.5 rounded bg-[#2A2A2A] hover:bg-[#333333] text-xs text-[#EDEDEC] cursor-pointer"
                              >
                                Démonter
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleMountRescueImage(diskImageJob.outputImagePath)}
                              disabled={isMountingImage}
                              className="px-2.5 py-1 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <Disc className="w-3.5 h-3.5" />
                              <span>{isMountingImage ? "Montage…" : "Monter (Finder)"}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 240-Cell LBA Grid */}
                      <div className="grid grid-cols-20 gap-1 p-2.5 rounded-lg bg-[#141414] border border-[#252525]">
                        {diskImageJob.sectorGrid.map((cell, idx) => (
                          <div
                            key={idx}
                            className={`h-2.5 rounded-[1px] ${
                              cell === 3
                                ? "bg-[#EF4444]"
                                : cell === 2
                                ? "bg-[#F59E0B]"
                                : "bg-[#10B981]/80"
                            }`}
                          />
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-[#191919] border border-[#252525]">
                          <div className="text-[#10B981] font-mono font-bold">
                            {diskImageJob.healthyBlocks}
                          </div>
                          <div className="text-[10px] text-[#787774]">Sains</div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#191919] border border-[#252525]">
                          <div className="text-[#F59E0B] font-mono font-bold">
                            {diskImageJob.slowBlocks}
                          </div>
                          <div className="text-[10px] text-[#787774]">Sautés</div>
                        </div>
                        <div className="p-2 rounded-lg bg-[#191919] border border-[#252525]">
                          <div className="text-[#EF4444] font-mono font-bold">
                            {diskImageJob.badSectors}
                          </div>
                          <div className="text-[10px] text-[#787774]">Erreurs</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-lg bg-[#181818] border border-[#252525] text-center space-y-1.5">
                      <Disc className="w-6 h-6 text-[#787774] mx-auto" />
                      <p className="text-xs text-[#9B9A97]">
                        Aucun clonage en cours.
                      </p>
                    </div>
                  )}
                </div>

                {/* RIGHT 6 COLS: TOOL 7 — SURFACE LATENCY & ANTI-COUNTERFEIT REPORT */}
                <div className="lg:col-span-6 bg-[#202020] border border-[#2F2F2F] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[#60A5FA]">
                        Diagnostic de Santé &amp; Vitesse Cellulaire
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveToolModal("tool7")}
                        className="w-5 h-5 rounded-full bg-[#2A2A2A] hover:bg-[#383838] border border-[#3E3E3E] flex items-center justify-center text-[#9B9A97] hover:text-[#EDEDEC] transition-colors cursor-pointer"
                        title="Comprendre l'Outil 7 (Explication & Schéma)"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-[11px] font-mono text-[#10B981]">
                      Analyse de Surface Directe
                    </span>
                  </div>

                  {surfaceReport ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-[#191919] border border-[#10B981]/30 space-y-1">
                        <div className="text-xs font-bold text-[#34D399]">
                          ✓ {surfaceReport.smartStatus}
                        </div>
                        <div className="text-[11px] text-[#9B9A97]">
                          {surfaceReport.counterfeitNote}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2.5 rounded-xl bg-[#191919] border border-[#2A2A2A]">
                          <div className="font-mono font-bold text-[#EDEDEC]">
                            {surfaceReport.avgLatencyUs} µs
                          </div>
                          <div className="text-[10px] text-[#9B9A97]">Latence Moyenne</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#191919] border border-[#2A2A2A]">
                          <div className="font-mono font-bold text-[#60A5FA]">
                            {surfaceReport.p99LatencyUs} µs
                          </div>
                          <div className="text-[10px] text-[#9B9A97]">Latence P99</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#191919] border border-[#2A2A2A]">
                          <div className="font-mono font-bold text-[#34D399]">
                            {surfaceReport.entropyDistribution}
                          </div>
                          <div className="text-[10px] text-[#9B9A97]">Entropie Moyenne</div>
                        </div>
                      </div>

                      {/* SYNTHETIC COMPACT HEALTH METRICS & 4 COLOR-CODED BLOCKS */}
                      {(() => {
                        const greenCount = surfaceReport.testedBlocksGrid.filter((v) => v === 1).length;
                        const blueCount = surfaceReport.testedBlocksGrid.filter((v) => v === 2).length;
                        const yellowCount = surfaceReport.testedBlocksGrid.filter((v) => v === 3).length;
                        const redCount = surfaceReport.testedBlocksGrid.filter((v) => v === 4).length;
                        const totalBlocks = surfaceReport.testedBlocksGrid.length || 1;

                        return (
                          <div className="space-y-3 pt-1">
                            {/* Sleek Horizontal Segmented Health Bar */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-[#9B9A97]">
                                <span className="flex items-center gap-1.5">
                                  <span>Cartographie de Surface Forensique</span>
                                  <span className="text-[10px] text-[#787774]">
                                    (1 sonde ≈ {(surfaceReport.totalBytes / (totalBlocks * 1024 * 1024)).toFixed(0)} Mo)
                                  </span>
                                </span>
                                <span className="font-mono text-[#EDEDEC]">
                                  {totalBlocks} sondes réparties sur {formatBytes(surfaceReport.totalBytes)}
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-[#141414] border border-[#2A2A2A] flex overflow-hidden">
                                {greenCount > 0 && (
                                  <div
                                    style={{ width: `${(greenCount / totalBlocks) * 100}%` }}
                                    className="h-full bg-[#10B981] transition-all"
                                    title={`Sains (< 1 ms) : ${greenCount} sondes`}
                                  />
                                )}
                                {blueCount > 0 && (
                                  <div
                                    style={{ width: `${(blueCount / totalBlocks) * 100}%` }}
                                    className="h-full bg-[#3B82F6] transition-all"
                                    title={`Normaux (1-5 ms) : ${blueCount} sondes`}
                                  />
                                )}
                                {yellowCount > 0 && (
                                  <div
                                    style={{ width: `${(yellowCount / totalBlocks) * 100}%` }}
                                    className="h-full bg-[#F59E0B] transition-all"
                                    title={`Fatigue (5-50 ms) : ${yellowCount} sondes`}
                                  />
                                )}
                                {redCount > 0 && (
                                  <div
                                    style={{ width: `${(redCount / totalBlocks) * 100}%` }}
                                    className="h-full bg-[#EF4444] transition-all"
                                    title={`Critiques / HS (> 50 ms) : ${redCount} sondes`}
                                  />
                                )}
                              </div>
                            </div>

                            {/* 4 Compact Visual Indicator Cards Requested by User */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {/* Green: Healthy */}
                              <div className="p-3 rounded-xl bg-[#171717] border border-[#252525] flex flex-col items-center justify-center text-center">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#10B981] shrink-0" />
                                  <span className="text-[11px] font-bold text-[#10B981]">Plages Saines</span>
                                </div>
                                <div className="text-base font-mono font-bold text-[#EDEDEC]">{greenCount}</div>
                                <div className="text-[10px] text-[#787774]">&lt; 1 ms • {((greenCount / totalBlocks) * 100).toFixed(0)}%</div>
                              </div>

                              {/* Blue: Normal */}
                              <div className="p-3 rounded-xl bg-[#171717] border border-[#252525] flex flex-col items-center justify-center text-center">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#3B82F6] shrink-0" />
                                  <span className="text-[11px] font-bold text-[#60A5FA]">Normales</span>
                                </div>
                                <div className="text-base font-mono font-bold text-[#EDEDEC]">{blueCount}</div>
                                <div className="text-[10px] text-[#787774]">1-5 ms • {((blueCount / totalBlocks) * 100).toFixed(0)}%</div>
                              </div>

                              {/* Yellow: Fatigued */}
                              <div className="p-3 rounded-xl bg-[#171717] border border-[#252525] flex flex-col items-center justify-center text-center">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#F59E0B] shrink-0" />
                                  <span className="text-[11px] font-bold text-[#FBBF24]">Fatiguées</span>
                                </div>
                                <div className="text-base font-mono font-bold text-[#EDEDEC]">{yellowCount}</div>
                                <div className="text-[10px] text-[#787774]">5-50 ms • {((yellowCount / totalBlocks) * 100).toFixed(0)}%</div>
                              </div>

                              {/* Red: Dead / HS */}
                              <div className="p-3 rounded-xl bg-[#171717] border border-[#252525] flex flex-col items-center justify-center text-center">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#EF4444] shrink-0" />
                                  <span className="text-[11px] font-bold text-[#EF4444]">Critiques (HS)</span>
                                </div>
                                <div className="text-base font-mono font-bold text-[#EDEDEC]">{redCount}</div>
                                <div className="text-[10px] text-[#787774]">&gt; 50 ms • {((redCount / totalBlocks) * 100).toFixed(0)}%</div>
                              </div>
                            </div>

                            {/* AUTOMATIC MICRO-SCAN CHIRURGICAL SECTION */}
                            {surfaceReport.autoMicroScans && surfaceReport.autoMicroScans.length > 0 ? (
                              <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-[#F59E0B]/40 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Search className="w-4 h-4 text-[#F59E0B]" />
                                    <span className="text-xs font-bold text-[#EDEDEC]">
                                      Micro-Scan Chirurgical Automatique Déclenché ({surfaceReport.autoMicroScans.length} zone(s) ciblée(s))
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/30">
                                    Auto-Ciblage Actif
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#9B9A97]">
                                  Le radar global a détecté des anomalies : le moteur a automatiquement exécuté un zoom chirurgical secteur par secteur sur les tranches dégradées pour isoler la panne avec une empreinte minimale.
                                </p>

                                {surfaceReport.autoMicroScans.map((ms, idx) => (
                                  <div key={idx} className="p-3 rounded-lg bg-[#141414] border border-[#2A2A2A] space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-bold text-[#60A5FA]">
                                        Tranche #{ms.probeIndex + 1} ({formatBytes(ms.startByte)} → {formatBytes(ms.endByte)})
                                      </span>
                                      <span className="font-mono text-[10px] text-[#9B9A97]">
                                        LBA #{ms.startLba.toLocaleString()} → #{ms.endLba.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-[#C5C5C4] leading-relaxed">
                                      {ms.summary}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                                      <div className="p-1.5 rounded bg-[#181818] border border-[#242424]">
                                        <div className="text-[10px] text-[#787774]">Pages 4K Analysées</div>
                                        <div className="font-mono font-bold text-[#EDEDEC]">{ms.testedPagesCount}</div>
                                      </div>
                                      <div className="p-1.5 rounded bg-[#181818] border border-[#242424]">
                                        <div className="text-[10px] text-[#787774]">Secteurs HS Détectés</div>
                                        <div className={`font-mono font-bold ${ms.badBlocksCount > 0 ? "text-[#EF4444]" : "text-[#10B981]"}`}>
                                          {ms.badBlocksCount}
                                        </div>
                                      </div>
                                      <div className="p-1.5 rounded bg-[#181818] border border-[#242424]">
                                        <div className="text-[10px] text-[#787774]">Quarantaine Minimale</div>
                                        <div className="font-mono font-bold text-[#F59E0B]">
                                          {ms.quarantinedBytes > 0 ? formatBytes(ms.quarantinedBytes) : "0 Mo"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-lg bg-[#141414] border border-[#10B981]/25 flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-2 text-[#34D399]">
                                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                                  <span className="font-semibold">Diagnostic Auto-Focus : Aucune zone dégradée.</span>
                                </div>
                                <span className="text-[10px] text-[#787774]">
                                  Toutes les 240 sondes sont saines — aucun micro-scan requis.
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-[#181818] border border-dashed border-[#333333] text-center space-y-2">
                      <Activity className="w-8 h-8 text-[#3B82F6] mx-auto" />
                      <p className="text-xs font-semibold text-[#EDEDEC]">
                        Cliquez sur « Tester Latence &amp; Anti-Contrefaçon »
                      </p>
                      <p className="text-[11px] text-[#9B9A97]">
                        Mesure le temps de réponse physique des cellules NAND (détection précoce du Bit-Rot) et vérifie l&apos;authenticité de la capacité annoncée.
                      </p>
                    </div>
                  )}
                </div>

                {/* UNIFIED SMART REMEDIATION CARD */}
                {(() => {
                  const redCount = surfaceReport?.badSectorsCount ?? (surfaceReport?.testedBlocksGrid.filter((v) => v === 4).length ?? 0);
                  const yellowCount = surfaceReport?.slowCellsCount ?? (surfaceReport?.testedBlocksGrid.filter((v) => v === 3).length ?? 0);
                  const isCritical = redCount > 5;
                  const hasIsolatedBadBlocks = redCount > 0 && redCount <= 5;
                  const hasFatigueOnly = redCount === 0 && yellowCount > 0;

                  return (
                    <div className="lg:col-span-12 bg-[#202020] border border-[#2F2F2F] rounded-2xl p-5 space-y-4">
                      {/* Card Header with Technical (i) Info buttons for Tool 8 & Tool 9 */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                          <h2 className="text-xs font-bold uppercase tracking-wider text-[#EDEDEC]">
                            Remédiation Intelligente &amp; Sauvetage Automatique
                          </h2>
                          <div className="flex items-center gap-1.5 ml-2">
                            <button
                              type="button"
                              onClick={() => setActiveToolModal("tool8")}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1A1A1A] hover:bg-[#282828] border border-[#383838] text-[10px] text-[#F59E0B] cursor-pointer transition-colors"
                              title="Comprendre l'Outil 8 (Neutralisation Blocs HS & Garantie 1 Partition)"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>Outil 8 : Neutralisation</span>
                              <Info className="w-2.5 h-2.5 text-[#9B9A97]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveToolModal("tool9")}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1A1A1A] hover:bg-[#282828] border border-[#383838] text-[10px] text-[#FBBF24] cursor-pointer transition-colors"
                              title="Comprendre l'Outil 9 (Régénération des Cellules Lentes)"
                            >
                              <Zap className="w-3 h-3" />
                              <span>Outil 9 : Régénération</span>
                              <Info className="w-2.5 h-2.5 text-[#9B9A97]" />
                            </button>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {!surfaceReport ? (
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#2A2A2A] text-[#9B9A97] border border-[#3A3A3A]">
                            En attente de diagnostic
                          </span>
                        ) : isCritical ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Défaillance Matérielle Critique ({redCount} blocs HS)
                          </span>
                        ) : hasIsolatedBadBlocks ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/40 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Blocs HS Isolés Réhabilitables ({redCount} bloc{redCount > 1 ? "s" : ""})
                          </span>
                        ) : hasFatigueOnly ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#EAB308]/20 text-[#FACC15] border border-[#EAB308]/40 flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            Fatigue Cellulaire ({yellowCount} zone{yellowCount > 1 ? "s" : ""})
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Support 100% Sain
                          </span>
                        )}
                      </div>

                      {/* Smart Diagnosis & Single-Click Action Card */}
                      <div
                        className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                          !surfaceReport
                            ? "bg-[#171717] border-[#2C2C2C]"
                            : isCritical
                            ? "bg-[#EF4444]/10 border-[#EF4444]/40"
                            : hasIsolatedBadBlocks
                            ? "bg-[#F59E0B]/10 border-[#F59E0B]/40"
                            : hasFatigueOnly
                            ? "bg-[#EAB308]/10 border-[#EAB308]/40"
                            : "bg-[#10B981]/10 border-[#10B981]/30"
                        }`}
                      >
                        <div className="space-y-1.5 max-w-2xl">
                          <div className="text-xs font-bold text-[#EDEDEC] flex items-center gap-2">
                            <span>Recommandation du Moteur :</span>
                            <span className="font-normal text-[#9B9A97]">
                              {!surfaceReport
                                ? "Lancez d'abord le diagnostic pour analyser les cellules physiques."
                                : isCritical
                                ? "Réserve matérielle épuisée — Arrêt immédiat et sauvegarde d'urgence requise."
                                : hasIsolatedBadBlocks
                                ? "Neutralisation définitive des zones mortes (Garantie 1 seule partition intacte pour caméra)."
                                : hasFatigueOnly
                                ? "Re-polarisation électrique des cellules fatiguées sans toucher à vos données."
                                : "Aucune intervention matérielle nécessaire. Le support est en parfait état."}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#A8A8A8] leading-relaxed">
                            {!surfaceReport
                              ? "Cliquez sur « Lancer le Diagnostic de Santé » pour tester la vitesse de réaction des cellules et détecter les éventuelles zones d'usure ou contrefaçons."
                              : isCritical
                              ? "Les blocs défectueux dépassent la capacité de compensation du contrôleur. Tout nouvel enregistrement risque d'échouer. Ne tentez pas de formater ni de réécrire : sauvegardez immédiatement une copie conforme .img de vos rushs avant la panne totale."
                              : hasIsolatedBadBlocks
                              ? "Le moteur neutralise les secteurs HS dans la table d'allocation et isole l'Erase Block matériel. Votre carte reste en 1 SEULE et unique partition continue, reconnue instantanément par vos caméras et enregistreurs sans risque de bug."
                              : hasFatigueOnly
                              ? "Les cellules ralentissent avec le temps (5 à 50 ms). La régénération applique un rafraîchissement des niveaux de tension électrique pour restaurer la réactivité d'origine (< 1 ms) et prolonger la durée de vie de votre carte."
                              : "Toutes les cellules répondent en moins d'une milliseconde. Vous pouvez utiliser ce support en tournage en toute sérénité."}
                          </p>
                        </div>

                        {/* Action Button */}
                        <div className="shrink-0 w-full md:w-auto">
                          {!surfaceReport ? (
                            <button
                              onClick={handleRunSurfaceDiagnostic}
                              disabled={!selectedSurfaceDevice || isRunningSurfaceCheck}
                              className="w-full md:w-auto px-4 py-2.5 rounded-xl font-bold text-xs bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              {isRunningSurfaceCheck ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Diagnostic en cours…</span>
                                </>
                              ) : (
                                <>
                                  <Activity className="w-3.5 h-3.5" />
                                  <span>Lancer le Diagnostic de Santé</span>
                                </>
                              )}
                            </button>
                          ) : isCritical ? (
                            <button
                              onClick={handleStartDiskImager}
                              disabled={!selectedSurfaceDevice || isImagingDrive}
                              className="w-full md:w-auto px-4 py-2.5 rounded-xl font-bold text-xs bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              {isImagingDrive ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Clonage d'Urgence en cours…</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>🚨 Cloner d'Urgence en Image (.img)</span>
                                </>
                              )}
                            </button>
                          ) : hasIsolatedBadBlocks ? (
                            <button
                              onClick={handleIsolateBadBlocks}
                              disabled={!selectedSurfaceDevice || isQuarantining}
                              className="w-full md:w-auto px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#F59E0B] to-[#EF4444] hover:brightness-110 text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              {isQuarantining ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Neutralisation &amp; Réhabilitation…</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>🛡️ Réhabiliter le Support (1 Partition Saine)</span>
                                </>
                              )}
                            </button>
                          ) : hasFatigueOnly ? (
                            <button
                              onClick={handleRegenerateNand}
                              disabled={!selectedSurfaceDevice || isRegeneratingNand}
                              className="w-full md:w-auto px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#F59E0B] via-[#EAB308] to-[#10B981] hover:brightness-110 text-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              {isRegeneratingNand ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Re-polarisation en cours…</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3.5 h-3.5 fill-current" />
                                  <span>⚡ Régénérer le Support (Rafraîchir les charges)</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-xs font-semibold text-[#34D399]">
                              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                              <span>Support Sain — Aucune intervention requise</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quarantine Result Summary if present */}
                      {quarantineResult && (
                        <div className="p-4 rounded-xl bg-[#141414] border border-[#10B981]/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#34D399]">
                              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                              <span>{quarantineResult.summary}</span>
                            </div>
                            <span className="text-[11px] font-mono text-[#9B9A97]">
                              Partition Unique Conservée (Zero Splitting)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
                            <div className="p-2.5 rounded-lg bg-[#191919] border border-[#282828]">
                              <div className="text-[10px] text-[#787774]">Capacité Initiale</div>
                              <div className="font-mono font-bold text-[#EDEDEC]">
                                {formatBytes(quarantineResult.originalBytes)}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#191919] border border-[#EF4444]/30">
                              <div className="text-[10px] text-[#EF4444]">Zone HS Neutralisée</div>
                              <div className="font-mono font-bold text-[#EF4444]">
                                {formatBytes(quarantineResult.quarantinedBytes)}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#191919] border border-[#10B981]/30">
                              <div className="text-[10px] text-[#34D399]">Capacité Saine Dispo</div>
                              <div className="font-mono font-bold text-[#34D399]">
                                {formatBytes(quarantineResult.usableBytes)}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#191919] border border-[#282828]">
                              <div className="text-[10px] text-[#787774]">Clusters Isolés</div>
                              <div className="font-mono font-bold text-[#60A5FA]">
                                {quarantineResult.isolatedClustersCount}
                              </div>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-[#191919] border border-[#222222] space-y-1.5">
                            <div className="text-[11px] font-semibold text-[#EDEDEC]">
                              Journal des opérations matérielles :
                            </div>
                            <ul className="space-y-1 text-[11px] text-[#9B9A97] font-mono">
                              {quarantineResult.stepsPerformed.map((step, idx) => (
                                <li key={idx} className="flex items-center gap-1.5 text-[#A3E635]">
                                  <span>✓</span>
                                  <span className="text-[#C5C5C4]">{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Regeneration Result Summary if present */}
                      {regenerationResult && (
                        <div className="p-4 rounded-xl bg-[#141414] border border-[#FBBF24]/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#FBBF24]">
                              <Zap className="w-4 h-4 fill-current text-[#FBBF24]" />
                              <span>{regenerationResult.summary}</span>
                            </div>
                            <span className="text-[11px] font-mono text-[#34D399]">
                              Gain : ×{regenerationResult.speedupFactor.toFixed(0)} plus rapide
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-xs">
                            <div className="p-2.5 rounded-lg bg-[#191919] border border-[#282828]">
                              <div className="text-[10px] text-[#787774]">Blocs Régénérés</div>
                              <div className="font-mono font-bold text-[#EDEDEC]">
                                {regenerationResult.regeneratedBlocksCount}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#191919] border border-[#282828]">
                              <div className="text-[10px] text-[#787774]">Volume Réaligné</div>
                              <div className="font-mono font-bold text-[#60A5FA]">
                                {formatBytes(regenerationResult.regeneratedBytes)}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#191919] border border-[#F59E0B]/30">
                              <div className="text-[10px] text-[#FBBF24]">Latence Initiale</div>
                              <div className="font-mono font-bold text-[#FBBF24]">
                                {(regenerationResult.avgLatencyBeforeUs / 1000).toFixed(1)} ms
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#191919] border border-[#10B981]/30">
                              <div className="text-[10px] text-[#34D399]">Latence Re-polarisée</div>
                              <div className="font-mono font-bold text-[#34D399]">
                                {(regenerationResult.avgLatencyAfterUs / 1000).toFixed(2)} ms (&lt; 1 ms)
                              </div>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-[#191919] border border-[#222222] space-y-1.5">
                            <div className="text-[11px] font-semibold text-[#EDEDEC]">
                              Journal de re-polarisation sécurisée :
                            </div>
                            <ul className="space-y-1 text-[11px] text-[#9B9A97] font-mono">
                              {regenerationResult.details.map((step, idx) => (
                                <li key={idx} className="flex items-center gap-1.5 text-[#34D399]">
                                  <span>✓</span>
                                  <span className="text-[#C5C5C4]">{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* =====================================================================
              ATELIER 4: SAVED SESSIONS & FORENSIC REPORTS
             ===================================================================== */}
          {/* ================= HISTORIQUE ================= */}
          {activeTab === "sessions" && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <h1 className="text-sm font-semibold text-[#EDEDEC]">
                Historique des opérations
              </h1>

              {sessions.length === 0 ? (
                <div className="rounded-xl border border-[#2B2B2B] bg-[#202020]/40 p-8 text-center text-xs text-[#787774]">
                  Aucune session enregistrée.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="bg-[#202020] border border-[#2F2F2F] rounded-xl p-4 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                              sess.sessionType === "recovery"
                                ? "bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#FBBF24]"
                                : sess.sessionType === "repair"
                                ? "bg-[#3B82F6]/15 border-[#3B82F6]/30 text-[#60A5FA]"
                                : "bg-[#10B981]/15 border-[#10B981]/30 text-[#34D399]"
                            }`}
                          >
                            {sess.sessionType}
                          </span>
                          <span className="font-bold text-xs text-[#EDEDEC]">
                            {sess.targetName}
                          </span>
                          <span className="text-[11px] font-mono text-[#787774]">
                            {sess.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-[#9B9A97]">
                          {sess.statusLabel} • {formatBytes(sess.totalBytes)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {sess.destinationPath && (
                          <button
                            onClick={() => handleRevealInFinder(sess.destinationPath!)}
                            className="px-3 py-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] border border-[#383838] text-xs text-[#EDEDEC] flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>Ouvrir Dossier</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSession(sess.id)}
                          className="p-1.5 rounded-lg text-[#787774] hover:text-[#EF4444] hover:bg-[#2A2A2A]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ================= SETTINGS MODAL ================= */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#202020] border border-[#333333] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2F2F2F] pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#F59E0B]" />
                <h2 className="text-sm font-bold text-[#EDEDEC]">
                  Paramètres du Moteur HardRecover
                </h2>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-[#9B9A97] hover:text-[#EDEDEC]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#191919] border border-[#2A2A2A]">
                <div>
                  <div className="font-semibold text-[#EDEDEC]">
                    Contournement du Cache RAM macOS (F_NOCACHE)
                  </div>
                  <div className="text-[11px] text-[#9B9A97]">
                    Force la lecture directe des cellules physiques NAND/plateaux
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.bypassOsCache}
                  onChange={(e) => handleUpdateSetting("bypassOsCache", e.target.checked)}
                  className="accent-[#10B981]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#191919] border border-[#2A2A2A]">
                <div>
                  <div className="font-semibold text-[#EDEDEC]">
                    Pas de saut initial sur secteur défectueux (S₀)
                  </div>
                  <div className="text-[11px] text-[#9B9A97]">
                    Nombre de secteurs sautés dès la première erreur E/S
                  </div>
                </div>
                <input
                  type="number"
                  value={settings.initialJumpSectors}
                  onChange={(e) =>
                    handleUpdateSetting("initialJumpSectors", Number(e.target.value) || 64)
                  }
                  className="w-24 px-2.5 py-1 rounded-lg bg-[#121212] border border-[#333333] font-mono text-right text-[#EDEDEC]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#191919] border border-[#2A2A2A]">
                <div>
                  <div className="font-semibold text-[#EDEDEC]">
                    Délai d&apos;expiration Watchdog I/O (ms)
                  </div>
                  <div className="text-[11px] text-[#9B9A97]">
                    Seuil au-delà duquel un secteur est considéré instable
                  </div>
                </div>
                <input
                  type="number"
                  value={settings.badSectorTimeoutMs}
                  onChange={(e) =>
                    handleUpdateSetting("badSectorTimeoutMs", Number(e.target.value) || 250)
                  }
                  className="w-24 px-2.5 py-1 rounded-lg bg-[#121212] border border-[#333333] font-mono text-right text-[#EDEDEC]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#10B981] text-black font-bold text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= INSTANT IN-APP MEDIA PREVIEW PLAYER MODAL ================= */}
      {previewMediaUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[#1C1C1C] border border-[#333333] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#2C2C2C] flex items-center justify-between bg-[#222222]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#60A5FA]">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#EDEDEC] truncate">
                    Aperçu Instantané : {previewMediaTitle || "Média"}
                  </h3>
                  <p className="text-[11px] font-mono text-[#9B9A97] truncate">
                    {previewMediaUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRevealInFinder(previewMediaUrl)}
                  className="px-3 py-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] border border-[#3A3A3A] text-xs font-semibold text-[#EDEDEC] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Révéler dans le Finder</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewMediaUrl(null);
                    setPreviewMediaTitle("");
                  }}
                  className="p-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] text-[#A8A8A8] hover:text-[#EDEDEC] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Media Canvas */}
            <div className="flex-1 bg-black flex items-center justify-center p-4 min-h-[400px] max-h-[70vh] overflow-hidden">
              {previewMediaUrl.toLowerCase().endsWith(".mov") ||
              previewMediaUrl.toLowerCase().endsWith(".mp4") ||
              previewMediaUrl.toLowerCase().endsWith(".m4v") ||
              previewMediaUrl.toLowerCase().endsWith(".lrf") ? (
                <video
                  src={convertFileSrc(previewMediaUrl)}
                  controls
                  autoPlay
                  className="max-h-[65vh] max-w-full rounded-lg shadow-lg object-contain"
                />
              ) : previewMediaUrl.toLowerCase().endsWith(".wav") ||
                previewMediaUrl.toLowerCase().endsWith(".mp3") ||
                previewMediaUrl.toLowerCase().endsWith(".aac") ||
                previewMediaUrl.toLowerCase().endsWith(".m4a") ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#34D399]">
                    <Music className="w-10 h-10" />
                  </div>
                  <p className="text-sm font-semibold text-[#EDEDEC]">{previewMediaTitle}</p>
                  <audio
                    src={convertFileSrc(previewMediaUrl)}
                    controls
                    autoPlay
                    className="w-80 mt-2"
                  />
                </div>
              ) : (
                <img
                  src={convertFileSrc(previewMediaUrl)}
                  alt={previewMediaTitle}
                  className="max-h-[65vh] max-w-full rounded-lg shadow-lg object-contain"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#2C2C2C] bg-[#1E1E1E] flex items-center justify-between text-xs text-[#9B9A97]">
              <span>Lecture directe via moteur natif macOS AVFoundation &amp; Tauri</span>
              <button
                type="button"
                onClick={() => {
                  setPreviewMediaUrl(null);
                  setPreviewMediaTitle("");
                }}
                className="px-4 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= INTERACTIVE TOOL EDUCATIONAL MODAL ================= */}
      <ToolInfoModal
        toolId={activeToolModal}
        onClose={() => setActiveToolModal(null)}
      />
    </div>
  );
}
