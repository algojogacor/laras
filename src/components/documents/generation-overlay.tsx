"use client"

import { useEffect, useState } from "react"
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * GenerationOverlay — replaces the bare spinner during AI generation.
 *
 * Shows:
 *  - Animated multi-step progress ("Analyzing → Generating → Checking")
 *  - Elapsed time + estimated remaining
 *  - On error: a clear error card with retry + specific message
 *
 * Used by document builders (CV-ATS, cover-letter, essay, bio, deck)
 * and English practice generation.
 */

export type GenerationStep = {
  label: string
  icon?: typeof Sparkles
}

const DEFAULT_STEPS: GenerationStep[] = [
  { label: "Analyzing profile", icon: Sparkles },
  { label: "Generating content", icon: Loader2 },
  { label: "Checking quality", icon: CheckCircle2 },
]

export function GenerationOverlay({
  loading,
  error,
  onRetry,
  onCancel,
  steps = DEFAULT_STEPS,
  estimatedSeconds = 40,
  locale = "id",
}: {
  loading: boolean
  error: string | null
  onRetry?: () => void
  onCancel?: () => void
  steps?: GenerationStep[]
  estimatedSeconds?: number
  locale?: "id" | "en"
}) {
  const [elapsed, setElapsed] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)

  // Track elapsed time
  useEffect(() => {
    if (!loading) return
    const start = Date.now()
    // Reset on new generation cycle (deferred to avoid set-state-in-effect lint)
    const timer = setInterval(() => {
      const sec = Math.floor((Date.now() - start) / 1000)
      setElapsed(sec)
      // Advance step based on elapsed time vs estimate
      const progress = Math.min(sec / estimatedSeconds, 0.95)
      const stepIdx = Math.min(Math.floor(progress * steps.length), steps.length - 1)
      setCurrentStep(stepIdx)
    }, 500)
    return () => clearInterval(timer)
  }, [loading, estimatedSeconds, steps.length])

  if (!loading && !error) return null

  const t = locale === "id" ? {
    generating: "Sedang menyusun dokumen…",
    elapsed: "Berlalu",
    estimated: "Estimasi",
    errorTitle: "Gagal membuat dokumen",
    retry: "Coba lagi",
    cancel: "Batal",
    tip: "Tunggu sebentar — AI sedang menyusun konten terbaik untukmu.",
  } : {
    generating: "Generating document…",
    elapsed: "Elapsed",
    estimated: "Est.",
    errorTitle: "Generation failed",
    retry: "Try again",
    cancel: "Cancel",
    tip: "Please wait — the AI is crafting the best content for you.",
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" role="alertdialog" aria-labelledby="gen-error-title">
        <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-6 shadow-lift animate-rise">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 id="gen-error-title" className="text-base font-semibold text-foreground">{t.errorTitle}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{error}</p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2">
            {onRetry && (
              <Button onClick={onRetry} size="sm" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> {t.retry}
              </Button>
            )}
            {onCancel && (
              <Button onClick={onCancel} variant="outline" size="sm" className="gap-1.5">
                <X className="h-3.5 w-3.5" /> {t.cancel}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  const progress = Math.min((elapsed / estimatedSeconds) * 100, 95)
  const remaining = Math.max(estimatedSeconds - elapsed, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" role="status" aria-live="polite" aria-label={t.generating}>
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-lift animate-rise">
        {/* Animated icon */}
        <div className="mb-5 flex justify-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary animate-pulse" />
            </div>
          </div>
        </div>

        <h3 className="text-center text-base font-semibold text-foreground">{t.generating}</h3>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">{t.tip}</p>

        {/* Progress bar */}
        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Time indicators */}
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>{t.elapsed}: {elapsed}s</span>
          <span>{t.estimated}: ~{remaining}s</span>
        </div>

        {/* Step indicators */}
        <div className="mt-5 space-y-2">
          {steps.map((step, i) => {
            const StepIcon = step.icon || Sparkles
            const isDone = i < currentStep
            const isActive = i === currentStep
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-300",
                  isDone && "text-emerald-600 dark:text-emerald-400",
                  isActive && "bg-primary/5 text-primary font-medium",
                  !isDone && !isActive && "text-muted-foreground/50"
                )}
              >
                <StepIcon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isDone && "text-emerald-500",
                    isActive && "animate-spin",
                    !isDone && !isActive && "opacity-40"
                  )}
                />
                <span>{step.label}</span>
                {isDone && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
              </div>
            )
          })}
        </div>

        {onCancel && (
          <div className="mt-4 text-center">
            <Button onClick={onCancel} variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
              {t.cancel}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
