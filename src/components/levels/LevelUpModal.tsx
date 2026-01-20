"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Modal, ModalBody, Button } from "@/components/ui";

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  levelName: string;
  levelNameEs: string;
  levelIcon: string;
  creditsAwarded: number;
}

// Level-specific gradient colors for epic effect
const LEVEL_COLORS: Record<number, { from: string; to: string; glow: string }> = {
  2: { from: "from-blue-500", to: "to-cyan-500", glow: "shadow-blue-500/50" },
  3: { from: "from-purple-500", to: "to-pink-500", glow: "shadow-purple-500/50" },
  4: { from: "from-amber-500", to: "to-orange-500", glow: "shadow-amber-500/50" },
  5: { from: "from-yellow-400", to: "to-amber-300", glow: "shadow-yellow-400/60" },
};

export function LevelUpModal({
  isOpen,
  onClose,
  newLevel,
  levelName,
  levelNameEs,
  levelIcon,
  creditsAwarded,
}: LevelUpModalProps) {
  const t = useTranslations("levels");
  const locale = useLocale();
  const [showGlow, setShowGlow] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowGlow(true);
      setShowParticles(true);
      const glowTimer = setTimeout(() => setShowGlow(false), 2500);
      const particleTimer = setTimeout(() => setShowParticles(false), 3000);
      return () => {
        clearTimeout(glowTimer);
        clearTimeout(particleTimer);
      };
    }
  }, [isOpen]);

  const displayName = locale === "en" ? levelName : levelNameEs;
  const colors = LEVEL_COLORS[newLevel] || LEVEL_COLORS[2];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="overflow-visible">
      <ModalBody className="text-center py-8 relative">
        {/* Particle effects */}
        {showParticles && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full bg-gradient-to-r ${colors.from} ${colors.to} animate-ping`}
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: "1.5s",
                }}
              />
            ))}
          </div>
        )}

        {/* Level Up Badge */}
        <div className="relative inline-block mb-6">
          <div
            className={`w-28 h-28 rounded-full bg-gradient-to-br ${colors.from} ${colors.to} flex items-center justify-center text-5xl transition-all duration-500 ${
              showGlow ? `animate-pulse shadow-2xl ${colors.glow}` : ""
            }`}
          >
            {levelIcon}
          </div>
          {showGlow && (
            <>
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors.from} ${colors.to} opacity-30 animate-ping`} />
              <div className={`absolute -inset-2 rounded-full bg-gradient-to-br ${colors.from} ${colors.to} opacity-20 blur-xl animate-pulse`} />
            </>
          )}
          {/* Level number badge */}
          <div className={`absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-gradient-to-br ${colors.from} ${colors.to} flex items-center justify-center text-white font-bold text-lg border-4 border-slate-900`}>
            {newLevel}
          </div>
        </div>

        {/* Title */}
        <h2 className={`text-3xl font-bold bg-gradient-to-r ${colors.from} ${colors.to} bg-clip-text text-transparent mb-2`}>
          {t("levelUp")}
        </h2>

        {/* New Level */}
        <p className="text-xl text-slate-200 mb-6">
          {t("newLevel", { level: displayName })}
        </p>

        {/* Credits Reward */}
        {creditsAwarded > 0 && (
          <div className={`bg-gradient-to-r ${colors.from}/20 ${colors.to}/20 rounded-xl p-4 mb-6 border border-emerald-500/30`}>
            <p className="text-slate-400 text-sm mb-1">
              {t("reward")}
            </p>
            <p className="text-3xl font-bold text-emerald-400">
              +{creditsAwarded} <span className="text-lg">{t("credits")}</span>
            </p>
          </div>
        )}

        {/* Motivational message based on level */}
        <p className="text-slate-400 text-sm mb-6">
          {newLevel === 5
            ? t("maxLevelMessage")
            : t("keepGoing")}
        </p>

        {/* Continue Button */}
        <Button onClick={onClose} size="lg" className={`w-full bg-gradient-to-r ${colors.from} ${colors.to} hover:opacity-90`}>
          {t("continue")}
        </Button>
      </ModalBody>
    </Modal>
  );
}
