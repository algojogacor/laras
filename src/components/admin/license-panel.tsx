"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Crown,
  Search,
  Loader2,
  Clock,
  XCircle,
  CheckCircle2,
  PauseCircle,
  Calendar,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { larasToast } from "@/lib/laras-toast"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"

type Plan = "free" | "plus" | "pro" | "max"
type LicenseStatus = "active" | "expired" | "suspended" | "cancelled"

interface License {
  id: string
  plan: Plan
  status: LicenseStatus
  features: string | null
  note: string | null
  issuedById: string | null
  startsAt: string
  expiresAt: string | null
  createdAt: string
  profileId: string
  fullName: string | null
  email: string | null
}

interface LicenseLabels {
  licensesTitle: string
  licensesDesc: string
  grantLicense: string
  editLicense: string
  noLicenses: string
  plan: string
  planFree: string
  planPlus: string
  planPro: string
  planMax: string
  statusActive: string
  statusSuspended: string
  statusExpired: string
  statusCancelled: string
  expiresAt: string
  noExpiry: string
  licenseNote: string
  selectPlan: string
  selectStatus2: string
  expiryDate: string
  licenseGranted: string
  licenseUpdated: string
  licenseError: string
  suspend: string
  reactivate: string
  cancel: string
}

const PLAN_STYLE: Record<Plan, { badge: string; icon: typeof Crown }> = {
  free: { badge: "bg-muted text-muted-foreground", icon: Sparkles },
  plus: { badge: "bg-chart-3/15 text-chart-3", icon: Crown },
  pro: { badge: "bg-chart-1/15 text-chart-1", icon: Crown },
  max: { badge: "bg-primary/15 text-primary", icon: Crown },
}

const STATUS_STYLE: Record<LicenseStatus, { dot: string; text: string; icon: typeof CheckCircle2 }> = {
  active: { dot: "bg-chart-2", text: "text-chart-2", icon: CheckCircle2 },
  suspended: { dot: "bg-chart-4", text: "text-chart-4", icon: PauseCircle },
  expired: { dot: "bg-muted-foreground/40", text: "text-muted-foreground", icon: Clock },
  cancelled: { dot: "bg-destructive", text: "text-destructive", icon: XCircle },
}

