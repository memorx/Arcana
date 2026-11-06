import { getTranslations } from "next-intl/server";
import { Documento } from "../documento";

const SECCIONES = ["collection", "use", "storage", "sharing", "cookies", "rights", "contact"] as const;

export default async function PrivacyPage() {
  const t = await getTranslations("legal");

  return (
    <Documento
      volver={t("back")}
      etiqueta={t("privacy.lastUpdated")}
      titulo={t("privacy.title")}
      intro={t("privacy.intro")}
      apartados={SECCIONES.map((clave) => ({
        clave,
        titulo: t(`privacy.${clave}.title`),
        contenido: t(`privacy.${clave}.content`),
      }))}
    />
  );
}
