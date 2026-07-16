"use client"

import { useState } from "react"
import { Ticket, Loader2, CheckCircle, XCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface RedeemLabels {
  redeemTitle: string
  redeemDesc: string
  redeemCode: string
  codePlaceholder: string
  redeemButton: string
  redeeming: string
  redeemSuccess: string
  redeemError: string
  redeemNotFound: string
  redeemExpired: string
  redeemUsedUp: string
  redeemDuplicate: string
}

interface RedeemCodeProps {
  labels: RedeemLabels
}

export function RedeemCode({ labels }: RedeemCodeProps) {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [resultPlan, setResultPlan] = useState("")

  const errorMessages: Record<string, string> = {
    "not-found": labels.redeemNotFound,
    expired: labels.redeemExpired,
    "used-up": labels.redeemUsedUp,
    duplicate: labels.redeemDuplicate,
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return

    setLoading(true)
    setStatus("idle")
    setMessage("")

    try {
      const res = await apiClient("/api/licenses/redeem", {
        method: "POST",
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })
      const data = await res.json()

      if (data.ok) {
        setStatus("success")
        setResultPlan(data.entitlement?.plan ?? data.license?.plan ?? "")
        setMessage(labels.redeemSuccess.replace("{plan}", data.entitlement?.plan ?? data.license?.plan ?? ""))
        setCode("")
        // Refresh the page after a short delay to show updated entitlement
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setStatus("error")
        const errKey = data.error
        setMessage(errorMessages[errKey] ?? labels.redeemError)
      }
    } catch {
      setStatus("error")
      setMessage(labels.redeemError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-serif text-base">
          <Ticket className="h-4 w-4 text-primary" />
          {labels.redeemTitle}
        </CardTitle>
        <CardDescription className="text-xs">{labels.redeemDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRedeem} className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setStatus("idle")
              setMessage("")
            }}
            placeholder={labels.codePlaceholder}
            maxLength={20}
            className="font-mono uppercase tracking-wider"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {labels.redeeming}
              </>
            ) : (
              labels.redeemButton
            )}
          </button>
        </form>
        {status === "success" && message && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-chart-2/10 p-3 text-sm text-chart-2">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {status === "error" && message && (
          <div className="mt-3 flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
