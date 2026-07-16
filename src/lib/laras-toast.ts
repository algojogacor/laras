"use client"

/**
 * Laras Toast — application-owned adapter over goey-toast.
 *
 * Application code imports `larasToast` from this module instead of
 * reaching for goey-toast (or sonner) directly.  That keeps the toast
 * implementation swappable and lets us enforce Laras-specific rules
 * (restrained animation, no private data in toasts, stable API) in one
 * place.
 */

import { gooeyToast } from "goey-toast"
import type { GooeyToastOptions, GooeyPromiseData, DismissFilter } from "goey-toast"

// ---------------------------------------------------------------------------
// Re-exported options type (so callers can pass duration, description, etc.)
// ---------------------------------------------------------------------------
export type { GooeyToastOptions as LarasToastOptions }
export type { GooeyPromiseData as LarasPromiseData }

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function success(title: string, options?: GooeyToastOptions) {
  return gooeyToast.success(title, options)
}

function error(title: string, options?: GooeyToastOptions) {
  return gooeyToast.error(title, options)
}

function warning(title: string, options?: GooeyToastOptions) {
  return gooeyToast.warning(title, options)
}

function info(title: string, options?: GooeyToastOptions) {
  return gooeyToast.info(title, options)
}

/**
 * Loading toast — uses the default (neutral) toast since goey-toast
 * does not ship a dedicated .loading() variant.  Pass an icon via
 * options.icon for a spinner or similar loading indicator.
 */
function loading(title: string, options?: GooeyToastOptions) {
  return gooeyToast(title, options)
}

function promise<T>(
  p: Promise<T>,
  data: GooeyPromiseData<T>,
) {
  return gooeyToast.promise<T>(p, data)
}

function dismiss(id?: string | number) {
  gooeyToast.dismiss(id)
}

/**
 * Dismiss all toasts of a given type (or types).
 */
function dismissByType(filter: DismissFilter) {
  gooeyToast.dismiss(filter)
}

export const larasToast = {
  success,
  error,
  warning,
  info,
  loading,
  promise,
  dismiss,
  dismissByType,
} as const
