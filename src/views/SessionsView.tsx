import { ExternalLink, Trash2 } from "lucide-react";
import { SavedSessionEntry } from "../types";
import { formatBytes } from "../utils/format";

interface SessionsViewProps {
  sessions: SavedSessionEntry[];
  onRevealInFinder: (path: string) => void;
  onDeleteSession: (id: string) => void;
}

export function SessionsView({
  sessions,
  onRevealInFinder,
  onDeleteSession,
}: SessionsViewProps) {
  return (
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
                    onClick={() => onRevealInFinder(sess.destinationPath!)}
                    className="px-3 py-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#333333] border border-[#383838] text-xs text-[#EDEDEC] flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Ouvrir Dossier</span>
                  </button>
                )}
                <button
                  onClick={() => onDeleteSession(sess.id)}
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
  );
}
