import React, { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  HardDrive,
  Home,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import {
  AppSettings,
  DiskImageJobState,
  MediaRepairItem,
  MountedImageInfo,
  RecoverableFileItem,
  RecoveryExportResult,
  RecoveryScanJob,
  ReferenceFileInspection,
  SavedSessionEntry,
  ScanMode,
  StorageDevice,
  SurfaceHealthReport,
  UpdateCheckInfo,
} from "./types";
import { HardRecoverLogo } from "./Logo";
import { ToolInfoModal } from "./ToolInfoModal";
import { UpdateModal } from "./components/UpdateModal";
import { SettingsModal } from "./components/SettingsModal";
import { MediaPreviewModal } from "./components/MediaPreviewModal";
import { HomeView } from "./views/HomeView";
import { RecoveryView } from "./views/RecoveryView";
import { MediaRepairView } from "./views/MediaRepairView";
import { SurfaceImagerView } from "./views/SurfaceImagerView";
import { SessionsView } from "./views/SessionsView";

type ActiveTab = "home" | "recovery" | "repair" | "surface" | "sessions";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [devices, setDevices] = useState<StorageDevice[]>([]);
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [mountedImage, setMountedImage] = useState<MountedImageInfo | null>(
    null
  );
  const [isMountingImage, setIsMountingImage] = useState<boolean>(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] =
    useState<boolean>(false);
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

  const [isScanning, setIsScanning] = useState(false);
  const [activeScanJob, setActiveScanJob] = useState<RecoveryScanJob | null>(
    null
  );
  const [isRecoveringExport, setIsRecoveringExport] = useState<boolean>(false);
  const [lastExportResult, setLastExportResult] =
    useState<RecoveryExportResult | null>(null);

  const [repairItems, setRepairItems] = useState<MediaRepairItem[]>([]);
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] =
    useState<ReferenceFileInspection | null>(null);
  const [repairOutputDir, setRepairOutputDir] = useState<string>("");
  const [isRepairingBatch, setIsRepairingBatch] = useState<boolean>(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [previewMediaTitle, setPreviewMediaTitle] = useState<string>("");

  const [selectedSurfaceDevice, setSelectedSurfaceDevice] =
    useState<StorageDevice | null>(null);
  const [isImagingDrive, setIsImagingDrive] = useState<boolean>(false);
  const [diskImageJob, setDiskImageJob] = useState<DiskImageJobState | null>(
    null
  );
  const [isRunningSurfaceCheck, setIsRunningSurfaceCheck] =
    useState<boolean>(false);
  const [surfaceReport, setSurfaceReport] =
    useState<SurfaceHealthReport | null>(null);

  const [updateInfo, setUpdateInfo] = useState<UpdateCheckInfo | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [installStatus, setInstallStatus] = useState<string>(
    "Téléchargement de la mise à jour…"
  );

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
    invoke<UpdateCheckInfo>("check_for_updates")
      .then((info) => {
        if (info && info.updateAvailable) {
          setUpdateInfo(info);
        }
      })
      .catch((e) => console.log("Recherche silencieuse mise à jour:", e));

    refreshDevices();
    refreshSessions();
    invoke<AppSettings>("get_app_settings")
      .then((s) => {
        setSettings(s);
        setRepairOutputDir(s.defaultExportDir);
      })
      .catch(console.error);
  }, [refreshDevices, refreshSessions]);

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

  const handleStartRecoveryScan = useCallback(
    async (
      targetPath: string,
      deviceName: string,
      modeOverride: ScanMode = "quick_and_deep"
    ) => {
      setErrorBanner(null);
      setLastExportResult(null);
      setIsScanning(true);
      try {
        const job = await invokeWithTimeout<RecoveryScanJob>(
          "start_recovery_scan",
          {
            targetPath,
            deviceName,
            scanMode: modeOverride,
          },
          45000,
          "Analyse du support"
        );
        setActiveScanJob(job);
        if (job.filesFoundCount === 0) {
          showToast(
            `Analyse terminée : Aucun média détecté sur ${deviceName}`
          );
        } else {
          showToast(
            `Scan terminé : ${job.filesFoundCount} fichiers identifiés sur ${deviceName}`
          );
        }
      } catch (err) {
        setErrorBanner(String(err));
      } finally {
        setIsScanning(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    const webview = getCurrentWebviewWindow();
    const unlistenPromise = webview.onDragDropEvent(async (event) => {
      if (event.payload.type === "drop") {
        const paths = event.payload.paths;
        if (!paths || paths.length === 0) return;

        if (activeTab === "repair") {
          try {
            const diagnosed = await invoke<MediaRepairItem[]>(
              "diagnose_media_files",
              { paths }
            );
            setRepairItems((prev) => {
              const existingPaths = new Set(prev.map((i) => i.path));
              const filtered = diagnosed.filter(
                (d) => !existingPaths.has(d.path)
              );
              return [...prev, ...filtered];
            });
            if (diagnosed.length > 0) {
              setSelectedRepairId(diagnosed[0].id);
              showToast(
                `${diagnosed.length} média(s) analysé(s) dans l'Atelier Chirurgical.`
              );
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
  }, [activeTab, showToast, handleStartRecoveryScan]);

  const handleCheckUpdateManual = async () => {
    setIsCheckingUpdate(true);
    try {
      const info = await invoke<UpdateCheckInfo>("check_for_updates");
      if (info.updateAvailable) {
        setUpdateInfo(info);
        setIsUpdateModalOpen(true);
      } else {
        setUpdateInfo(null);
        showToast(`HardRecover est à jour (${info.currentVersion})`);
      }
    } catch {
      showToast(
        "Impossible de vérifier les mises à jour (vérifiez la connexion)"
      );
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleApplyUpdate = async () => {
    if (!updateInfo) return;
    setIsInstallingUpdate(true);
    setInstallStatus("Téléchargement de la mise à jour…");
    setDownloadProgress(0);

    const unlisten = await listen<number>(
      "update-download-progress",
      (event) => {
        const p = Math.round(event.payload);
        setDownloadProgress(p);
        if (p >= 100) {
          setInstallStatus("Installation et redémarrage automatique…");
        }
      }
    );

    try {
      await invoke("install_update", {
        downloadUrl: updateInfo.downloadUrl,
        assetSize: updateInfo.assetSize,
        assetUpdatedAt: updateInfo.assetUpdatedAt,
      });
    } catch (err) {
      unlisten();
      setIsInstallingUpdate(false);
      setErrorBanner(`Erreur mise à jour : ${err}`);
    }
  };

  const handleEjectDevice = async (
    e: React.MouseEvent,
    dev: StorageDevice
  ) => {
    e.stopPropagation();
    setErrorBanner(null);
    try {
      const msg = await invoke<string>("eject_volume", {
        mountPoint: dev.mountPoint,
      });
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
          {
            name: "Images Disques Forensiques",
            extensions: ["img", "dd", "raw", "dmg", "iso"],
          },
        ],
      });
      if (typeof selected === "string" && selected) {
        const name =
          selected.split("/").filter(Boolean).pop() || "Image Disque";
        await handleStartRecoveryScan(selected, name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportRecoveredSelection = async (
    itemsToExport: RecoverableFileItem[]
  ) => {
    if (!activeScanJob || itemsToExport.length === 0) return;
    setErrorBanner(null);

    try {
      const dest = await open({
        directory: true,
        multiple: false,
        title:
          "Choisir le disque/dossier de destination sécurisé (Différent du support source)",
        defaultPath: settings.defaultExportDir || "/Volumes",
      });
      if (typeof dest !== "string" || !dest) return;

      setIsRecoveringExport(true);
      const res = await invoke<RecoveryExportResult>("export_recovered_files", {
        sourceDevicePath: activeScanJob.devicePath,
        sourceDeviceName: activeScanJob.deviceName,
        items: itemsToExport,
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

  const handlePickCorruptedMediaFiles = async () => {
    setErrorBanner(null);
    try {
      const selected = await open({
        directory: false,
        multiple: true,
        title:
          "Sélectionner des vidéos (.MOV, .MP4, .BRAW), photos RAW (.ARW, .CR3, .JPG) ou audios (.WAV) corrompus",
      });
      const paths = Array.isArray(selected)
        ? selected
        : typeof selected === "string" && selected
        ? [selected]
        : [];
      if (paths.length === 0) return;

      const diagnosed = await invoke<MediaRepairItem[]>(
        "diagnose_media_files",
        { paths }
      );
      setRepairItems((prev) => {
        const seen = new Set(prev.map((i) => i.path));
        return [...prev, ...diagnosed.filter((d) => !seen.has(d.path))];
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
        const info = await invoke<ReferenceFileInspection>(
          "inspect_reference_media",
          { path: selected }
        );
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
      showToast(
        `${updated.length} média(s) réparé(s) chirurgicalement avec succès !`
      );
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
        const diagnosed = await invoke<MediaRepairItem[]>(
          "diagnose_media_files",
          { paths: [file.sourcePath] }
        );
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
      showToast(
        "Veuillez d'abord exporter ce fichier défragmenté pour lancer sa réparation."
      );
    }
  };

  const handleStartDiskImager = async () => {
    if (!selectedSurfaceDevice) return;
    setErrorBanner(null);
    try {
      const outDir = await open({
        directory: true,
        multiple: false,
        title:
          "Choisir le dossier où enregistrer l'image disque de sauvetage (.img + .hrmap)",
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
      const isHdd = selectedSurfaceDevice.deviceType === "hdd";
      const report = await invokeWithTimeout<SurfaceHealthReport>(
        "run_drive_surface_check",
        {
          mountPoint: selectedSurfaceDevice.mountPoint,
          deviceName: selectedSurfaceDevice.name,
          totalBytes: selectedSurfaceDevice.totalBytes,
          deviceType: selectedSurfaceDevice.deviceType,
        },
        15000,
        isHdd ? "Diagnostic de surface des plateaux" : "Diagnostic de surface"
      );
      setSurfaceReport(report);
      showToast(
        `Diagnostic S.M.A.R.T. & Surface terminé pour ${selectedSurfaceDevice.name}`
      );
    } catch (err) {
      setErrorBanner(String(err));
    } finally {
      setIsRunningSurfaceCheck(false);
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
      const next = await invoke<SavedSessionEntry[]>("delete_saved_session", {
        id,
      });
      setSessions(next);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMountRescueImage = async (imgPath: string) => {
    setIsMountingImage(true);
    try {
      const info = await invoke<MountedImageInfo>("mount_rescue_image", {
        imagePath: imgPath,
      });
      setMountedImage(info);
      showToast(`Image disque montée en lecture seule : ${info.mountPoint}`);
    } catch (err) {
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
    } catch (err) {
      setErrorBanner(`Erreur lors du démontage : ${err}`);
    }
  };

  const handleGenerateForensicCertificate = async () => {
    const dev =
      selectedSurfaceDevice ||
      devices.find((d) => d.mountPoint !== "/") ||
      devices[0];
    if (!dev) {
      showToast(
        "Veuillez sélectionner un support de stockage pour certifier le diagnostic"
      );
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
          badSectorsCount:
            surfaceReport?.badSectorsCount || diskImageJob?.badSectors || 0,
          quarantinedClusters: 0,
          imagePath: diskImageJob?.outputImagePath || undefined,
          outputDir: settings.defaultExportDir || "",
          deviceType: dev.deviceType,
        },
      });
      showToast("Certificat Forensique Officiel généré avec succès !");
      await invoke("reveal_in_finder", { path: certPath });
    } catch (err) {
      setErrorBanner(`Erreur de génération du certificat : ${err}`);
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  const externalDevices = devices.filter((d) => d.mountPoint !== "/");
  const internalDevices = devices.filter((d) => d.mountPoint === "/");

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: typeof Home;
    activeColor: string;
    badge?: number;
    badgeClass?: string;
  }> = [
    {
      id: "home",
      label: "Accueil",
      icon: Home,
      activeColor: "text-[#10B981]",
    },
    {
      id: "recovery",
      label: "Récupération",
      icon: HardDrive,
      activeColor: "text-[#F59E0B]",
      badge: activeScanJob ? activeScanJob.filesFoundCount : undefined,
      badgeClass: "bg-[#F59E0B]/15 text-[#FBBF24]",
    },
    {
      id: "repair",
      label: "Réparation",
      icon: Wrench,
      activeColor: "text-[#3B82F6]",
      badge: repairItems.length > 0 ? repairItems.length : undefined,
      badgeClass: "bg-[#3B82F6]/15 text-[#60A5FA]",
    },
    {
      id: "surface",
      label: "Santé & Clone",
      icon: Activity,
      activeColor: "text-[#10B981]",
    },
    {
      id: "sessions",
      label: "Historique",
      icon: Clock,
      activeColor: "text-[#FBBF24]",
      badge: sessions.length > 0 ? sessions.length : undefined,
      badgeClass: "bg-[#2A2A2A] text-[#9B9A97]",
    },
  ];

  return (
    <div className="relative h-screen w-screen flex flex-col bg-[#191919] text-[#EDEDEC] overflow-hidden select-none">
      {statusToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#10B981] text-[#191919] font-semibold text-xs shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusToast}</span>
        </div>
      )}

      <header className="h-12 px-4 border-b border-[#2A2A2A] flex items-center justify-between bg-[#191919] shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <HardRecoverLogo className="w-7 h-7" />
          <span className="font-semibold text-sm tracking-tight text-[#EDEDEC]">
            HardRecover
          </span>
          <button
            onClick={handleCheckUpdateManual}
            disabled={isCheckingUpdate}
            title="Vérifier les mises à jour"
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#252525] hover:bg-[#2F2F2F] text-[#9B9A97] hover:text-[#EDEDEC] border border-[#2F2F2F] transition-colors cursor-pointer flex items-center gap-1"
          >
            {isCheckingUpdate && (
              <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#3B82F6]" />
            )}
            <span>v1.0.2</span>
          </button>
          {updateInfo?.updateAvailable && (
            <button
              onClick={() => setIsUpdateModalOpen(true)}
              className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/30 transition-colors cursor-pointer animate-pulse"
            >
              <Sparkles className="w-3 h-3" />
              <span>Mise à jour disponible ({updateInfo.latestVersion})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div
            title="HardRecover fonctionne exclusivement en lecture seule sur vos supports sources afin d'éviter toute altération de données."
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border bg-[#10B981]/10 border-[#10B981]/30 text-[#34D399]"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Mode Lecture Seule Strict</span>
          </div>

          <button
            onClick={refreshDevices}
            className="flex items-center gap-1.5 text-xs font-medium text-[#9B9A97] hover:text-[#EDEDEC] hover:bg-[#252525] border border-[#2F2F2F] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshingDevices ? "animate-spin text-[#3B82F6]" : ""
              }`}
            />
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

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <aside className="w-52 bg-[#141414] border-r border-[#2A2A2A] flex flex-col justify-between p-2.5 shrink-0">
          <div className="space-y-1">
            {navItems.map((nav) => {
              const IconComp = nav.icon;
              const isActive = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  onClick={() => setActiveTab(nav.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#242424] text-[#EDEDEC] border border-[#383838]"
                      : "text-[#9B9A97] hover:text-[#EDEDEC] hover:bg-[#1C1C1C] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp
                      className={`w-4 h-4 ${
                        isActive ? nav.activeColor : "text-[#9B9A97]"
                      }`}
                    />
                    <span>{nav.label}</span>
                  </div>
                  {nav.badge !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${nav.badgeClass}`}
                    >
                      {nav.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-3 py-2 rounded-lg bg-[#191919] border border-[#252525] flex items-center justify-between text-[11px] text-[#787774]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              Lecture seule
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#191919]">
          {activeTab === "home" && (
            <HomeView
              devices={devices}
              onNavigate={setActiveTab}
              onRefreshDevices={refreshDevices}
              onScanDevice={handleStartRecoveryScan}
            />
          )}

          {activeTab === "recovery" && (
            <RecoveryView
              externalDevices={externalDevices}
              internalDevices={internalDevices}
              activeScanJob={activeScanJob}
              isScanning={isScanning}
              isRecoveringExport={isRecoveringExport}
              lastExportResult={lastExportResult}
              autoRepairCarvedMedia={settings.autoRepairCarvedMedia}
              onClearScanJob={() => setActiveScanJob(null)}
              onRefreshDevices={refreshDevices}
              onEjectDevice={handleEjectDevice}
              onStartScan={handleStartRecoveryScan}
              onLoadDemoLab={handleLoadDemoRecoveryLab}
              onPickCustomFolder={handlePickCustomFolderForScan}
              onPickDiskImage={handlePickDiskImageForScan}
              onExportSelection={handleExportRecoveredSelection}
              onToggleAutoRepair={(checked) =>
                handleUpdateSetting("autoRepairCarvedMedia", checked)
              }
              onSendToRepairWorkshop={handleSendToRepairWorkshop}
              onOpenPreview={(url, title) => {
                setPreviewMediaUrl(url);
                setPreviewMediaTitle(title);
              }}
              onRevealInFinder={handleRevealInFinder}
              onOpenToolInfo={setActiveToolModal}
            />
          )}

          {activeTab === "repair" && (
            <MediaRepairView
              repairItems={repairItems}
              selectedRepairId={selectedRepairId}
              referenceFile={referenceFile}
              repairOutputDir={repairOutputDir}
              isRepairingBatch={isRepairingBatch}
              onSelectRepairItem={setSelectedRepairId}
              onClearRepairItems={() => {
                setRepairItems([]);
                setSelectedRepairId(null);
              }}
              onClearReferenceFile={() => setReferenceFile(null)}
              onLoadDemoLab={handleLoadCorruptedDemoLab}
              onPickCorruptedFiles={handlePickCorruptedMediaFiles}
              onPickReferenceMedia={handlePickReferenceMedia}
              onPickOutputFolder={handlePickRepairOutputFolder}
              onRunRepair={handleRunSurgicalRepair}
              onOpenPreview={(url, title) => {
                setPreviewMediaUrl(url);
                setPreviewMediaTitle(title);
              }}
              onRevealInFinder={handleRevealInFinder}
              onOpenToolInfo={setActiveToolModal}
            />
          )}

          {activeTab === "surface" && (
            <SurfaceImagerView
              devices={devices}
              selectedSurfaceDevice={selectedSurfaceDevice}
              diskImageJob={diskImageJob}
              surfaceReport={surfaceReport}
              mountedImage={mountedImage}
              isRunningSurfaceCheck={isRunningSurfaceCheck}
              isGeneratingCertificate={isGeneratingCertificate}
              isImagingDrive={isImagingDrive}
              isMountingImage={isMountingImage}
              onSelectDevice={(dev) => {
                setSelectedSurfaceDevice(dev);
                setSurfaceReport(null);
                setDiskImageJob(null);
              }}
              onRunSurfaceDiagnostic={handleRunSurfaceDiagnostic}
              onGenerateCertificate={handleGenerateForensicCertificate}
              onStartDiskImager={handleStartDiskImager}
              onMountRescueImage={handleMountRescueImage}
              onUnmountRescueImage={handleUnmountRescueImage}
              onRevealInFinder={handleRevealInFinder}
              onOpenToolInfo={setActiveToolModal}
            />
          )}

          {activeTab === "sessions" && (
            <SessionsView
              sessions={sessions}
              onRevealInFinder={handleRevealInFinder}
              onDeleteSession={handleDeleteSession}
            />
          )}
        </main>
      </div>

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSetting={handleUpdateSetting}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {previewMediaUrl && (
        <MediaPreviewModal
          mediaUrl={previewMediaUrl}
          mediaTitle={previewMediaTitle}
          onClose={() => {
            setPreviewMediaUrl(null);
            setPreviewMediaTitle("");
          }}
          onRevealInFinder={handleRevealInFinder}
        />
      )}

      {isUpdateModalOpen && updateInfo && (
        <UpdateModal
          updateInfo={updateInfo}
          isInstallingUpdate={isInstallingUpdate}
          installStatus={installStatus}
          downloadProgress={downloadProgress}
          onClose={() => setIsUpdateModalOpen(false)}
          onApplyUpdate={handleApplyUpdate}
        />
      )}

      <ToolInfoModal
        toolId={activeToolModal}
        onClose={() => setActiveToolModal(null)}
      />
    </div>
  );
}
