"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Modal, ModalBody, Button } from "@/components/ui";

interface CompletedChallenge {
  id: string;
  key: string;
  name: string;
  nameEs: string;
  icon: string;
  creditReward: number;
}

interface ChallengeCompletedModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenges: CompletedChallenge[];
}

export function ChallengeCompletedModal({
  isOpen,
  onClose,
  challenges,
}: ChallengeCompletedModalProps) {
  const t = useTranslations("challenges");
  const locale = useLocale();
  const [showGlow, setShowGlow] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowGlow(true);
      setShowConfetti(true);
      const glowTimer = setTimeout(() => setShowGlow(false), 2000);
      const confettiTimer = setTimeout(() => setShowConfetti(false), 3000);
      return () => {
        clearTimeout(glowTimer);
        clearTimeout(confettiTimer);
      };
    }
  }, [isOpen]);

  if (challenges.length === 0) return null;

  const getLocalizedName = (challenge: CompletedChallenge) => {
    return locale === "en" ? challenge.name : challenge.nameEs;
  };

  const totalCredits = challenges.reduce((sum, c) => sum + c.creditReward, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="overflow-visible">
      <ModalBody className="text-center py-8 relative">
        {/* Confetti particles */}
        {showConfetti && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full animate-ping ${
                  i % 4 === 0
                    ? "bg-purple-500"
                    : i % 4 === 1
                    ? "bg-pink-500"
                    : i % 4 === 2
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: "1.5s",
                }}
              />
            ))}
          </div>
        )}

        {/* Trophy Icon */}
        <div className="relative inline-block mb-6">
          <div
            className={`w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 flex items-center justify-center text-5xl ${
              showGlow ? "animate-pulse shadow-lg shadow-purple-500/50" : ""
            }`}
          >
            🎯
          </div>
          {showGlow && (
            <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          {t("completedModal.title")}
        </h2>

        {/* Challenges List */}
        <div className="space-y-3 mb-6">
          {challenges.map((challenge, index) => (
            <div
              key={challenge.id}
              className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/30"
              style={{
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{challenge.icon}</span>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-purple-400">
                    {getLocalizedName(challenge)}
                  </h3>
                </div>
                <span className="text-emerald-400 font-medium">
                  +{challenge.creditReward}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total Credits */}
        <div className="bg-emerald-900/30 rounded-xl p-4 mb-6 border border-emerald-500/30">
          <p className="text-slate-400 text-sm mb-1">
            {t("completedModal.earned", { credits: totalCredits })}
          </p>
          <p className="text-3xl font-bold text-emerald-400">
            +{totalCredits} <span className="text-lg">{t("credits")}</span>
          </p>
        </div>

        {/* Continue Button */}
        <Button
          onClick={onClose}
          size="lg"
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
        >
          {t("continue")}
        </Button>
      </ModalBody>
    </Modal>
  );
}
