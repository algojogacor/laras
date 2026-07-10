"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app-error]", error.message, error.digest)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
        <h2 className="text-xl font-semibold tracking-tight">
          Something went wrong
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          We couldn&apos;t load this page. Please try again, or return to the
          dashboard if the problem persists.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          Try again
        </Button>
        <Button asChild variant="outline">
          <a href="/dashboard">Go to Dashboard</a>
        </Button>
      </div>
    </div>
  )
}
