import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { locales, defaultLocale, Locale } from "./config";

export default getRequestConfig(async () => {
  let locale: Locale = defaultLocale;

  try {
    // Try to get locale from cookie first
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get("locale")?.value as Locale | undefined;

    if (localeCookie && locales.includes(localeCookie)) {
      locale = localeCookie;
    } else {
      // Try to detect from Accept-Language header
      const headersList = await headers();
      const acceptLanguage = headersList.get("accept-language");

      if (acceptLanguage) {
        const preferredLocale = acceptLanguage
          .split(",")
          .map((lang) => lang.split(";")[0].trim().substring(0, 2))
          .find((lang) => locales.includes(lang as Locale)) as Locale | undefined;

        if (preferredLocale) {
          locale = preferredLocale;
        }
      }
    }
  } catch {
    // During static generation, cookies/headers are not available
    // Fall back to default locale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
