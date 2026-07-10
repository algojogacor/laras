import Link from "next/link"
import { Lock, Crown, ArrowLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface FeatureLockProps {
  title: string
  message: string
  upgrade: string
  contactAdmin: string
  backHref: string
  backLabel: string
  /** Optional usage info, e.g. "Used 5 of 5". */
  usage?: { used: number; limit: number; usedLabel: string; ofLabel: string }
}

/**
 * Reusable locked-feature card with an upgrade nudge.
 * Used when entitlement gates block access (Brief §9.4).
 */
export function FeatureLock({
  title,
  message,
  upgrade,
  contactAdmin,
  backHref,
  backLabel,
  usage,
}: FeatureLockProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md shadow-soft">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Crown className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <h1 className="font-serif text-xl font-semibold">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>
          </div>
          {usage && (
            <div className="w-full rounded-lg border border-border bg-muted/30 px-4 py-2.5">
              <p className="text-xs text-muted-foreground">
                {usage.usedLabel} <span className="font-semibold text-foreground">{usage.used}</span> {usage.ofLabel}{" "}
                <span className="font-semibold text-foreground">{usage.limit}</span>
              </p>
            </div>
          )}
          <div className="w-full rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] p-3">
            <p className="text-sm font-medium text-foreground">{upgrade}</p>
            <p className="mt-0.5 text-xs text-primary">{contactAdmin}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={backHref}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {backLabel}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
