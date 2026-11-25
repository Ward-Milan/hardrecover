import {
  CheckCircle2,
  ExternalLink,
  Film,
  Info,
  Play,
  Plus,
  Sliders,
  Sparkles,
  Wrench,
} from "lucide-react";
import { MediaRepairItem, ReferenceFileInspection } from "../types";
import { formatBytes } from "../utils/format";

interface MediaRepairViewProps {
  repairItems: MediaRepairItem[];
  selectedRepairId: string | null;
  referenceFile: ReferenceFileInspection | null;
  repairOutputDir: string;
  isRepairingBatch: boolean;
  onSelectRepairItem: (id: string) => void;
  onClearRepairItems: () => void;
  onClearReferenceFile: () => void;
  onLoadDemoLab: () => void;
  onPickCorruptedFiles: () => void;
  onPickReferenceMedia: () => void;
  onPickOutputFolder: () => void;
  onRunRepair: () => void;
  onOpenPreview: (url: string, title: string) => void;
  onRevealInFinder: (path: string) => void;
  onOpenToolInfo: (toolId: string) => void;
}

export function MediaRepairView({
  repairItems,
  selectedRepairId,
  referenceFile,
  repairOutputDir,
  isRepairingBatch,
  onSelectRepairItem,
  onClearRepairItems,
  onClearReferenceFile,
  onLoadDemoLab,
  onPickCorruptedFiles,
  onPickReferenceMedia,
  onPickOutputFolder,
  onRunRepair,
  onOpenPreview,
  onRevealInFinder,
  onOpenToolInfo,
}: MediaRepairViewProps) {
  const activeRepairItem =
    repairItems.find((i) => i.id === selectedRepairId) ||
    repairItems[0] ||
    null;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-5 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#202020] border border-[#2F2F2F] rounded-xl p-3.5 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-[#EDEDEC] flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#3B82F6]" />
            <span>Réparation Média</span>
          </h1>
          <button
            type="button"
            onClick={() => onOpenToolInfo("tool4")}
            className="text-[#787774] hover:text-[#EDEDEC] transition-colors cursor-pointer"
            title="Informations"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onLoadDemoLab}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 border border-[#3B82F6]/30 text-xs font-medium text-[#60A5FA] transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Laboratoire Démo</span>
          </button>

          <button
            onClick={onPickCorruptedFiles}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282828] hover:bg-[#323232] border border-[#353535] text-xs font-medium text-[#EDEDEC] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Ajouter des fichiers…</span>
          </button>

          {repairItems.length > 0 && (
            <button
              onClick={onClearRepairItems}
              className="px-2.5 py-1.5 rounded-lg bg-[#252525] hover:bg-[#EF4444]/20 text-[#9B9A97] hover:text-[#FCA5A5] border border-[#2F2F2F] text-xs transition-colors"
            >
              Vider
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-5 min-h-0">
        <div className="col-span-7 flex flex-col min-h-0 bg-[#202020] border border-[#2F2F2F] rounded-xl overflow-hidden">
          {repairItems.length === 0 ? (
            <div
              onClick={onPickCorruptedFiles}
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
                    onClick={() => onSelectRepairItem(item.id)}
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
                          {formatBytes(item.sizeBytes)} • {item.detectedCodec} •
                          Entropie H={item.entropyBitsPerByte.toFixed(3)} b/o
                        </p>
                      </div>

                      {item.repairedOutputPath && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPreview(
                                item.repairedOutputPath!,
                                item.fileName
                              );
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
                              onRevealInFinder(item.repairedOutputPath!);
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

        <div className="col-span-5 flex flex-col justify-between bg-[#202020] border border-[#2F2F2F] rounded-2xl p-4 min-h-0 overflow-y-auto space-y-4">
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#191919] border border-[#2F2F2F] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#EDEDEC] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#F59E0B]" />
                  Fichier de Référence Sain (Optionnel)
                </span>
                {referenceFile && (
                  <button
                    onClick={onClearReferenceFile}
                    className="text-[11px] text-[#9B9A97] hover:text-[#EF4444]"
                  >
                    Retirer
                  </button>
                )}
              </div>

              {referenceFile ? (
                <div className="p-2.5 rounded-lg bg-[#222222] border border-[#10B981]/30 space-y-1">
                  <div className="text-xs font-semibold text-[#34D399] truncate flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{referenceFile.fileName}</span>
                  </div>
                  <div className="text-[11px] text-[#9B9A97] font-mono">
                    {referenceFile.summary}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-[#9B9A97] leading-relaxed">
                    Pour les vidéos gravement tronquées, fournissez un clip sain
                    issu de la même caméra.
                  </p>
                  <button
                    onClick={onPickReferenceMedia}
                    className="px-3 py-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] border border-[#383838] text-xs font-medium text-[#EDEDEC] shrink-0"
                  >
                    Choisir…
                  </button>
                </div>
              )}
            </div>

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
                      <div
                        key={idx}
                        className="text-[11px] text-[#EDEDEC] font-mono"
                      >
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
                      L&apos;entête et la table d&apos;index d&apos;échantillons
                      ont été injectés avec succès. Vous pouvez visualiser le
                      résultat immédiatement dans l&apos;application.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenPreview(
                            activeRepairItem.repairedOutputPath!,
                            activeRepairItem.fileName
                          )
                        }
                        className="flex-1 py-2 px-3 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Aperçu Instantané</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onRevealInFinder(activeRepairItem.repairedOutputPath!)
                        }
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
                onClick={onPickOutputFolder}
                className="px-2.5 py-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] border border-[#383838] text-xs text-[#EDEDEC] shrink-0"
              >
                Modifier…
              </button>
            </div>

            <button
              onClick={onRunRepair}
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
  );
}
