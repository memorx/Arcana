"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal, ModalBody, Button } from "@/components/ui";

interface StreakRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: number;
  creditsAwarded: number;
}

export function StreakRewardModal({
  isOpen,
  onClose,
  milestone,
  creditsAwarded,
}: StreakRewardModalProps) {
  const t = useTranslations("streakReward");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Auto-hide confetti after animation
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const getMilestoneEmoji = (days: number) => {
    if (days >= 100) return "&#127942;"; // Trophy
    if (days >= 60) return "&#127775;"; // Star
    if (days >= 30) return "&#128293;"; // Fire
    if (days >= 14) return "&#9889;"; // Lightning
    if (days >= 7) return "&#128170;"; // Muscle
    return "&#10024;"; // Sparkles
  };

  const getMilestoneColor = (days: number) => {
    if (days >= 100) return "from-yellow-500 to-amber-500";
    if (days >= 60) return "from-purple-500 to-pink-500";
    if (days >= 30) return "from-orange-500 to-red-500";
    if (days >= 14) return "from-blue-500 to-cyan-500";
    if (days >= 7) return "from-amber-500 to-yellow-500";
    return "from-purple-500 to-amber-500";
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="overflow-visible">
      {/* Confetti animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            >
              <span
                className="text-lg"
                style={{
                  color: ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"][
                    Math.floor(Math.random() * 6)
                  ],
                }}
              >
                {["*", ".", "+", "~"][Math.floor(Math.random() * 4)]}
              </span>
            </div>
          ))}
        </div>
      )}

      <ModalBody className="text-center py-8">
        {/* Big emoji */}
        <div
          className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${getMilestoneColor(milestone)} mb-6`}
        >
          <span
            className="text-5xl"
            dangerouslySetInnerHTML={{ __html: getMilestoneEmoji(milestone) }}
          />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          {t("title")}
        </h2>

        {/* Streak days */}
        <p className="text-4xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent mb-4">
          {t("days", { count: milestone })}
        </p>

        {/* Credits earned */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
          <p className="text-slate-400 text-sm mb-1">{t("earned")}</p>
          <p className="text-3xl font-bold text-emerald-400">
            +{creditsAwarded} <span className="text-lg">{t("credits")}</span>
          </p>
        </div>

        {/* Encouragement text */}
        <p className="text-slate-400 text-sm mb-6">
          {t("keepGoing")}
        </p>

        {/* Close button */}
        <Button onClick={onClose} size="lg" className="w-full">
          {t("continue")}
        </Button>
      </ModalBody>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 2s ease-out forwards;
        }
      `}</style>
    </Modal>
  );
}
