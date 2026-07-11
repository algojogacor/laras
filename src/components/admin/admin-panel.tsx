"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  XCircle,
  Search,
  Loader2,
  Mail,
  Phone,
  IdCard,
  GraduationCap,
  Briefcase,
  Wrench,
  type LucideIcon,
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
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type BadgeType = "email" | "phone" | "identity" | "education" | "employment" | "skill"
type BadgeStatus = "verified" | "pending" | "rejected" | "expired"

interface Badge {
  type: BadgeType
  status: BadgeStatus
}

interface User {
  id: string
  email: string
  name: string | null
  role: string
  createdAt: string
  fullName: string | null
  headline: string | null
  onboardingComplete: boolean
  profileCompletion: number
  profileId: string | null
  badges: Badge[]
}

interface AdminLabels {
  title: string
  subtitle: string
  usersTitle: string
  usersDesc: string
  userCol: string
  roleCol: string
  badgesCol: string
  actionsCol: string
  manageBadges: string
  searchPlaceholder: string
  noUsers: string
  roleUser: string
  roleAdmin: string
  roleOwner: string
  roleModerator: string
  changeRole: string
  roleChanged: string
  roleChangeError: string
  verified: string
  pending: string
  rejected: string
  expired: string
  setVerified: string
  setRejected: string
  noteLabel: string
  notePlaceholder: string
  saved: string
  error: string
  statsUsers: string
  statsVerified: string
  statsPending: string
  onboardingDone: string
  profileComplete: string
  badgeIdentity: string
  badgeEmail: string
  badgePhone: string
  badgeEducation: string
  badgeEmployment: string
  badgeSkill: string
  currentBadge: string
  noBadge: string
  selectType: string
  selectStatus: string
}

const BADGE_TYPES: BadgeType[] = ["identity", "email", "phone", "education", "employment", "skill"]

const BADGE_ICONS: Record<BadgeType, LucideIcon> = {
  email: Mail,
  phone: Phone,
  identity: IdCard,
  education: GraduationCap,
  employment: Briefcase,
  skill: Wrench,
}

const STATUS_STYLE: Record<BadgeStatus, { dot: string; text: string; icon: LucideIcon }> = {
  verified: { dot: "bg-chart-2", text: "text-chart-2", icon: ShieldCheck },
  pending: { dot: "bg-muted-foreground/40", text: "text-muted-foreground", icon: Clock },
  rejected: { dot: "bg-destructive", text: "text-destructive", icon: XCircle },
  expired: { dot: "bg-chart-4", text: "text-chart-4", icon: Clock },
}

