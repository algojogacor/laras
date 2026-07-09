import { cookies } from "next/headers"
import {
  DEFAULT_LOCALE,
  LOCALES,
  type Locale,
  type Dictionary,
  getDictionary,
} from "./dictionary"

export { DEFAULT_LOCALE, LOCALES, getDictionary }
export type { Locale, Dictionary }

export const LOCALE_COOKIE = "laras_locale"

/** Server-side: read locale from cookie. */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(LOCALE_COOKIE)?.value
  if (raw && (LOCALES as string[]).includes(raw)) return raw as Locale
  return DEFAULT_LOCALE
}

/** Server-side: get both locale and dictionary in one call. */
export async function getLocaleAndDict(): Promise<{ locale: Locale; t: Dictionary }> {
  const locale = await getLocale()
  return { locale, t: getDictionary(locale) }
}
