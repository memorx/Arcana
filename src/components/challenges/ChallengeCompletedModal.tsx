"use client";

import { useTranslations, useLocale } from "next-intl";
import { Modal, ModalBody, Button } from "@/components/ui";
import { Pincel } from "@/components/tinta/Pincel";
import { Chispas, ESTAMPA } from "@/components/achievements/Celebracion";
import { Sello } from "@/components/achievements/Sello";
import { cn } from "@/lib/utils";

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

/** Desafío cumplido, sobre tinta: chispas en dos tintas (una vez), pincel, Gloock y créditos en mono. */
export function ChallengeCompletedModal({
  isOpen,
  onClose,
  challenges,
}: ChallengeCompletedModalProps) {
  const t = useTranslations("challenges");
  const locale = useLocale();

  if (challenges.length === 0) return null;

  const getLocalizedName = (challenge: CompletedChallenge) => {
    return locale === "en" ? challenge.name : challenge.nameEs;
  };

  const totalCredits = challenges.reduce((sum, c) => sum + c.creditReward, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <ModalBody className="grid gap-6 px-[clamp(20px,6vw,36px)] pb-8 pt-9 text-center">
        <div className="relative grid justify-items-center gap-2">
          <Chispas />
          <Pincel aria-hidden="true" className={cn("relative text-[clamp(3.4rem,2.6rem+4vw,4.75rem)]", ESTAMPA)}>
            {t("completedModal.pincel")}
          </Pincel>
          <h2 className="relative text-[clamp(1.6rem,1.3rem+1.4vw,2.1rem)] leading-[1.1] text-letra">
            {t("completedModal.title")}
          </h2>
        </div>

        {/* Los desafíos cumplidos */}
        <ul className="grid border-t border-filete/20 text-left">
          {challenges.map((challenge) => (
            <li
              key={challenge.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 border-b border-filete/20 py-4"
            >
              <Sello estado="logrado">
                <span className="font-lectura text-lg">✓</span>
              </Sello>
              <div className="grid min-w-0 gap-1">
                <h3 className="text-[1.15rem] leading-[1.15] text-letra">{getLocalizedName(challenge)}</h3>
                <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.1em] text-letra-acento uppercase tabular-nums">
                  {t("reward", { count: challenge.creditReward })}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Créditos ganados */}
        <div className="grid gap-1">
          <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.12em] text-letra-suave uppercase">
            {t("completedModal.earned", { credits: totalCredits })}
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
