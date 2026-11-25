import { Settings, ShieldCheck, X } from "lucide-react";
import { AppSettings } from "../types";

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => void;
  onClose: () => void;
}

export function SettingsModal({
  settings,
  onUpdateSetting,
  onClose,
}: SettingsModalProps) {
  return (
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
            onClick={onClose}
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
              onChange={(e) =>
                onUpdateSetting("bypassOsCache", e.target.checked)
              }
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
                onUpdateSetting(
                  "initialJumpSectors",
                  Number(e.target.value) || 64
                )
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
                onUpdateSetting(
                  "badSectorTimeoutMs",
                  Number(e.target.value) || 250
                )
              }
              className="w-24 px-2.5 py-1 rounded-lg bg-[#121212] border border-[#333333] font-mono text-right text-[#EDEDEC]"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-[#141414] border border-[#262626] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#9B9A97]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Cadre d&apos;Utilisation &amp; Responsabilité</span>
            </div>
            <p className="text-[11px] text-[#787774] leading-relaxed">
              HardRecover est un outil forensique professionnel open-source
              (Licence MIT). Les opérations de lecture bas niveau,
              d&apos;imagerie et de réhabilitation s&apos;exécutent directement
              sur vos périphériques physiques. L&apos;utilisateur demeure seul
              responsable de la manipulation de ses supports matériels et de la
              sauvegarde préalable de ses données critiques.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#10B981] text-black font-bold text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
