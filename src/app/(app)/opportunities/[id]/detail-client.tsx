"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  MapPin,
  Clock,
  Building2,
  ExternalLink,
  Trash2,
  Sparkles,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  Languages,
} from "lucide-react"
import type { OpportunityWithMatch } from "./page"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_LABELS_ID: Record<string, string> = {
  job: "Pekerjaan", internship: "Magang", scholarship: "Beasiswa",
  fellowship: "Fellowship", competition: "Kompetisi", volunteer: "Volunteer",
  event: "Acara", odp: "ODP", bumn: "BUMN", cpns: "CPNS", other: "Lainnya",
}

const TYPE_LABELS_EN: Record<string, string> = {
  job: "Job", internship: "Internship", scholarship: "Scholarship",
  fellowship: "Fellowship", competition: "Competition", volunteer: "Volunteer",
  event: "Event", odp: "ODP", bumn: "BUMN", cpns: "CPNS", other: "Other",
}

const STATUS_OPTIONS = [
  "saved", "applied", "interviewing", "offered", "accepted", "rejected", "archived",
] as const

const STATUS_LABELS_ID: Record<string, string> = {
  saved: "Tersimpan", applied: "Dilamar", interviewing: "Wawancara",
  offered: "Ditawari", accepted: "Diterima", rejected: "Ditolak",
  archived: "Diarsipkan", expired: "Kedaluwarsa",
}

const STATUS_LABELS_EN: Record<string, string> = {
  saved: "Saved", applied: "Applied", interviewing: "Interviewing",
  offered: "Offered", accepted: "Accepted", rejected: "Rejected",
  archived: "Archived", expired: "Expired",
}

