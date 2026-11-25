import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  Disc,
  ExternalLink,
  FileCode,
  FileText,
  Film,
  Filter,
  FolderOpen,
  FolderTree,
  Image as ImageIcon,
  Info,
  Layers,
  Music,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  Wrench,
} from "lucide-react";
import {
  RecoverableFileItem,
  RecoveryExportResult,
  RecoveryScanJob,
  StorageDevice,
} from "../types";
import { formatBytes, formatSpeed } from "../utils/format";
import {
  DeviceVisualIcon,
  EjectIcon,
  SdCardLogo,
  SsdLogo,
} from "../components/StorageIcons";

interface RecoveryViewProps {
  externalDevices: StorageDevice[];
  internalDevices: StorageDevice[];
  activeScanJob: RecoveryScanJob | null;
  isScanning: boolean;
  isRecoveringExport: boolean;
  lastExportResult: RecoveryExportResult | null;
  autoRepairCarvedMedia: boolean;
  onClearScanJob: () => void;
  onRefreshDevices: () => void;
  onEjectDevice: (e: React.MouseEvent, dev: StorageDevice) => void;
  onStartScan: (targetPath: string, deviceName: string) => void;
  onLoadDemoLab: () => void;
  onPickCustomFolder: () => void;
  onPickDiskImage: () => void;
  onExportSelection: (items: RecoverableFileItem[]) => void;
  onToggleAutoRepair: (enabled: boolean) => void;
  onSendToRepairWorkshop: (file: RecoverableFileItem) => void;
  onOpenPreview: (url: string, title: string) => void;
  onRevealInFinder: (path: string) => void;
  onOpenToolInfo: (toolId: string) => void;
}

const CATEGORY_OPTIONS = [
  {
    id: "all",
    label: "Tous les fichiers",
    icon: Layers,
    color: "text-[#EDEDEC]",
  },
  {
    id: "video",
    label: "Vidéos Cinéma & Rushs",
    icon: Film,
    color: "text-[#F59E0B]",
  },
  {
    id: "photo_raw",
    label: "Photos RAW Capteur",
    icon: ImageIcon,
    color: "text-[#3B82F6]",
  },
  {
    id: "photo_raster",
    label: "Images JPEG / TIFF / PNG",
    icon: ImageIcon,
    color: "text-[#10B981]",
  },
  {
    id: "audio",
    label: "Audio Broadcast WAV/BWF",
    icon: Music,
    color: "text-[#A855F7]",
  },
  {
    id: "document",
    label: "Projets & Manifestes",
    icon: FileText,
    color: "text-[#9B9A97]",
  },
  {
    id: "other",
    label: "Autres Données",
    icon: FileCode,
    color: "text-[#787774]",
  },
];

