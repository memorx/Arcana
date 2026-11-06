import { getTranslations } from "next-intl/server";
import { Documento } from "../documento";

const SECCIONES = ["acceptance", "service", "accounts", "credits", "conduct", "changes"] as const;

export default async function TermsPage() {
  const t = await getTranslations("legal");

  return (
    <Documento
      volver={t("back")}
      etiqueta={t("terms.lastUpdated")}
      titulo={t("terms.title")}
      apartados={SECCIONES.map((clave) => ({
        clave,
        titulo: t(`terms.${clave}.title`),
        contenido: t(`terms.${clave}.content`),
      }))}
    />
  );
}