const STATUS_COLORS: Record<string, string> = {
  saved: "bg-muted text-muted-foreground",
  applied: "bg-chart-1/15 text-chart-1",
  interviewing: "bg-chart-3/15 text-chart-3",
  offered: "bg-chart-2/15 text-chart-2",
  accepted: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
  archived: "bg-muted text-muted-foreground",
  expired: "bg-chart-4/15 text-chart-4",
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MatchDetailResult {
  overallScore: number
  categoryScores: {
    requiredSkills: number
    preferredSkills: number
    experience: number
    education: number
    languages: number
  }
  strengths: { field: string; label: string; type: string; detail: string; verified: boolean }[]
  gaps: { field: string; label: string; type: string; detail: string; verified: boolean }[]
  partial: { field: string; label: string; type: string; detail: string; verified: boolean }[]
  analyzedAt: string
}

interface Props {
  opportunity: OpportunityWithMatch
  matchDetail: MatchDetailResult | null
  isId: boolean
  t: Record<string, string>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number): string {
  if (score >= 80) return "text-chart-2"
  if (score >= 60) return "text-chart-1"
  if (score >= 40) return "text-chart-3"
  return "text-destructive"
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-chart-2"
  if (score >= 60) return "bg-chart-1"
  if (score >= 40) return "bg-chart-3"
  return "bg-destructive"
}

function getScoreRing(score: number): string {
  if (score >= 80) return "[&>circle]:stroke-chart-2"
  if (score >= 60) return "[&>circle]:stroke-chart-1"
  if (score >= 40) return "[&>circle]:stroke-chart-3"
  return "[&>circle]:stroke-destructive"
}

// ---------------------------------------------------------------------------
// Match Ring (SVG donut)
// ---------------------------------------------------------------------------

function MatchRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference
  const strokeColor = getScoreColor(score).replace("text-", "")

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={6}
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`text-${strokeColor} transition-all duration-700 ease-out`}
        />
      </svg>
      <span className={cn("absolute text-lg font-bold font-mono tabular-nums", getScoreColor(score))}>
        {score}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function OpportunityDetailClient({ opportunity, matchDetail: initialMatch, isId, t }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(opportunity.status)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [matchData, setMatchData] = useState<MatchDetailResult | null>(initialMatch)
  const [matchError, setMatchError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const typeLabel = isId ? TYPE_LABELS_ID[opportunity.type] ?? opportunity.type : TYPE_LABELS_EN[opportunity.type] ?? opportunity.type
  const statusLabel = isId ? STATUS_LABELS_ID[status] ?? status : STATUS_LABELS_EN[status] ?? status

  // ---------- Status update ----------
  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (newStatus === status) return
    setStatusUpdating(true)
    try {
      const res = await fetch("/api/opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: opportunity.id, status: newStatus }),
      })
      if (!res.ok) throw new Error("Failed to update")
      setStatus(newStatus)
      router.refresh()
    } catch {
      // silent
    } finally {
      setStatusUpdating(false)
    }
  }, [opportunity.id, status, router])

  // ---------- Match analysis ----------
  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true)
    setMatchError(null)
    try {
      const res = await fetch(`/api/opportunities/${opportunity.id}/match`, {
        method: "POST",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Analysis failed")
      }
      const body = await res.json()
      setMatchData(body.match)
      router.refresh()
    } catch (err: unknown) {
      setMatchError(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }, [opportunity.id, router])

  // ---------- Delete ----------
  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/opportunities?id=${encodeURIComponent(opportunity.id)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Delete failed")
      router.push("/opportunities")
      router.refresh()
    } catch {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }, [opportunity.id, router])

  // ---------- Requirements parsing ----------
  let requirements: { required: string[]; preferred: string[] } | null = null
  if (opportunity.requirements) {
    try {
      requirements = JSON.parse(opportunity.requirements)
    } catch {
      // not JSON
    }
  }

  // ---------- Render ----------
  return (
    <div className="animate-rise space-y-6">
      {/* Back link */}
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {isId ? "Kembali ke daftar kesempatan" : "Back to opportunities"}
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---- Left column: Main info ---- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header card */}
          <Card className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[status] ?? STATUS_COLORS.saved)}>
                      {statusLabel}
                    </span>
                  </div>
                  <h1 className="mt-3 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                    {opportunity.title}
                  </h1>
                  {opportunity.organization && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4 flex-shrink-0" />
                      {opportunity.organization}
                    </p>
                  )}
                </div>

                {/* Status dropdown */}
                <div className="flex-shrink-0">
                  <Select value={status} onValueChange={handleStatusChange} disabled={statusUpdating}>
                    <SelectTrigger className="h-9 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {isId ? STATUS_LABELS_ID[s] ?? s : STATUS_LABELS_EN[s] ?? s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Meta badges */}
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {opportunity.location && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {opportunity.location}
                  </span>
                )}
                {opportunity.deadline && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1">
                    <Clock className="h-3.5 w-3.5" />
                    {isId
                      ? new Date(opportunity.deadline).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })
                      : new Date(opportunity.deadline).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                )}
                {opportunity.url && (
                  <a
                    href={opportunity.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 hover:bg-secondary transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {isId ? "Buka lowongan" : "Open listing"}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {opportunity.description && (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">
                  {isId ? "Deskripsi" : "Description"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-muted-foreground">
                  {opportunity.description}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Requirements */}
          {requirements && (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">
                  {isId ? "Persyaratan" : "Requirements"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {requirements.required && requirements.required.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      {isId ? "Wajib" : "Required"}
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {requirements.required.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {requirements.preferred && requirements.preferred.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      {isId ? "Diutamakan" : "Preferred"}
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {requirements.preferred.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {opportunity.notes && (
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">
                  {isId ? "Catatan" : "Notes"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {opportunity.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ---- Right column: Match & Actions ---- */}
        <div className="space-y-6">
          {/* Match analysis card */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-chart-1" />
                {isId ? "Analisis Kecocokan" : "Match Analysis"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {matchData ? (
                <>
                  {/* Score ring */}
                  <div className="flex flex-col items-center gap-3 py-2">
                    <MatchRing score={matchData.overallScore} size={100} />
                    <p className={cn("text-xl font-bold font-mono", getScoreColor(matchData.overallScore))}>
                      {matchData.overallScore}<span className="text-sm font-normal">/100</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isId
                        ? `Dianalisis ${new Date(matchData.analyzedAt).toLocaleDateString("id-ID")}`
                        : `Analyzed ${new Date(matchData.analyzedAt).toLocaleDateString("en-US")}`}
                    </p>
                  </div>

                  {/* Category breakdown */}
                  <div className="space-y-3 border-t border-border pt-4">
                    <CategoryBar
                      icon={<ShieldCheck className="h-4 w-4" />}
                      label={isId ? "Keahlian wajib" : "Required skills"}
                      score={matchData.categoryScores.requiredSkills}
                      max={40}
                    />
                    <CategoryBar
                      icon={<Sparkles className="h-4 w-4" />}
                      label={isId ? "Keahlian preferensi" : "Preferred skills"}
                      score={matchData.categoryScores.preferredSkills}
                      max={20}
                    />
                    <CategoryBar
                      icon={<Briefcase className="h-4 w-4" />}
                      label={isId ? "Pengalaman" : "Experience"}
                      score={matchData.categoryScores.experience}
                      max={20}
                    />
                    <CategoryBar
                      icon={<GraduationCap className="h-4 w-4" />}
                      label={isId ? "Pendidikan" : "Education"}
                      score={matchData.categoryScores.education}
                      max={10}
                    />
                    <CategoryBar
                      icon={<Languages className="h-4 w-4" />}
                      label={isId ? "Bahasa" : "Languages"}
                      score={matchData.categoryScores.languages}
                      max={10}
                    />
                  </div>

                  {/* Strengths */}
                  {matchData.strengths.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <h4 className="text-sm font-semibold text-chart-2 flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {isId ? "Kekuatan" : "Strengths"} ({matchData.strengths.length})
                      </h4>
                      <ul className="space-y-1.5">
                        {matchData.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <span className="mt-0.5 flex-shrink-0">
                              {s.verified ? (
                                <ShieldCheck className="h-3 w-3 text-chart-2" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-chart-2" />
                              )}
                            </span>
                            <span>{s.detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Gaps */}
                  {matchData.gaps.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <h4 className="text-sm font-semibold text-destructive flex items-center gap-1.5 mb-2">
                        <XCircle className="h-4 w-4" />
                        {isId ? "Kesenjangan" : "Gaps"} ({matchData.gaps.length})
                      </h4>
                      <ul className="space-y-1.5">
                        {matchData.gaps.map((g, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-destructive" />
                            <span>{g.detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Partial Matches */}
                  {matchData.partial.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <h4 className="text-sm font-semibold text-chart-3 flex items-center gap-1.5 mb-2">
                        <AlertCircle className="h-4 w-4" />
                        {isId ? "Cocok Sebagian" : "Partial Matches"} ({matchData.partial.length})
                      </h4>
                      <ul className="space-y-1.5">
                        {matchData.partial.map((p, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-chart-3" />
                            <span>{p.detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Re-analyze button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    {analyzing
                      ? (isId ? "Menganalisis..." : "Analyzing...")
                      : (isId ? "Analisis Ulang" : "Re-analyze")}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    {isId
                      ? "Lihat seberapa cocok profilmu dengan kesempatan ini."
                      : "See how well your profile matches this opportunity."}
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                  >
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    {analyzing
                      ? (isId ? "Menganalisis..." : "Analyzing...")
                      : (isId ? "Analisis Kecocokan" : "Analyze Match")}
                  </Button>
                  {matchError && (
                    <p className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {matchError}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions card */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">
                {isId ? "Aksi" : "Actions"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    {isId ? "Hapus kesempatan" : "Delete opportunity"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {isId ? "Hapus kesempatan?" : "Delete opportunity?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {isId
                        ? `Kesempatan "${opportunity.title}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
                        : `The opportunity "${opportunity.title}" will be permanently deleted. This action cannot be undone.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>
                      {isId ? "Batal" : "Cancel"}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting
                        ? (isId ? "Menghapus..." : "Deleting...")
                        : (isId ? "Hapus" : "Delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {opportunity.deadline && (
                <p className="text-xs text-muted-foreground pt-2 px-1">
                  {isId
                    ? `Dibuat: ${new Date(opportunity.createdAt).toLocaleDateString("id-ID")}`
                    : `Created: ${new Date(opportunity.createdAt).toLocaleDateString("en-US")}`}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CategoryBar subcomponent
// ---------------------------------------------------------------------------

function CategoryBar({
  icon,
  label,
  score,
  max,
}: {
  icon: React.ReactNode
  label: string
  score: number
  max: number
}) {
  const pct = Math.round((score / max) * 100)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {score}/{max}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  )
}