export function RecoveryView({
  externalDevices,
  internalDevices,
  activeScanJob,
  isScanning,
  isRecoveringExport,
  lastExportResult,
  autoRepairCarvedMedia,
  onClearScanJob,
  onRefreshDevices,
  onEjectDevice,
  onStartScan,
  onLoadDemoLab,
  onPickCustomFolder,
  onPickDiskImage,
  onExportSelection,
  onToggleAutoRepair,
  onSendToRepairWorkshop,
  onOpenPreview,
  onRevealInFinder,
  onOpenToolInfo,
}: RecoveryViewProps) {
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set()
  );
  const [inspectedFile, setInspectedFile] =
    useState<RecoverableFileItem | null>(null);
  const [treeMode, setTreeMode] = useState<"type" | "folder">("type");
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<string>("all");
  const [selectedFolderFilter, setSelectedFolderFilter] =
    useState<string>("all");
  const [onlyDeletedFilter, setOnlyDeletedFilter] = useState<boolean>(false);
  const [hideProxiesFilter, setHideProxiesFilter] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (!activeScanJob) {
      setSelectedFileIds(new Set());
      setInspectedFile(null);
      return;
    }
    setSelectedFileIds(new Set(activeScanJob.items.map((i) => i.id)));
    setInspectedFile(activeScanJob.items[0] || null);
    setSelectedCategoryFilter("all");
    setSelectedFolderFilter("all");
  }, [activeScanJob]);

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

  if (!activeScanJob) {
    return (
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#202020] border border-[#2F2F2F] rounded-xl p-3.5">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-[#EDEDEC]">
              Sélectionner un support
            </h1>
            <button
              type="button"
              onClick={() => onOpenToolInfo("tool3")}
              className="text-[#787774] hover:text-[#EDEDEC] transition-colors cursor-pointer"
              title="Informations"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onLoadDemoLab}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-xs font-medium text-[#FBBF24] border border-[#F59E0B]/30 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Laboratoire Démo</span>
            </button>

            <button
              onClick={onPickCustomFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282828] hover:bg-[#323232] text-xs font-medium text-[#EDEDEC] border border-[#353535] transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Dossier…</span>
            </button>

            <button
              onClick={onPickDiskImage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282828] hover:bg-[#323232] text-xs font-medium text-[#EDEDEC] border border-[#353535] transition-colors cursor-pointer"
            >
              <Disc className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Image (.img)…</span>
            </button>
          </div>
        </div>

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
                onClick={onRefreshDevices}
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
                    ? Math.min(
                        100,
                        Math.round((dev.usedBytes / dev.totalBytes) * 100)
                      )
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
                          onClick={(e) => onEjectDevice(e, dev)}
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
                      onClick={() => onStartScan(dev.mountPoint, dev.name)}
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
                    onClick={onPickCustomFolder}
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
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-5 py-3 bg-[#1E1E1E] border-b border-[#2A2A2A] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClearScanJob}
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
              {activeScanJob.filesFoundCount} fichiers identifiés (
              {formatBytes(activeScanJob.totalRecoverableBytes)}) • Vitesse :{" "}
              {formatSpeed(activeScanJob.speedBps)}
            </div>
          </div>
        </div>

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
            <span>
              {hideProxiesFilter
                ? "Vignettes / Proxys masqués"
                : "Tous les fichiers"}
            </span>
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

      <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden">
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
                {CATEGORY_OPTIONS.map((cat) => {
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
                <span className="text-[#EDEDEC] font-mono">
                  {activeScanJob.deviceName}
                </span>
              </div>
              <div className="truncate">
                <span className="text-[#787774]">Volume :</span>{" "}
                <span className="text-[#EDEDEC] font-mono">
                  {formatBytes(activeScanJob.totalRecoverableBytes)}
                </span>
              </div>
            </div>
          </div>
        </div>

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
                    <h3 className="text-sm font-bold text-[#EDEDEC]">
                      Support Vierge ou Vide
                    </h3>
                    <p className="text-xs text-[#9B9A97] max-w-xs mt-1">
                      Aucun fichier n&apos;a été détecté dans l&apos;arborescence
                      de ce support.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      onClick={onClearScanJob}
                      className="px-3.5 py-2 rounded-xl bg-[#282828] hover:bg-[#333333] border border-[#3A3A3A] text-xs font-semibold text-[#EDEDEC] transition-colors"
                    >
                      Choisir un Autre Support
                    </button>
                    <button
                      onClick={onLoadDemoLab}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F59E0B] via-[#EAB308] to-[#10B981] text-black font-bold text-xs transition-transform hover:scale-105"
                    >
                      Tester avec le Laboratoire Démo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-2">
                  <Search className="w-8 h-8 text-[#787774]" />
                  <p className="text-xs font-semibold text-[#EDEDEC]">
                    Aucun fichier pour ce filtre
                  </p>
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
                      isInspected ? "bg-[#262626]" : "hover:bg-[#212121]"
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
                          {formatBytes(item.sizeBytes)} • LBA {item.lbaOffset} •
                          H={item.entropyScore.toFixed(2)} b/o
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                          item.healthBadge === "needs_repair" ||
                          item.needsSurgicalRepair
                            ? "bg-[#F59E0B]/15 border-[#F59E0B]/30 text-[#FBBF24]"
                            : item.healthBadge === "corrupted"
                            ? "bg-[#EF4444]/15 border-[#EF4444]/30 text-[#FCA5A5]"
                            : "bg-[#10B981]/15 border-[#10B981]/30 text-[#34D399]"
                        }`}
                      >
                        {item.healthBadge === "needs_repair" ||
                        item.needsSurgicalRepair
                          ? "Entête à Réparer"
                          : item.healthBadge === "corrupted"
                          ? "Partiellement Écrasé"
                          : "100 % Intègre"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

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
                      LBA {inspectedFile.lbaOffset} ({inspectedFile.clusterCount}{" "}
                      clusters)
                    </span>
                  </div>
                  <div>
                    <span className="text-[#787774] block">
                      Entropie Shannon H(X)
                    </span>
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

              <div className="p-3.5 rounded-2xl bg-[#141414] border border-[#2A2A2A] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[#9B9A97] flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[#3B82F6]" />
                    Inspecteur Hexadécimal (En-tête LBA)
                  </span>
                  <span className="font-mono text-[10px] text-[#787774]">
                    Offset 0x00
                  </span>
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
                    Les flux de ce média sont présents sur le disque mais
                    l&apos;index est incomplet suite à une coupure ou un crash.
                  </p>
                  {inspectedFile.sourcePath && (
                    <button
                      type="button"
                      onClick={() => onSendToRepairWorkshop(inspectedFile)}
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
                  onClick={() =>
                    onOpenPreview(inspectedFile.sourcePath!, inspectedFile.name)
                  }
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
                      {lastExportResult.recoveredCount} fichier(s)
                      sauvegardé(s) !
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onRevealInFinder(lastExportResult.destinationFolder)
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-[#10B981] text-black font-semibold text-[11px] flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Ouvrir dans le Finder</span>
                    </button>
                    <button
                      onClick={() => onRevealInFinder(lastExportResult.reportPath)}
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
              Sélectionnez un fichier dans la liste pour inspecter ses secteurs
              LBA et son en-tête binaire.
            </div>
          )}

          <div className="pt-3 border-t border-[#2A2A2A] space-y-2">
            <label className="flex items-center gap-2 text-[11px] text-[#9B9A97] cursor-pointer">
              <input
                type="checkbox"
                checked={autoRepairCarvedMedia}
                onChange={(e) => onToggleAutoRepair(e.target.checked)}
                className="rounded accent-[#10B981]"
              />
              <span>
                Réparer automatiquement les atomes moov/RIFF à la volée
              </span>
            </label>

            <button
              onClick={() => onExportSelection(selectedItemsList)}
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
  );
}
