"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  DEFAULT_LOCALE,
  LOCALES,
  getDictionary,
  type Locale,
  type Dictionary,
} from "@/lib/i18n/dictionary"

type LocaleContextValue = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Dictionary
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode
  initialLocale: Locale
}) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const t = getDictionary(locale)

  const setLocale = useCallback(
    (l: Locale) => {
      setLocaleState(l)
      // persist to cookie, then refresh so server components re-render in the new locale
      fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: l }),
      })
        .then(() => router.refresh())
        .catch(() => {})
    },
    [router]
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    // Fallback for components rendered outside provider (shouldn't happen in app)
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: getDictionary(DEFAULT_LOCALE),
    }
  }
  return ctx
}

export function useT(): Dictionary {
  return useLocale().t
}

export { LOCALES, DEFAULT_LOCALE }
export type { Locale }
