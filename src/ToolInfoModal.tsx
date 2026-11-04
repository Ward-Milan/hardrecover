import React, { useState, useEffect } from "react";
import {
  X,
  Info,
  ChevronDown,
  ChevronUp,
  Cpu,
  CheckCircle2,
  Zap,
  Terminal,
  BookOpen,
} from "lucide-react";
import { TOOLS_DATABASE, ToolInfo } from "./toolInfo";

interface ToolInfoModalProps {
  toolId: string | null;
  onClose: () => void;
}

export function ToolInfoModal({ toolId, onClose }: ToolInfoModalProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Reset details view when opening a different tool
  useEffect(() => {
    setShowTechnicalDetails(false);
  }, [toolId]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (toolId) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toolId, onClose]);

  if (!toolId) return null;

  const tool: ToolInfo | undefined = TOOLS_DATABASE[toolId];
  if (!tool) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1C1C1C] border border-[#333333] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up"
      >
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-[#2A2A2A] flex items-center justify-between bg-[#191919]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#262626] border border-[#383838] flex items-center justify-center text-[#EDEDEC]">
              <Info className="w-5 h-5 text-[#38BDF8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${tool.accentColor}`}>
                  {tool.number}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${tool.bgLightColor}`}>
                  {tool.badge}
                </span>
              </div>
              <h2 className="text-sm font-bold text-[#EDEDEC] mt-0.5">
                {tool.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#252525] hover:bg-[#303030] border border-[#333333] flex items-center justify-center text-[#9B9A97] hover:text-[#EDEDEC] transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* SECTION 1: SIMPLE EXPLANATION (FOR EVERYONE) */}
          <div className="p-4 rounded-xl bg-[#222222] border border-[#303030] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#EDEDEC]">
              <BookOpen className="w-4 h-4 text-[#10B981]" />
              <span>En clair (Explication Simple)</span>
            </div>
            <p className="text-xs text-[#D1D1D0] leading-relaxed">
              {tool.simpleExplanation}
            </p>
          </div>

          {/* TOGGLE BUTTON FOR TECHNICAL DETAILS */}
          <button
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#242424] hover:bg-[#2C2C2C] border border-[#353535] text-xs font-semibold text-[#EDEDEC] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#60A5FA]" />
              <span>
                {showTechnicalDetails
                  ? "Masquer les Détails Techniques & Schéma"
                  : "Voir les Détails Techniques & Schéma Fonctionnel"}
              </span>
            </div>
            {showTechnicalDetails ? (
              <ChevronUp className="w-4 h-4 text-[#9B9A97]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#9B9A97]" />
            )}
          </button>

          {/* SECTION 2: TECHNICAL DETAILS & ARCHITECTURE (EXPANDABLE) */}
          {showTechnicalDetails && (
            <div className="space-y-4 pt-1 animate-fade-in">
              {/* Technical Overview */}
              <div className="p-3.5 rounded-xl bg-[#191919] border border-[#2B2B2B] space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#9B9A97] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Architecture &amp; Fonctionnement Bas Niveau</span>
                </div>
                <p className="text-xs text-[#B5B5B4] leading-relaxed">
                  {tool.technicalDetails.overview}
                </p>
              </div>

              {/* Key Low-Level Mechanisms */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#9B9A97]">
                  Mécanismes Algorithmiques :
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {tool.technicalDetails.keyMechanisms.map((mech, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-[#181818] border border-[#282828] space-y-1"
                    >
                      <div className="text-xs font-bold text-[#EDEDEC] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                        <span>{mech.title}</span>
                      </div>
                      <p className="text-[11px] text-[#9B9A97] leading-relaxed whitespace-pre-line">
                        {mech.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ASCII / Visual Schema */}
              {tool.technicalDetails.diagram && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#9B9A97]">
                    Schéma de Traitement Matériel &amp; Données :
                  </div>
                  <pre className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] font-mono text-[11px] text-[#34D399] leading-relaxed overflow-x-auto whitespace-pre">
                    {tool.technicalDetails.diagram}
                  </pre>
                </div>
              )}

              {/* Concrete Benefits */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#9B9A97]">
                  Bénéfices Concrets :
                </div>
                <div className="space-y-1.5">
                  {tool.technicalDetails.benefits.map((benefit, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs text-[#EDEDEC]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                      <span className="text-[#B5B5B4]">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-[#2A2A2A] bg-[#191919] flex items-center justify-between">
          <span className="text-[11px] text-[#787774]">
            Documentation intégrée Hard Suite • Moteur Open-Source (MIT)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#2A2A2A] hover:bg-[#333333] border border-[#383838] text-xs font-semibold text-[#EDEDEC] transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

