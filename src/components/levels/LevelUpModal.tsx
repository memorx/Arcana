"use client";

import { useTranslations, useLocale } from "next-intl";
import { Modal, ModalBody, Button } from "@/components/ui";
import { Pincel } from "@/components/tinta/Pincel";
import { Chispas, ESTAMPA } from "@/components/achievements/Celebracion";
import { Sello } from "@/components/achievements/Sello";
import { numeroRomano } from "@/app/(main)/cards/indice";
import { cn } from "@/lib/utils";

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  levelName: string;
  levelNameEs: string;
  /** Se conserva por compatibilidad: en «Dos tintas» el sello lleva el número romano del nivel, no el emoji. */
  levelIcon: string;
  creditsAwarded: number;
}

/** Subir de nivel, sobre tinta: el sello con el número romano se estampa entre chispas en dos tintas. */
export function LevelUpModal({
  isOpen,
  onClose,
  newLevel,
  levelName,
  levelNameEs,
  creditsAwarded,
}: LevelUpModalProps) {
  const t = useTranslations("levels");
  const locale = useLocale();

  const displayName = locale === "en" ? levelName : levelNameEs;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <ModalBody className="grid gap-6 px-[clamp(20px,6vw,36px)] pb-8 pt-9 text-center">
        <div className="relative grid justify-items-center gap-3">
          <Chispas />
          <Sello estado="logrado" tamano="grande" className={cn("relative", ESTAMPA)}>
            {numeroRomano(newLevel)}
          </Sello>
          <Pincel aria-hidden="true" className="relative text-[clamp(3rem,2.4rem+3vw,4.25rem)]">
            {t("level")}
          </Pincel>
          <h2 className="relative text-[clamp(1.6rem,1.3rem+1.4vw,2.1rem)] leading-[1.1] text-letra">
            {t("levelUp")}
          </h2>
          <p className="relative font-lectura text-[1.1875rem] italic text-letra">
            {t("newLevel", { level: displayName })}
          </p>
        </div>

        {/* Recompensa */}
        {creditsAwarded > 0 && (
          <div className="grid gap-1 border-y border-filete/20 py-4">
            <p className="font-dato text-[0.6875rem] leading-[1.5] tracking-[0.12em] text-letra-suave uppercase">
              {t("reward")}
            </p>
            <p className="flex flex-wrap items-baseline justify-center gap-x-2.5 font-dato text-[2.5rem] leading-none tracking-[-0.03em] text-letra-acento tabular-nums">
              <span>+{creditsAwarded}</span>
              <span className="text-sm tracking-[0.12em] text-letra-suave uppercase">{t("credits")}</span>
            </p>
          </div>
        )}

        {/* Mensaje según el nivel */}
        <p className="text-[0.9375rem] leading-[1.5] text-letra-suave">
          {newLevel === 5
            ? t("maxLevelMessage")
            : t("keepGoing")}
        </p>

        <Button onClick={onClose} size="lg" className="w-full">
          {t("continue")}
        </Button>
      </ModalBody>
    </Modal>
  );
}
