"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to server-side observability (no sensitive data)
    console.error("[global-error]", error.message, error.digest)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
          <div className="flex flex-col items-center gap-3">
            <AlertTriangle className="h-12 w-12 text-destructive" aria-hidden="true" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Something went wrong
            </h1>
            <p className="max-w-md text-sm text-muted-foreground">
              An unexpected error occurred. Our team has been notified. Please try
              refreshing the page, or return to the dashboard.
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
      </body>
    </html>
  )
}
