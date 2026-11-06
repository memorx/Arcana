"use client";

import { useTranslations } from "next-intl";
import { Modal, ModalBody, Button } from "@/components/ui";
import { Pincel } from "@/components/tinta/Pincel";

interface StreakRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: number;
  creditsAwarded: number;
}

/**
 * Recompensa de racha: un momento sobre tinta (el `Modal` ya es de tinta). Sin confeti de
 * colores: la palabra a pincel en rosa, los días en Gloock y los créditos en mono.
 */
export function StreakRewardModal({
  isOpen,
  onClose,
  milestone,
  creditsAwarded,
}: StreakRewardModalProps) {
  const t = useTranslations("streakReward");

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBody className="py-10 text-center">
        <Pincel aria-hidden="true" className="text-[4.5rem] sm:text-[5.5rem]">
          {t("pincel")}
        </Pincel>

        <h2 className="mt-4 font-titulo text-2xl leading-tight text-letra sm:text-3xl">{t("title")}</h2>

        <p className="mt-3 font-titulo text-4xl leading-none text-letra-acento tabular-nums">
          {t("days", { count: milestone })}
        </p>

        <div className="mx-auto mt-8 max-w-xs border-y border-filete/25 py-4">
          <p className="font-dato text-[0.6875rem] uppercase tracking-[0.12em] text-letra-suave">{t("earned")}</p>
          <p className="mt-2 font-titulo text-3xl leading-none text-letra tabular-nums">
            +{creditsAwarded}{" "}
            <span className="font-dato text-xs uppercase tracking-[0.12em] text-letra-suave">{t("credits")}</span>
          </p>
        </div>

        <p className="mx-auto mt-6 max-w-sm font-lectura text-letra-suave">{t("keepGoing")}</p>

        <Button onClick={onClose} size="lg" className="mt-8 w-full">
          {t("continue")}
        </Button>
      </ModalBody>
    </Modal>
  );
}
