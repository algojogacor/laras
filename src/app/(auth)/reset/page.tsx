"use client"

import { useState } from "react"
import Link from "next/link"
import { getDictionary, type Locale } from "@/lib/i18n/dictionary"

export default function ResetRequestPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  // Use a default dictionary on the client; locale could be read from cookie
  const t = getDictionary("id")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      // Always show success regardless of response
      setSent(true)
    } catch {
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-serif font-semibold tracking-tight">
            {t.auth.resetPassword}
          </h1>
          <p className="text-sm text-muted-foreground">{t.auth.resetEmailSent}</p>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t.auth.loginLink}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-serif font-semibold tracking-tight">
          {t.auth.resetPassword}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.auth.forgotPassword}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            {t.auth.email}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.auth.emailPlaceholder}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? t.common.loading : t.auth.sendResetLink}
        </button>
      </form>
      <div className="text-center text-sm">
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t.auth.loginLink}
        </Link>
      </div>
    </div>
  )
}