export function LicensePanel({ labels }: { labels: LicenseLabels }) {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState("")
  const [grantOpen, setGrantOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<License | null>(null)
  const [form, setForm] = useState<{ profileId: string; plan: Plan; status: LicenseStatus; expiresAt: string; note: string }>({
    profileId: "",
    plan: "pro",
    status: "active",
    expiresAt: "",
    note: "",
  })
  const [saving, startSave] = useTransition()
  const router = useRouter()

  if (!loaded) {
    apiClient("/api/admin/licenses")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((d) => {
        setLicenses(d.licenses)
        setLoaded(true)
      })
      .catch(() => {
        setLoadError(true)
        setLoaded(true)
      })
  }

  const labelForPlan = (p: Plan) =>
    p === "pro" ? labels.planPro : p === "max" ? labels.planMax : p === "plus" ? labels.planPlus : labels.planFree
  const labelForStatus = (s: LicenseStatus) =>
    ({
      active: labels.statusActive,
      suspended: labels.statusSuspended,
      expired: labels.statusExpired,
      cancelled: labels.statusCancelled,
    })[s]

  const filtered = licenses.filter((l) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      (l.fullName ?? "").toLowerCase().includes(q) ||
      (l.email ?? "").toLowerCase().includes(q) ||
      l.plan.toLowerCase().includes(q)
    )
  })

  const handleSave = () => {
    const isEdit = !!editTarget
    startSave(async () => {
      try {
        const body = isEdit
          ? {
              licenseId: editTarget!.id,
              status: form.status,
              expiresAt: form.expiresAt || null,
              note: form.note || undefined,
            }
          : {
              profileId: form.profileId,
              plan: form.plan,
              status: form.status,
              expiresAt: form.expiresAt || null,
              note: form.note || undefined,
            }
        const res = await apiClient("/api/admin/licenses", {
          method: isEdit ? "PATCH" : "POST",
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("failed")
        const d = await res.json()
        if (isEdit) {
          setLicenses((prev) =>
            prev.map((l) => (l.id === editTarget!.id ? { ...l, ...d.license } : l))
          )
          larasToast.success(labels.licenseUpdated)
        } else {
          // Refetch to get the joined user info
          const r2 = await apiClient("/api/admin/licenses")
          const d2 = await r2.json()
          setLicenses(d2.licenses)
          larasToast.success(labels.licenseGranted)
        }
        setGrantOpen(false)
        setEditTarget(null)
        router.refresh()
      } catch {
        larasToast.error(labels.licenseError)
      }
    })
  }

  const handleQuickStatus = (license: License, status: LicenseStatus) => {
    startSave(async () => {
      try {
        const res = await apiClient("/api/admin/licenses", {
          method: "PATCH",
          body: JSON.stringify({ licenseId: license.id, status }),
        })
        if (!res.ok) throw new Error("failed")
        const d = await res.json()
        setLicenses((prev) => prev.map((l) => (l.id === license.id ? { ...l, ...d.license } : l)))
        larasToast.success(labels.licenseUpdated)
        router.refresh()
      } catch {
        larasToast.error(labels.licenseError)
      }
    })
  }

  if (!loaded) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (loadError) {
    return (
      <Card className="shadow-soft">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          {labels.licenseError}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.licensesDesc}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditTarget(null)
            setForm({ profileId: "", plan: "pro", status: "active", expiresAt: "", note: "" })
            setGrantOpen(true)
          }}
        >
          <Crown className="mr-1.5 h-4 w-4" />
          {labels.grantLicense}
        </Button>
      </div>

      {/* Licenses list */}
      {filtered.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {labels.noLicenses}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => {
            const ps = PLAN_STYLE[l.plan]
            const ss = STATUS_STYLE[l.status]
            const PIcon = ps.icon
            const SIcon = ss.icon
            return (
              <Card key={l.id} className="shadow-soft">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", ps.badge)}>
                      <PIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {l.fullName || l.email || "Unknown user"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{l.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", ps.badge)}>
                      {labelForPlan(l.plan)}
                    </span>
                    <span className={cn("inline-flex items-center gap-1 text-xs", ss.text)}>
                      <SIcon className="h-3 w-3" />
                      {labelForStatus(l.status)}
                    </span>
                    {l.expiresAt && (
                      <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                        <Calendar className="h-3 w-3" />
                        {new Date(l.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      {l.status === "active" ? (
                        <Button size="sm" variant="ghost" onClick={() => handleQuickStatus(l, "suspended")}>
                          {labels.suspend}
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => handleQuickStatus(l, "active")}>
                          {labels.reactivate}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditTarget(l)
                          setForm({
                            profileId: l.profileId,
                            plan: l.plan,
                            status: l.status,
                            expiresAt: l.expiresAt ? l.expiresAt.split("T")[0] : "",
                            note: l.note ?? "",
                          })
                          setGrantOpen(true)
                        }}
                      >
                        {labels.editLicense}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Grant / Edit dialog */}
      <Dialog open={grantOpen} onOpenChange={(o) => !o && (setGrantOpen(false), setEditTarget(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? labels.editLicense : labels.grantLicense}
            </DialogTitle>
            <DialogDescription>{labels.licensesDesc}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {!editTarget && (
              <div className="space-y-1.5">
                <Label className="text-xs">Profile ID</Label>
                <Input
                  value={form.profileId}
                  onChange={(e) => setForm((f) => ({ ...f, profileId: e.target.value }))}
                  placeholder="cmr..."
                  className="h-9 font-mono text-xs"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{labels.selectPlan}</Label>
                <Select
                  value={form.plan}
                  onValueChange={(v) => setForm((f) => ({ ...f, plan: v as Plan }))}
                  disabled={!!editTarget}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">{labels.planFree}</SelectItem>
                    <SelectItem value="plus">{labels.planPlus}</SelectItem>
                    <SelectItem value="pro">{labels.planPro}</SelectItem>
                    <SelectItem value="max">{labels.planMax}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{labels.selectStatus2}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as LicenseStatus }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{labels.statusActive}</SelectItem>
                    <SelectItem value="suspended">{labels.statusSuspended}</SelectItem>
                    <SelectItem value="expired">{labels.statusExpired}</SelectItem>
                    <SelectItem value="cancelled">{labels.statusCancelled}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.expiryDate}</Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.licenseNote}</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => (setGrantOpen(false), setEditTarget(null))}>
              {labels.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving || (!editTarget && !form.profileId.trim())}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editTarget ? labels.licenseUpdated : labels.grantLicense}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