export function AdminPanel({ labels, currentUserRole }: { labels: AdminLabels; currentUserRole: string }) {
  const [users, setUsers] = useState<User[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState("")
  const [managingUser, setManagingUser] = useState<User | null>(null)
  const [badgeType, setBadgeType] = useState<BadgeType>("identity")
  const [badgeStatus, setBadgeStatus] = useState<BadgeStatus>("verified")
  const [note, setNote] = useState("")
  const [saving, startSave] = useTransition()
  const [roleSaving, startRoleSave] = useTransition()
  const router = useRouter()

  const isOwner = currentUserRole === "owner"

  // Load users once
  if (!loaded) {
    fetch("/api/admin/users")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((d) => {
        setUsers(d.users)
        setLoaded(true)
      })
      .catch(() => {
        setLoadError(true)
        setLoaded(true)
      })
  }

  const labelForType = (t: BadgeType): string =>
    ({
      email: labels.badgeEmail,
      phone: labels.badgePhone,
      identity: labels.badgeIdentity,
      education: labels.badgeEducation,
      employment: labels.badgeEmployment,
      skill: labels.badgeSkill,
    })[t]

  const labelForStatus = (s: BadgeStatus): string =>
    ({
      verified: labels.verified,
      pending: labels.pending,
      rejected: labels.rejected,
      expired: labels.expired,
    })[s]

  const labelForRole = (r: string): string =>
    r === "owner"
      ? labels.roleOwner
      : r === "admin"
        ? labels.roleAdmin
        : r === "moderator"
          ? labels.roleModerator
          : labels.roleUser

  const filtered = users.filter((u) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      u.email.toLowerCase().includes(q) ||
      (u.fullName ?? "").toLowerCase().includes(q) ||
      (u.name ?? "").toLowerCase().includes(q)
    )
  })

  const verifiedBadges = users.reduce(
    (sum, u) => sum + u.badges.filter((b) => b.status === "verified").length,
    0
  )
  const pendingBadges = users.reduce(
    (sum, u) => sum + u.badges.filter((b) => b.status === "pending").length,
    0
  )

  const handleRoleChange = (targetId: string, newRole: string) => {
    startRoleSave(async () => {
      try {
        const res = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetId, role: newRole }),
        })
        if (!res.ok) throw new Error("failed")
        const data = await res.json()
        setUsers((prev) =>
          prev.map((u) => (u.id === targetId ? { ...u, role: data.role } : u))
        )
        toast.success(labels.roleChanged)
        router.refresh()
      } catch {
        toast.error(labels.roleChangeError)
      }
    })
  }

  const handleSave = () => {
    if (!managingUser?.profileId) return
    const targetUser = managingUser
    startSave(async () => {
      try {
        const res = await fetch("/api/admin/verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: targetUser.profileId,
            type: badgeType,
            status: badgeStatus,
            note: note || undefined,
          }),
        })
        if (!res.ok) throw new Error("failed")
        // Update local state for both list and dialog
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== targetUser.id) return u
            const has = u.badges.some((b) => b.type === badgeType)
            const badges = has
              ? u.badges.map((b) => (b.type === badgeType ? { ...b, status: badgeStatus } : b))
              : [...u.badges, { type: badgeType, status: badgeStatus }]
            return { ...u, badges }
          })
        )
        setManagingUser((prev) =>
          prev
            ? {
                ...prev,
                badges: prev.badges.some((b) => b.type === badgeType)
                  ? prev.badges.map((b) => (b.type === badgeType ? { ...b, status: badgeStatus } : b))
                  : [...prev.badges, { type: badgeType, status: badgeStatus }],
              }
            : prev
        )
        toast.success(labels.saved)
        router.refresh()
      } catch {
        toast.error(labels.error)
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
          {labels.error}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={labels.statsUsers} value={users.length} />
        <StatCard label={labels.statsVerified} value={verifiedBadges} />
        <StatCard label={labels.statsPending} value={pendingBadges} />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className="pl-9"
        />
      </div>

      {/* User table */}
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="font-serif text-base">{labels.usersTitle}</CardTitle>
          <CardDescription className="text-xs">{labels.usersDesc}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{labels.noUsers}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">{labels.userCol}</th>
                    <th className="px-4 py-2.5 font-medium">{labels.roleCol}</th>
                    <th className="px-4 py-2.5 font-medium">{labels.badgesCol}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{labels.actionsCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {(u.fullName || u.email)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{u.fullName || u.name || u.email.split("@")[0]}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isOwner && u.role !== "owner" ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={roleSaving}
                            aria-label={`${labels.changeRole} — ${u.fullName || u.email}`}
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border-0 bg-muted text-muted-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50",
                              u.role === "admin"
                                ? "bg-chart-1/15 text-chart-1"
                                : u.role === "moderator"
                                  ? "bg-chart-4/15 text-chart-4"
                                  : "bg-muted text-muted-foreground"
                            )}
                          >
                            <option value="user">{labels.roleUser}</option>
                            <option value="moderator">{labels.roleModerator}</option>
                            <option value="admin">{labels.roleAdmin}</option>
                          </select>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                              u.role === "owner"
                                ? "bg-primary/15 text-primary"
                                : u.role === "admin"
                                  ? "bg-chart-1/15 text-chart-1"
                                  : u.role === "moderator"
                                    ? "bg-chart-4/15 text-chart-4"
                                    : "bg-muted text-muted-foreground"
                            )}
                          >
                            {labelForRole(u.role)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.badges.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            u.badges.slice(0, 6).map((b) => {
                              const Icon = BADGE_ICONS[b.type]
                              const st = STATUS_STYLE[b.status]
                              return (
                                <span
                                  key={b.type}
                                  title={`${labelForType(b.type)}: ${labelForStatus(b.status)}`}
                                  className={cn("flex h-6 w-6 items-center justify-center rounded-md border border-border", st.text)}
                                >
                                  <Icon className="h-3 w-3" />
                                </span>
                              )
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setManagingUser(u)
                            setBadgeType("identity")
                            setBadgeStatus("verified")
                            setNote("")
                          }}
                        >
                          {labels.manageBadges}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Badge management dialog */}
      <Dialog open={!!managingUser} onOpenChange={(o) => !o && setManagingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {labels.manageBadges}
              {managingUser && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {managingUser.fullName || managingUser.email}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>{labels.currentBadge}</DialogDescription>
          </DialogHeader>

          {managingUser && (
            <div className="space-y-4">
              {/* Current badges list */}
              <div className="space-y-1.5">
                {managingUser.badges.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{labels.noBadge}</p>
                ) : (
                  managingUser.badges.map((b) => {
                    const Icon = BADGE_ICONS[b.type]
                    const st = STATUS_STYLE[b.status]
                    const SIcon = st.icon
                    return (
                      <div key={b.type} className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", st.text)} />
                          <span className="text-sm">{labelForType(b.type)}</span>
                        </div>
                        <span className={cn("flex items-center gap-1 text-xs", st.text)}>
                          <SIcon className="h-3 w-3" />
                          {labelForStatus(b.status)}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Issue form */}
              <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{labels.selectType}</Label>
                  <Select value={badgeType} onValueChange={(v) => setBadgeType(v as BadgeType)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BADGE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {labelForType(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{labels.selectStatus}</Label>
                  <Select value={badgeStatus} onValueChange={(v) => setBadgeStatus(v as BadgeStatus)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verified">{labels.verified}</SelectItem>
                      <SelectItem value="rejected">{labels.rejected}</SelectItem>
                      <SelectItem value="expired">{labels.expired}</SelectItem>
                      <SelectItem value="pending">{labels.pending}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{labels.noteLabel}</Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={labels.notePlaceholder}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setManagingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !managingUser?.profileId}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {badgeStatus === "verified" ? labels.setVerified : labels.setRejected}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="p-4">
        <p className="font-serif text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
