import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, LOCALE_COOKIE, locales, unavailableLocales, TIME_ZONE, type Locale } from "./config";

export default getRequestConfig(async () => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale =
    fromCookie && locales.includes(fromCookie) && !unavailableLocales.includes(fromCookie)
      ? fromCookie
      : defaultLocale;

  return {
    locale,
    timeZone: TIME_ZONE,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
