"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Modal, ModalBody, Button } from "@/components/ui";

interface UnlockedAchievement {
  id: string;
  key: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  icon: string;
  category: string;
  creditReward: number;
}

interface AchievementUnlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: UnlockedAchievement[];
}

export function AchievementUnlockedModal({
  isOpen,
  onClose,
  achievements,
}: AchievementUnlockedModalProps) {
  const t = useTranslations("achievements");
  const locale = useLocale();
  const [showGlow, setShowGlow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowGlow(true);
      const timer = setTimeout(() => setShowGlow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (achievements.length === 0) return null;

  const getLocalizedName = (achievement: UnlockedAchievement) => {
    return locale === "en" ? achievement.name : achievement.nameEs;
  };

  const getLocalizedDescription = (achievement: UnlockedAchievement) => {
    return locale === "en" ? achievement.description : achievement.descriptionEs;
  };

  const totalCredits = achievements.reduce((sum, a) => sum + a.creditReward, 0);
  const isSingle = achievements.length === 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="overflow-visible">
      <ModalBody className="text-center py-8">
        {/* Trophy Icon */}
        <div className="relative inline-block mb-6">
          <div
            className={`w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-5xl ${
              showGlow ? "animate-pulse shadow-lg shadow-amber-500/50" : ""
            }`}
          >
            🏆
          </div>
          {showGlow && (
            <div className="absolute inset-0 rounded-full bg-amber-500/30 animate-ping" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          {t("unlockModal.title")}
        </h2>

        {/* Achievements List */}
        <div className="space-y-3 mb-6">
          {achievements.map((achievement, index) => (
            <div
              key={achievement.id}
              className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/30"
              style={{
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{achievement.icon}</span>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-amber-400">
                    {getLocalizedName(achievement)}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {getLocalizedDescription(achievement)}
                  </p>
                </div>
                <span className="text-emerald-400 font-medium">
                  +{achievement.creditReward}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total Credits */}
        <div className="bg-emerald-900/30 rounded-xl p-4 mb-6 border border-emerald-500/30">
          <p className="text-slate-400 text-sm mb-1">
            {t("unlockModal.earned", { credits: totalCredits })}
          </p>
          <p className="text-3xl font-bold text-emerald-400">
            +{totalCredits} <span className="text-lg">{t("credits")}</span>
          </p>
        </div>

        {/* Close Button */}
        <Button onClick={onClose} size="lg" className="w-full">
          {t("continue")}
        </Button>
      </ModalBody>
    </Modal>
  );
}
