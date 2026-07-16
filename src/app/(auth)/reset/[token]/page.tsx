"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getDictionary } from "@/lib/i18n/dictionary"
import { apiClient } from "@/lib/api-client"

export default function ResetConfirmPage() {
  const params = useParams()
  const router = useRouter()
  const token = (params.token as string) ?? ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const t = getDictionary("id")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError(t.auth.errWeak)
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const res = await apiClient("/api/auth/reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (data.ok) {
        setSuccess(true)
        setTimeout(() => router.push("/login"), 3000)
      } else {
        setError(t.auth.resetTokenInvalid)
      }
    } catch {
      setError(t.auth.errGeneric)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-serif font-semibold tracking-tight">
            {t.auth.resetPassword}
          </h1>
          <p className="text-sm text-muted-foreground">{t.auth.resetSuccess}</p>
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
        <p className="text-sm text-muted-foreground">{t.auth.newPassword}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            {t.auth.newPassword}
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.auth.newPasswordPlaceholder}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Konfirmasi kata sandi
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Masukkan ulang kata sandi baru"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? t.common.loading : t.auth.resetSubmit}
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
