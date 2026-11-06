/** Un traductor de next-intl ya resuelto en el servidor (`getTranslations("landing")`, `getTranslations("pulse")`). */
export type Traducir = (clave: string, valores?: Record<string, string | number>) => string;
