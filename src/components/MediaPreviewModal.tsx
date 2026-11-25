import { convertFileSrc } from "@tauri-apps/api/core";
import { ExternalLink, Music, Play, X } from "lucide-react";

interface MediaPreviewModalProps {
  mediaUrl: string;
  mediaTitle: string;
  onClose: () => void;
  onRevealInFinder: (path: string) => void;
}

export function MediaPreviewModal({
  mediaUrl,
  mediaTitle,
  onClose,
  onRevealInFinder,
}: MediaPreviewModalProps) {
  const lower = mediaUrl.toLowerCase();
  const isVideo =
    lower.endsWith(".mov") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".m4v") ||
    lower.endsWith(".lrf");
  const isAudio =
    lower.endsWith(".wav") ||
    lower.endsWith(".mp3") ||
    lower.endsWith(".aac") ||
    lower.endsWith(".m4a");

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-[#1C1C1C] border border-[#333333] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2C2C2C] flex items-center justify-between bg-[#222222]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#60A5FA]">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#EDEDEC] truncate">
                Aperçu Instantané : {mediaTitle || "Média"}
              </h3>
              <p className="text-[11px] font-mono text-[#9B9A97] truncate">
                {mediaUrl}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onRevealInFinder(mediaUrl)}
              className="px-3 py-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] border border-[#3A3A3A] text-xs font-semibold text-[#EDEDEC] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Révéler dans le Finder</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] text-[#A8A8A8] hover:text-[#EDEDEC] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-black flex items-center justify-center p-4 min-h-[400px] max-h-[70vh] overflow-hidden">
          {isVideo ? (
            <video
              src={convertFileSrc(mediaUrl)}
              controls
              autoPlay
              className="max-h-[65vh] max-w-full rounded-lg shadow-lg object-contain"
            />
          ) : isAudio ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <div className="w-20 h-20 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#34D399]">
                <Music className="w-10 h-10" />
              </div>
              <p className="text-sm font-semibold text-[#EDEDEC]">
                {mediaTitle}
              </p>
              <audio
                src={convertFileSrc(mediaUrl)}
                controls
                autoPlay
                className="w-80 mt-2"
              />
            </div>
          ) : (
            <img
              src={convertFileSrc(mediaUrl)}
              alt={mediaTitle}
              className="max-h-[65vh] max-w-full rounded-lg shadow-lg object-contain"
            />
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#2C2C2C] bg-[#1E1E1E] flex items-center justify-between text-xs text-[#9B9A97]">
          <span>
            Lecture directe via moteur natif macOS AVFoundation &amp; Tauri
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
