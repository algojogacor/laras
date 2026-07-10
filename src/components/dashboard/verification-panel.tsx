"use client"

import { motion } from "framer-motion"
import {
  Mail,
  Phone,
  IdCard,
  GraduationCap,
  Briefcase,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  Clock,
  type LucideIcon,
} from "lucide-react"
import type { VerificationType, VerificationStatus } from "@/lib/verification"
import { cn } from "@/lib/utils"

const TYPE_ICONS: Record<VerificationType, LucideIcon> = {
  email: Mail,
  phone: Phone,
  identity: IdCard,
  education: GraduationCap,
  employment: Briefcase,
  skill: Wrench,
}

const STATUS_STYLES: Record<VerificationStatus, { dot: string; icon: string; label: string }> = {
  verified: { dot: "bg-chart-2", icon: "text-chart-2", label: "verified" },
  pending: { dot: "bg-muted-foreground/40", icon: "text-muted-foreground", label: "pending" },
  rejected: { dot: "bg-destructive", icon: "text-destructive", label: "rejected" },
  expired: { dot: "bg-chart-4", icon: "text-chart-4", label: "expired" },
}

export interface VerificationPanelProps {
  claims: Array<{
    type: VerificationType
    status: VerificationStatus
    label: string
    autoDerivable: boolean
  }>
  verifiedCount: number
  totalCount: number
  trustScore: number
  labels: {
    title: string
    desc: string
    verified: string
    pending: string
    rejected: string
    expired: string
    trustScore: string
    of: string
  }
}

export function VerificationPanel({
  claims,
  verifiedCount,
  totalCount,
  trustScore,
  labels,
}: VerificationPanelProps) {
  const statusLabel = (s: VerificationStatus) =>
    s === "verified"
      ? labels.verified
      : s === "pending"
        ? labels.pending
        : s === "rejected"
          ? labels.rejected
          : labels.expired

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Trust score header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              trustScore >= 75
                ? "bg-chart-2/15 text-chart-2"
                : trustScore >= 40
                  ? "bg-chart-1/15 text-chart-1"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {trustScore >= 50 ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <ShieldAlert className="h-6 w-6" />
            )}
          </div>
          <div>
            <p className="font-serif text-2xl font-semibold tabular-nums">
              {trustScore}<span className="text-base text-muted-foreground">%</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {labels.trustScore} · {verifiedCount}/{totalCount} {labels.of}
            </p>
          </div>
        </div>
        {/* Mini bar */}
        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted sm:w-32">
          <motion.div
            className={cn(
              "h-full rounded-full",
              trustScore >= 75 ? "bg-chart-2" : trustScore >= 40 ? "bg-chart-1" : "bg-muted-foreground/50"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${trustScore}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          />
        </div>
      </div>

      {/* Claims grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {claims.map((c, i) => {
          const Icon = TYPE_ICONS[c.type]
          const style = STATUS_STYLES[c.status]
          return (
            <motion.div
              key={c.type}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.05 * i }}
              className="flex items-center gap-2 rounded-lg border border-border bg-card/50 p-2.5"
            >
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className={cn("h-4 w-4", style.icon)} />
                {/* Status dot */}
                <span
                  className={cn(
                    "absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                    style.dot
                  )}
                  aria-hidden
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{c.label}</p>
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {c.status === "pending" ? (
                    <Clock className="h-2.5 w-2.5" />
                  ) : c.status === "verified" ? (
                    <ShieldCheck className="h-2.5 w-2.5" />
                  ) : null}
                  {statusLabel(c.status)}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
