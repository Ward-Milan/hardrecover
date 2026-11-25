import {
  Activity,
  AlertCircle,
  Award,
  CheckCircle2,
  Disc,
  ExternalLink,
  Info,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  DiskImageJobState,
  MountedImageInfo,
  StorageDevice,
  SurfaceHealthReport,
} from "../types";
import { formatBytes, formatSpeed } from "../utils/format";

interface SurfaceImagerViewProps {
  devices: StorageDevice[];
  selectedSurfaceDevice: StorageDevice | null;
  diskImageJob: DiskImageJobState | null;
  surfaceReport: SurfaceHealthReport | null;
  mountedImage: MountedImageInfo | null;
  isRunningSurfaceCheck: boolean;
  isGeneratingCertificate: boolean;
  isImagingDrive: boolean;
  isMountingImage: boolean;
  onSelectDevice: (dev: StorageDevice) => void;
  onRunSurfaceDiagnostic: () => void;
  onGenerateCertificate: () => void;
  onStartDiskImager: () => void;
  onMountRescueImage: (path: string) => void;
  onUnmountRescueImage: (target: string) => void;
  onRevealInFinder: (path: string) => void;
  onOpenToolInfo: (toolId: string) => void;
}

export function SurfaceImagerView({
  devices,
  selectedSurfaceDevice,
  diskImageJob,
  surfaceReport,
  mountedImage,
  isRunningSurfaceCheck,
  isGeneratingCertificate,
  isImagingDrive,
  isMountingImage,
  onSelectDevice,
  onRunSurfaceDiagnostic,
  onGenerateCertificate,
  onStartDiskImager,
  onMountRescueImage,
  onUnmountRescueImage,
  onRevealInFinder,
  onOpenToolInfo,
}: SurfaceImagerViewProps) {
  const redCount = surfaceReport?.badSectorsCount ?? 0;
  const yellowCount = surfaceReport?.slowCellsCount ?? 0;
  const hasSlowOrCritical = redCount > 0 || yellowCount > 0;

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      <div className="bg-[#202020] border border-[#2F2F2F] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-[#EDEDEC] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#10B981]" />
            <span>Santé &amp; Clonage</span>
          </h1>
          <button
            type="button"
            onClick={() => onOpenToolInfo("tool1")}
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
              if (found) onSelectDevice(found);
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
            onClick={onRunSurfaceDiagnostic}
            disabled={!selectedSurfaceDevice || isRunningSurfaceCheck}
            className="px-3 py-1.5 rounded-lg bg-[#282828] hover:bg-[#323232] border border-[#353535] text-xs font-medium text-[#EDEDEC] transition-colors cursor-pointer"
          >
            {isRunningSurfaceCheck ? "Diagnostic…" : "Diagnostic"}
          </button>

          <button
            onClick={onGenerateCertificate}
            disabled={!selectedSurfaceDevice || isGeneratingCertificate}
            className="px-3 py-1.5 rounded-lg bg-[#282828] hover:bg-[#323232] border border-[#353535] text-xs font-medium text-[#EDEDEC] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5 text-[#10B981]" />
            <span>{isGeneratingCertificate ? "Génération…" : "Rapport"}</span>
          </button>

          <button
            onClick={onStartDiskImager}
            disabled={!selectedSurfaceDevice || isImagingDrive}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-black transition-colors cursor-pointer"
          >
            {isImagingDrive ? "Clonage…" : "Créer Image (.img)"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 bg-[#202020] border border-[#2F2F2F] rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#EDEDEC]">
              Image Disque (.img)
            </span>
            <div className="flex items-center gap-3 text-[10px] text-[#9B9A97]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                Sain
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                Sauté
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                Erreur
              </span>
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
                    onClick={() =>
                      onRevealInFinder(diskImageJob.outputImagePath)
                    }
                    className="px-2.5 py-1 rounded-lg bg-[#252525] hover:bg-[#303030] border border-[#353535] text-[#EDEDEC] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Finder</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-[#262626] flex flex-wrap items-center justify-between gap-2">
                  {mountedImage &&
                  mountedImage.imagePath === diskImageJob.outputImagePath ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-[#34D399] flex items-center gap-1">
                        <Disc className="w-3.5 h-3.5" />
                        <span>Montée : {mountedImage.mountPoint}</span>
                      </span>
                      <button
                        onClick={() =>
                          onRevealInFinder(mountedImage.mountPoint)
                        }
                        className="px-2 py-0.5 rounded bg-[#10B981] text-black text-xs font-medium cursor-pointer"
                      >
                        Ouvrir
                      </button>
                      <button
                        onClick={() =>
                          onUnmountRescueImage(mountedImage.mountPoint)
                        }
                        className="px-2 py-0.5 rounded bg-[#2A2A2A] hover:bg-[#333333] text-xs text-[#EDEDEC] cursor-pointer"
                      >
                        Démonter
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        onMountRescueImage(diskImageJob.outputImagePath)
                      }
                      disabled={isMountingImage}
                      className="px-2.5 py-1 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Disc className="w-3.5 h-3.5" />
                      <span>
                        {isMountingImage ? "Montage…" : "Monter (Finder)"}
                      </span>
                    </button>
                  )}
                </div>
              </div>

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
              <p className="text-xs text-[#9B9A97]">Aucun clonage en cours.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-[#202020] border border-[#2F2F2F] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#60A5FA]">
                {selectedSurfaceDevice?.deviceType === "hdd"
                  ? "Diagnostic de Santé & Vitesse des Plateaux"
                  : "Diagnostic de Santé & Vitesse Cellulaire"}
              </h2>
              <button
                type="button"
                onClick={() => onOpenToolInfo("tool7")}
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
                <div className="text-xs font-bold text-[#34D399] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{surfaceReport.smartStatus}</span>
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
                  <div className="text-[10px] text-[#9B9A97]">
                    Latence Moyenne
                  </div>
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
                  <div className="text-[10px] text-[#9B9A97]">
                    Entropie Moyenne
                  </div>
                </div>
              </div>

              {surfaceReport.testedBlocksGrid.length === 0 ? (
                <div className="p-3 rounded-lg bg-[#141414] border border-[#2A2A2A] text-[11px] text-[#9B9A97]">
                  Aucune sonde de lecture n&apos;a pu être exécutée (volume vide
                  ou aucun fichier accessible).
                </div>
              ) : (
                (() => {
                  const greenCount = surfaceReport.testedBlocksGrid.filter(
                    (v) => v === 1
                  ).length;
                  const blueCount = surfaceReport.testedBlocksGrid.filter(
                    (v) => v === 2
                  ).length;
                  const yellowCount = surfaceReport.testedBlocksGrid.filter(
                    (v) => v === 3
                  ).length;
                  const criticalCount = surfaceReport.testedBlocksGrid.filter(
                    (v) => v === 4
                  ).length;
                  const totalBlocks = surfaceReport.testedBlocksGrid.length;

                  const metrics = [
                    {
                      label: "Rapides",
                      dotClass: "bg-[#10B981]",
                      textClass: "text-[#10B981]",
                      count: greenCount,
                      rangeLabel: "< 1 ms",
                    },
                    {
                      label: "Normales",
                      dotClass: "bg-[#3B82F6]",
                      textClass: "text-[#60A5FA]",
                      count: blueCount,
                      rangeLabel: "1-10 ms",
                    },
                    {
                      label: "Lentes",
                      dotClass: "bg-[#F59E0B]",
                      textClass: "text-[#FBBF24]",
                      count: yellowCount,
                      rangeLabel: "10-50 ms",
                    },
                    {
                      label: "Critiques",
                      dotClass: "bg-[#EF4444]",
                      textClass: "text-[#EF4444]",
                      count: criticalCount,
                      rangeLabel: "> 50 ms",
                    },
                  ];

                  return (
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-[#9B9A97]">
                          <span>
                            Cartographie de Lecture Physique (F_NOCACHE)
                          </span>
                          <span className="font-mono text-[#EDEDEC]">
                            {totalBlocks} sondes exécutées sur{" "}
                            {formatBytes(surfaceReport.totalBytes)}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#141414] border border-[#2A2A2A] flex overflow-hidden">
                          {metrics.map(
                            (m) =>
                              m.count > 0 && (
                                <div
                                  key={m.label}
                                  style={{
                                    width: `${(m.count / totalBlocks) * 100}%`,
                                  }}
                                  className={`h-full ${m.dotClass} transition-all`}
                                  title={`${m.label} (${m.rangeLabel}) : ${m.count} sondes`}
                                />
                              )
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {metrics.map((m) => (
                          <div
                            key={m.label}
                            className="p-3 rounded-xl bg-[#171717] border border-[#252525] flex flex-col items-center justify-center text-center"
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className={`w-2.5 h-2.5 rounded-[2px] ${m.dotClass} shrink-0`}
                              />
                              <span
                                className={`text-[11px] font-bold ${m.textClass}`}
                              >
                                {m.label}
                              </span>
                            </div>
                            <div className="text-base font-mono font-bold text-[#EDEDEC]">
                              {m.count}
                            </div>
                            <div className="text-[10px] text-[#787774]">
                              {m.rangeLabel} •{" "}
                              {((m.count / totalBlocks) * 100).toFixed(0)}%
                            </div>
                          </div>
                        ))}
                      </div>

                      {surfaceReport.autoMicroScans &&
                      surfaceReport.autoMicroScans.length > 0 ? (
                        <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-[#F59E0B]/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Search className="w-4 h-4 text-[#F59E0B]" />
                              <span className="text-xs font-bold text-[#EDEDEC]">
                                Vérification Ciblée Exécutée (
                                {surfaceReport.autoMicroScans.length} zone(s))
                              </span>
                            </div>
                          </div>

                          {surfaceReport.autoMicroScans.map((ms, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-lg bg-[#141414] border border-[#2A2A2A] space-y-2"
                            >
                              <div className="text-[11px] text-[#C5C5C4] leading-relaxed">
                                {ms.summary}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-center text-[11px] pt-1">
                                <div className="p-1.5 rounded bg-[#181818] border border-[#242424]">
                                  <div className="text-[10px] text-[#787774]">
                                    Pages 4K Testées
                                  </div>
                                  <div className="font-mono font-bold text-[#EDEDEC]">
                                    {ms.testedPagesCount}
                                  </div>
                                </div>
                                <div className="p-1.5 rounded bg-[#181818] border border-[#242424]">
                                  <div className="text-[10px] text-[#787774]">
                                    Anomalies / Erreurs
                                  </div>
                                  <div
                                    className={`font-mono font-bold ${
                                      ms.badBlocksCount > 0
                                        ? "text-[#EF4444]"
                                        : "text-[#10B981]"
                                    }`}
                                  >
                                    {ms.badBlocksCount}
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
                            <span className="font-semibold">
                              Aucune latence critique détectée sur les{" "}
                              {totalBlocks} sondes.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[#181818] border border-dashed border-[#333333] text-center space-y-2">
              <Activity className="w-8 h-8 text-[#3B82F6] mx-auto" />
              <p className="text-xs font-semibold text-[#EDEDEC]">
                {selectedSurfaceDevice?.deviceType === "hdd"
                  ? "Cliquez sur « Diagnostic » pour analyser la latence des plateaux"
                  : "Cliquez sur « Diagnostic » pour tester la latence et l'authenticité"}
              </p>
              <p className="text-[11px] text-[#9B9A97]">
                {selectedSurfaceDevice?.deviceType === "hdd"
                  ? "Mesure le temps d'accès magnétique des secteurs LBA et vérifie l'intégrité des têtes de lecture et des plateaux tournants."
                  : "Mesure le temps de réponse physique des cellules NAND (détection précoce du Bit-Rot) et vérifie l'authenticité de la capacité annoncée."}
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-12 bg-[#202020] border border-[#2F2F2F] rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#EDEDEC]">
                Recommandation Forensique &amp; Sauvetage (Mode Lecture Seule
                Strict)
              </h2>
            </div>

            {!surfaceReport ? (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#2A2A2A] text-[#9B9A97] border border-[#3A3A3A]">
                En attente de diagnostic
              </span>
            ) : redCount > 0 ? (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{redCount} zone(s) critique(s) détectée(s)</span>
              </span>
            ) : yellowCount > 0 ? (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F59E0B]/20 text-[#FBBF24] border border-[#F59E0B]/40 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{yellowCount} zone(s) lente(s) observée(s)</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Support Sain</span>
              </span>
            )}
          </div>

          <div
            className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
              !surfaceReport
                ? "bg-[#171717] border-[#2C2C2C]"
                : redCount > 0
                ? "bg-[#EF4444]/10 border-[#EF4444]/40"
                : yellowCount > 0
                ? "bg-[#F59E0B]/10 border-[#F59E0B]/40"
                : "bg-[#10B981]/10 border-[#10B981]/30"
            }`}
          >
            <div className="space-y-1.5 max-w-2xl">
              <div className="text-xs font-bold text-[#EDEDEC]">
                {!surfaceReport
                  ? "Analysez les temps de réponse en lecture seule (F_NOCACHE)."
                  : hasSlowOrCritical
                  ? "Sauvegarde immédiate recommandée — Aucune écriture effectuée sur le support source."
                  : "Aucune anomalie de latence détectée lors des lectures physiques."}
              </div>
              <p className="text-[11px] text-[#A8A8A8] leading-relaxed">
                {!surfaceReport
                  ? "Lancez le diagnostic pour mesurer la latence réelle de lecture des fichiers présents sur ce support sans y écrire le moindre octet."
                  : hasSlowOrCritical
                  ? "HardRecover respecte un strict mode lecture seule : pour préserver vos fichiers récupérables, créez immédiatement une image disque de sauvetage sur un autre support puis reformatez ou remplacez ce média une fois vos données sécurisées."
                  : "Toutes les sondes exécutées ont répondu dans les délais nominaux sans erreur d'entrée/sortie."}
              </p>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              {!surfaceReport ? (
                <button
                  onClick={onRunSurfaceDiagnostic}
                  disabled={!selectedSurfaceDevice || isRunningSurfaceCheck}
                  className="w-full md:w-auto px-4 py-2.5 rounded-xl font-bold text-xs bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>
                    {isRunningSurfaceCheck
                      ? "Diagnostic en cours…"
                      : "Lancer le Diagnostic"}
                  </span>
                </button>
              ) : hasSlowOrCritical ? (
                <button
                  onClick={onStartDiskImager}
                  disabled={!selectedSurfaceDevice || isImagingDrive}
                  className="w-full md:w-auto px-4 py-2.5 rounded-xl font-bold text-xs bg-[#EF4444] hover:bg-[#DC2626] text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Disc className="w-3.5 h-3.5" />
                  <span>
                    {isImagingDrive
                      ? "Création en cours…"
                      : "Cloner en Image de Sauvetage (.img)"}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-xs font-semibold text-[#34D399]">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span>Support Sain — Lecture nominale</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
