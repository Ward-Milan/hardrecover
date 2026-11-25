import { Activity, Film, FolderTree } from "lucide-react";
import { StorageDevice } from "../types";
import { formatBytes } from "../utils/format";
import { DeviceVisualIcon } from "../components/StorageIcons";

interface HomeViewProps {
  devices: StorageDevice[];
  onNavigate: (tab: "recovery" | "repair" | "surface") => void;
  onRefreshDevices: () => void;
  onScanDevice: (mountPoint: string, name: string) => void;
}

export function HomeView({
  devices,
  onNavigate,
  onRefreshDevices,
  onScanDevice,
}: HomeViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-xl font-bold text-[#EDEDEC] tracking-tight">
          Que souhaitez-vous faire ?
        </h1>
        <p className="text-xs text-[#9B9A97] mt-1">
          Sélectionnez une action pour commencer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => onNavigate("repair")}
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

        <div
          onClick={() => onNavigate("recovery")}
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

        <div
          onClick={() => onNavigate("surface")}
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
                Diagnostic matériel, isolation de blocs HS et copie de secours
                .img.
              </p>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#2A2A2A] flex items-center justify-between text-xs font-medium text-[#34D399]">
            <span>Ouvrir</span>
            <span>→</span>
          </div>
        </div>
      </div>

      {devices.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#9B9A97]">
            <span>Supports connectés</span>
            <button
              onClick={onRefreshDevices}
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
                  onNavigate("recovery");
                  onScanDevice(d.mountPoint, d.name);
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-[#202020] hover:bg-[#262626] border border-[#2B2B2B] text-xs cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <DeviceVisualIcon
                    deviceType={d.deviceType}
                    className="w-4 h-4 text-[#F59E0B] shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-[#EDEDEC] truncate block">
                      {d.name}
                    </span>
                    <span className="font-mono text-[10px] text-[#787774]">
                      {d.bsdName}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#10B981] ml-2 shrink-0">
                  {formatBytes(d.totalBytes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
