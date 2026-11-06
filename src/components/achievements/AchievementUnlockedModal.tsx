"use client";

import { useTranslations, useLocale } from "next-intl";
import { Modal, ModalBody, Button } from "@/components/ui";
import { Pincel } from "@/components/tinta/Pincel";
import { cn } from "@/lib/utils";
import { ESTAMPA } from "./Celebracion";
import { Sello } from "./Sello";

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

/** Logro desbloqueado, sobre tinta: la palabra a pincel se estampa, el título en Gloock y los sellos en mono. */
export function AchievementUnlockedModal({
  isOpen,
  onClose,
  achievements,
}: AchievementUnlockedModalProps) {
  const t = useTranslations("achievements");
  const locale = useLocale();

  if (achievements.length === 0) return null;

  const getLocalizedName = (achievement: UnlockedAchievement) => {
    return locale === "en" ? achievement.name : achievement.nameEs;
  };

  const getLocalizedDescription = (achievement: UnlockedAchievement) => {
    return locale === "en" ? achievement.description : achievement.descriptionEs;
  };

  const totalCredits = achievements.reduce((sum, a) => sum + a.creditReward, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <ModalBody className="grid gap-6 px-[clamp(20px,6vw,36px)] pb-8 pt-9 text-center">
        <div className="grid justify-items-center gap-2">
          <Pincel aria-hidden="true" className={cn("text-[clamp(3.4rem,2.6rem+4vw,4.75rem)]", ESTAMPA)}>
            {t("unlockModal.pincel")}
          </Pincel>
          <h2 className="text-[clamp(1.6rem,1.3rem+1.4vw,2.1rem)] leading-[1.1] text-letra">
            {t("unlockModal.title")}
          </h2>
        </div>

        {/* Los logros de esta lectura */}
        <ul className="grid border-t border-filete/20 text-left">
          {achievements.map((achievement) => (
            <li
              key={achievement.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 border-b border-filete/20 py-4"
            >
              <Sello estado="logrado">
                <span className="font-lectura text-lg">✓</span>
              </Sello>
              <div className="grid min-w-0 gap-1">
                <h3 className="text-[1.15rem] leading-[1.15] text-letra">{getLocalizedName(achievement)}</h3>
                <p className="text-[0.9375rem] leading-[1.45] text-letra-suave">
                  {getLocalizedDescription(achievement)}
                </p>
                <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.1em] text-letra-acento uppercase tabular-nums">
                  {t("reward", { count: achievement.creditReward })}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Créditos ganados */}
        <div className="grid gap-1">
          <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.12em] text-letra-suave uppercase">
            {t("unlockModal.earned", { credits: totalCredits })}
          </p>
          <p className="flex flex-wrap items-baseline justify-center gap-x-2.5 font-dato text-[2.5rem] leading-none tracking-[-0.03em] text-letra-acento tabular-nums">
            <span>+{totalCredits}</span>
            <span className="text-sm tracking-[0.12em] text-letra-suave uppercase">{t("credits")}</span>
          </p>
        </div>

        <Button onClick={onClose} size="lg" className="w-full">
          {t("continue")}
        </Button>
      </ModalBody>
    </Modal>
  );
}
