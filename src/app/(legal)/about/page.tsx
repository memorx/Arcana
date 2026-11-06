import { getTranslations } from "next-intl/server";
import { Documento } from "../documento";

export default async function AboutPage() {
  const t = await getTranslations("legal");

  return (
    <Documento
      volver={t("back")}
      etiqueta={t("about.eyebrow")}
      titulo={t("about.title")}
      intro={t("about.intro")}
      apartados={[
        { clave: "mission", titulo: t("about.mission.title"), contenido: t("about.mission.content") },
        { clave: "how", titulo: t("about.how.title"), contenido: t("about.how.content") },
        {
          clave: "disclaimer",
          titulo: t("about.disclaimer.title"),
          contenido: t("about.disclaimer.content"),
          aviso: true,
        },
      ]}
    />
  );
}
