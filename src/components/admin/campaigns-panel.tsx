"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Megaphone,
  Plus,
  Loader2,
  Users,
  Calendar,
  Tag,
  Trash2,
  Edit,
  Pause,
  Play,
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
import { apiClient } from "@/lib/api-client"

interface Campaign {
  id: string
  name: string
  description: string | null
  plan: string
  features: string | null
  maxSeats: number
  usedSeats: number
  startsAt: string
  expiresAt: string | null
  isActive: boolean
  createdById: string
  createdAt: string
}

interface CampaignsLabels {
  campaignsTitle: string
  campaignsDesc: string
  newCampaign: string
  editCampaign: string
  noCampaigns: string
  name: string
  description: string
  plan: string
  selectPlan: string
  planFree: string
  planPlus: string
  planPro: string
  planMax: string
  maxSeats: string
  seats: string
  startsAt: string
  expiresAt: string
  noExpiry: string
  isActive: string
  features: string
  created: string
  updated: string
  deleted: string
  error: string
  activate: string
  deactivate: string
  statsActive: string
  statsTotal: string
  statsSeats: string
}

const PLANS = [
  { value: "free", labelKey: "planFree" as const },
  { value: "plus", labelKey: "planPlus" as const },
  { value: "pro", labelKey: "planPro" as const },
  { value: "max", labelKey: "planMax" as const },
]

export function CampaignsPanel({ labels }: { labels: CampaignsLabels }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [saving, startSave] = useTransition()
  const router = useRouter()

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [plan, setPlan] = useState("plus")
  const [maxSeats, setMaxSeats] = useState(100)
  const [startsAt, setStartsAt] = useState("")
  const [expiresAt, setExpiresAt] = useState("")

  if (!loaded) {
    apiClient("/api/admin/campaigns")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((d) => {
        setCampaigns(d.campaigns)
        setLoaded(true)
      })
      .catch(() => {
        setLoadError(true)
        setLoaded(true)
      })
  }

  const resetForm = () => {
    setName("")
    setDescription("")
    setPlan("plus")
    setMaxSeats(100)
    setStartsAt("")
    setExpiresAt("")
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (c: Campaign) => {
    setEditing(c)
    setName(c.name)
    setDescription(c.description ?? "")
    setPlan(c.plan)
    setMaxSeats(c.maxSeats)
    setStartsAt(c.startsAt ? new Date(c.startsAt).toISOString().slice(0, 10) : "")
    setExpiresAt(c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "")
    setDialogOpen(true)
  }

  const handleSave = () => {
    startSave(async () => {
      try {
        const body: Record<string, unknown> = {
          name: name.trim(),
          description: description.trim() || undefined,
          plan,
          maxSeats,
          startsAt: startsAt || undefined,
          expiresAt: expiresAt || null,
        }

        if (editing) {
          body.campaignId = editing.id
        }

        const method = editing ? "PATCH" : "POST"
        const res = await apiClient("/api/admin/campaigns", {
          method,
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("failed")

        // Reload campaigns
        const listRes = await apiClient("/api/admin/campaigns")
        const listData = await listRes.json()
        setCampaigns(listData.campaigns)
        setDialogOpen(false)
        resetForm()
        toast.success(editing ? labels.updated : labels.created)
        router.refresh()
      } catch {
        toast.error(labels.error)
      }
    })
  }

  const handleToggle = (c: Campaign) => {
    startSave(async () => {
      try {
        const res = await apiClient("/api/admin/campaigns", {
          method: "PATCH",
          body: JSON.stringify({ campaignId: c.id, isActive: !c.isActive }),
        })
        if (!res.ok) throw new Error("failed")
        setCampaigns((prev) =>
          prev.map((x) => (x.id === c.id ? { ...x, isActive: !x.isActive } : x))
        )
        toast.success(labels.updated)
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

  const activeCount = campaigns.filter((c) => c.isActive).length
  const totalSeats = campaigns.reduce((s, c) => s + c.usedSeats, 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={labels.statsActive} value={activeCount} />
        <StatCard label={labels.statsTotal} value={campaigns.length} />
        <StatCard label={labels.statsSeats} value={totalSeats} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-semibold">{labels.campaignsTitle}</h2>
          <p className="text-xs text-muted-foreground">{labels.campaignsDesc}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {labels.newCampaign}
        </Button>
      </div>

      {/* Campaign list */}
      <Card className="shadow-soft">
        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {labels.noCampaigns}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">{labels.name}</th>
                    <th className="px-4 py-2.5 font-medium">{labels.plan}</th>
                    <th className="px-4 py-2.5 font-medium">{labels.seats}</th>
                    <th className="px-4 py-2.5 font-medium">{labels.expiresAt}</th>
                    <th className="px-4 py-2.5 font-medium">{labels.isActive}</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          {c.description && (
                            <p className="truncate text-xs text-muted-foreground">
                              {c.description}
                            </p>
                          )}
                        </div>
                      </td>
                      {/* Plan */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                            c.plan === "max"
                              ? "bg-primary/15 text-primary"
                              : c.plan === "pro"
                                ? "bg-chart-1/15 text-chart-1"
                                : c.plan === "plus"
                                  ? "bg-chart-2/15 text-chart-2"
                                  : "bg-muted text-muted-foreground"
                          )}
                        >
                          {c.plan.toUpperCase()}
                        </span>
                      </td>
                      {/* Seats */}
                      <td className="px-4 py-3">
                        <span className="text-xs">
                          {c.usedSeats} / {c.maxSeats}
                        </span>
                      </td>
                      {/* Expires */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleDateString()
                          : labels.noExpiry}
                      </td>
                      {/* Active */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                            c.isActive
                              ? "bg-chart-2/15 text-chart-2"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggle(c)}
                            title={c.isActive ? labels.deactivate : labels.activate}
                          >
                            {c.isActive ? (
                              <Pause className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <Play className="h-3.5 w-3.5 text-chart-2" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(c)}
                          >
                            <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? labels.editCampaign : labels.newCampaign}</DialogTitle>
            <DialogDescription>
              {editing ? "Update campaign details." : "Create a new marketing campaign."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.name}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer launch campaign"
                maxLength={200}
              />
            </div>
            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.description}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
                className="resize-none"
              />
            </div>
            {/* Plan */}
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.plan}</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {labels[p.labelKey]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Max seats */}
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.maxSeats}</Label>
              <Input
                type="number"
                value={maxSeats}
                onChange={(e) => setMaxSeats(Number(e.target.value))}
                min={1}
                max={100000}
              />
            </div>
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{labels.startsAt}</Label>
                <Input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{labels.expiresAt}</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Update" : "Create"}
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
