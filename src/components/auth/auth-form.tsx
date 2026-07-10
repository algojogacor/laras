"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const t = useT()
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next") || "/dashboard"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const isSignup = mode === "signup"

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login"
      const payload = isSignup
        ? { name, email, password }
        : { email, password }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        const errKey = (data.error as string) || "errGeneric"
        const msg = (t.auth as Record<string, string>)[errKey] ?? t.auth.errGeneric
        toast.error(msg)
        return
      }
      toast.success(isSignup ? t.onboarding.complete : t.auth.loginTitle)
      // New users or incomplete onboarding → onboarding; else next
      if (isSignup || data.onboardingComplete === false) {
        router.push("/onboarding")
      } else {
        router.push(next)
      }
      router.refresh()
    } catch {
      toast.error(t.auth.errGeneric)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-rise">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">
          {isSignup ? t.auth.signupTitle : t.auth.loginTitle}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isSignup ? t.auth.signupSubtitle : t.auth.loginSubtitle}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {isSignup && (
          <div className="space-y-2">
            <Label htmlFor="name">{t.auth.name}</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.auth.namePlaceholder}
              className="h-11"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.auth.emailPlaceholder}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t.auth.password}</Label>
          <Input
            id="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.auth.passwordPlaceholder}
            className="h-11"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className="w-full shadow-soft"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSignup ? t.auth.signupSubmit : t.auth.loginSubmit}
          {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignup ? t.auth.noAccount : t.auth.haveAccount}{" "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {isSignup ? t.auth.loginLink : t.auth.signupLink}
        </Link>
      </p>
    </div>
  )
}
