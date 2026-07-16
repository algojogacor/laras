"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ToggleLeft,
  Plus,
  Loader2,
  Trash2,
  Edit,
  Save,
  X,
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

interface FeatureFlag {
  id: string
  key: string
  enabled: boolean
  description: string | null
  rules: string | null
  updatedAt: string
}

interface ConfigEntry {
  key: string
  value: string
  description: string | null
  updatedAt: string
}

interface ConfigLabels {
  configTitle: string
  configDesc: string
  featuresTitle: string
  featuresDesc: string
  newFeature: string
  newConfig: string
  editFeature: string
  editConfig: string
  noFeatures: string
  noConfigs: string
  key: string
  enabled: string
  description: string
  rules: string
  rulesHint: string
  value: string
  valueHint: string
  created: string
  updated: string
  deleted: string
  error: string
  statsFeatures: string
  statsEnabled: string
  statsConfigs: string
  planRule: string
  roleRule: string
  percentageRule: string
  plansPlaceholder: string
  rolesPlaceholder: string
  featureEnabled: string
  featureDisabled: string
  save: string
  cancel: string
}

export function ConfigPanel({ labels }: { labels: ConfigLabels }) {
  const [activeTab, setActiveTab] = useState<"features" | "config">("features")
  const [saving, startSave] = useTransition()
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-soft">
        <button
          type="button"
          onClick={() => setActiveTab("features")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "features"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ToggleLeft className="h-3.5 w-3.5" />
          {labels.featuresTitle}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("config")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "config"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Save className="h-3.5 w-3.5" />
          {labels.configTitle}
        </button>
      </div>

      {activeTab === "features" ? (
        <FeaturesTab labels={labels} />
      ) : (
        <ConfigTab labels={labels} />
      )}
    </div>
  )
}

// ============================================================================
// Features Tab
// ============================================================================
function FeaturesTab({ labels }: { labels: ConfigLabels }) {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FeatureFlag | null>(null)
  const [saving, startSave] = useTransition()
  const router = useRouter()

  // Form state
  const [key, setKey] = useState("")
  const [enabled, setEnabled] = useState(true)
  const [description, setDescription] = useState("")
  const [plans, setPlans] = useState("")
  const [roles, setRoles] = useState("")
  const [percentage, setPercentage] = useState("100")

  if (!loaded) {
    apiClient("/api/admin/features")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((d) => {
        setFlags(d.flags)
        setLoaded(true)
      })
      .catch(() => {
        setLoadError(true)
        setLoaded(true)
      })
  }

  const resetForm = () => {
    setKey("")
    setEnabled(true)
    setDescription("")
    setPlans("")
    setRoles("")
    setPercentage("100")
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (f: FeatureFlag) => {
    setEditing(f)
    setKey(f.key)
    setEnabled(f.enabled)
    setDescription(f.description ?? "")

    let rules: Record<string, unknown> = {}
    try {
      if (f.rules) rules = JSON.parse(f.rules)
    } catch { /* ignore */ }

    setPlans(Array.isArray(rules.plans) ? rules.plans.join(", ") : "")
    setRoles(Array.isArray(rules.roles) ? rules.roles.join(", ") : "")
    setPercentage(rules.percentage !== undefined ? String(rules.percentage) : "100")
    setDialogOpen(true)
  }

  const handleSave = () => {
    startSave(async () => {
      try {
        const body: Record<string, unknown> = {
          key: key.trim().toLowerCase(),
          enabled,
          description: description.trim() || undefined,
        }

        // Build rules
        const planArr = plans
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
        const roleArr = roles
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
        const pct = parseInt(percentage, 10)

        if (planArr.length > 0 || roleArr.length > 0 || !isNaN(pct)) {
          const rules: Record<string, unknown> = {}
          if (planArr.length > 0) rules.plans = planArr
          if (roleArr.length > 0) rules.roles = roleArr
          if (!isNaN(pct) && pct >= 0 && pct <= 100 && pct !== 100) {
            rules.percentage = pct
          }
          body.rules = rules
        }

        const res = await apiClient("/api/admin/features", {
          method: "POST",
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("failed")

        // Reload
        const listRes = await apiClient("/api/admin/features")
        const listData = await listRes.json()
        setFlags(listData.flags)
        setDialogOpen(false)
        resetForm()
        larasToast.success(editing ? labels.updated : labels.created)
        router.refresh()
      } catch {
        larasToast.error(labels.error)
      }
    })
  }

  const handleDelete = (key: string) => {
    startSave(async () => {
      try {
        const res = await apiClient("/api/admin/features", {
          method: "DELETE",
          body: JSON.stringify({ key }),
        })
        if (!res.ok) throw new Error("failed")
        setFlags((prev) => prev.filter((f) => f.key !== key))
        larasToast.success(labels.deleted)
        router.refresh()
      } catch {
        larasToast.error(labels.error)
      }
    })
  }

  const handleToggle = (f: FeatureFlag) => {
    startSave(async () => {
      try {
        const res = await apiClient("/api/admin/features", {
          method: "POST",
          body: JSON.stringify({ key: f.key, enabled: !f.enabled }),
        })
        if (!res.ok) throw new Error("failed")
        setFlags((prev) =>
          prev.map((x) => (x.key === f.key ? { ...x, enabled: !x.enabled } : x))
        )
        larasToast.success(labels.updated)
        router.refresh()
      } catch {
        larasToast.error(labels.error)
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

  const enabledCount = flags.filter((f) => f.enabled).length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label={labels.statsFeatures} value={flags.length} />
        <StatCard label={labels.statsEnabled} value={enabledCount} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-semibold">{labels.featuresTitle}</h2>
          <p className="text-xs text-muted-foreground">{labels.featuresDesc}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {labels.newFeature}
        </Button>
      </div>

      {/* Flags list */}
      <Card className="shadow-soft">
        <CardContent className="p-0">
          {flags.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {labels.noFeatures}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">{labels.key}</th>
                    <th className="px-4 py-2.5 font-medium">{labels.enabled}</th>
                    <th className="px-4 py-2.5 font-medium">{labels.description}</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {flags.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {f.key}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggle(f)}
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium cursor-pointer border-0",
                            f.enabled
                              ? "bg-chart-2/15 text-chart-2"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {f.enabled ? labels.featureEnabled : labels.featureDisabled}
                        </button>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="truncate text-xs text-muted-foreground">
                          {f.description || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(f)}
                          >
                            <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(f.key)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
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

      {/* Feature Flag Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? labels.editFeature : labels.newFeature}</DialogTitle>
            <DialogDescription>
              Feature flags control which users see experimental or gated features.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.key}</Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. beta.dashboard"
                disabled={!!editing}
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.enabled}</Label>
              <Select
                value={enabled ? "true" : "false"}
                onValueChange={(v) => setEnabled(v === "true")}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{labels.featureEnabled}</SelectItem>
                  <SelectItem value="false">{labels.featureDisabled}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.description}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this flag control?"
                maxLength={500}
              />
            </div>

            {/* Rules */}
            <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                {labels.rules}
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">{labels.planRule}</Label>
                <Input
                  value={plans}
                  onChange={(e) => setPlans(e.target.value)}
                  placeholder={labels.plansPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{labels.roleRule}</Label>
                <Input
                  value={roles}
                  onChange={(e) => setRoles(e.target.value)}
                  placeholder={labels.rolesPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{labels.percentageRule}</Label>
                <Input
                  type="number"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  min={0}
                  max={100}
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
              {labels.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving || !key.trim()}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {labels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================================
// Config Tab
// ============================================================================
function ConfigTab({ labels }: { labels: ConfigLabels }) {
  const [configs, setConfigs] = useState<ConfigEntry[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ConfigEntry | null>(null)
  const [saving, startSave] = useTransition()
  const router = useRouter()

  // Form state
  const [key, setKey] = useState("")
  const [value, setValue] = useState("")
  const [description, setDescription] = useState("")
  // Inline editing
  const [inlineEdit, setInlineEdit] = useState<string | null>(null)
  const [inlineValue, setInlineValue] = useState("")

  if (!loaded) {
    apiClient("/api/admin/config")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((d) => {
        setConfigs(d.configs)
        setLoaded(true)
      })
      .catch(() => {
        setLoadError(true)
        setLoaded(true)
      })
  }

  const resetForm = () => {
    setKey("")
    setValue("")
    setDescription("")
    setEditing(null)
  }

  const openCreate = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEdit = (c: ConfigEntry) => {
    setEditing(c)
    setKey(c.key)
    setValue(c.value)
    setDescription(c.description ?? "")
    setDialogOpen(true)
  }

  const handleSave = () => {
    startSave(async () => {
      try {
        // Try to parse value as JSON; if it fails, use raw string
        let parsedValue: unknown = value
        try {
          parsedValue = JSON.parse(value)
        } catch {
          // Use raw string
        }

        const body: Record<string, unknown> = {
          key: key.trim(),
          value: parsedValue,
          description: description.trim() || undefined,
        }

        const res = await apiClient("/api/admin/config", {
          method: "POST",
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("failed")

        // Reload
        const listRes = await apiClient("/api/admin/config")
        const listData = await listRes.json()
        setConfigs(listData.configs)
        setDialogOpen(false)
        resetForm()
        larasToast.success(editing ? labels.updated : labels.created)
        router.refresh()
      } catch {
        larasToast.error(labels.error)
      }
    })
  }

  const handleDelete = (key: string) => {
    startSave(async () => {
      try {
        const res = await apiClient("/api/admin/config", {
          method: "DELETE",
          body: JSON.stringify({ key }),
        })
        if (!res.ok) throw new Error("failed")
        setConfigs((prev) => prev.filter((c) => c.key !== key))
        larasToast.success(labels.deleted)
        router.refresh()
      } catch {
        larasToast.error(labels.error)
      }
    })
  }

  const handleInlineSave = (entryKey: string) => {
    startSave(async () => {
      try {
        let parsedValue: unknown = inlineValue
        try {
          parsedValue = JSON.parse(inlineValue)
        } catch {
          // Use raw string
        }

        const res = await apiClient("/api/admin/config", {
          method: "POST",
          body: JSON.stringify({ key: entryKey, value: parsedValue }),
        })
        if (!res.ok) throw new Error("failed")

        const listRes = await apiClient("/api/admin/config")
        const listData = await listRes.json()
        setConfigs(listData.configs)
        setInlineEdit(null)
        larasToast.success(labels.updated)
        router.refresh()
      } catch {
        larasToast.error(labels.error)
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
      <div className="grid grid-cols-1 gap-3">
        <StatCard label={labels.statsConfigs} value={configs.length} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-semibold">{labels.configTitle}</h2>
          <p className="text-xs text-muted-foreground">{labels.configDesc}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {labels.newConfig}
        </Button>
      </div>

      {/* Config list */}
      <Card className="shadow-soft">
        <CardContent className="p-0">
          {configs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {labels.noConfigs}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">{labels.key}</th>
                    <th className="px-4 py-2.5 font-medium">{labels.value}</th>
                    <th className="px-4 py-2.5 font-medium">{labels.description}</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((c) => (
                    <tr
                      key={c.key}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {c.key}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        {inlineEdit === c.key ? (
                          <div className="flex gap-1">
                            <Input
                              value={inlineValue}
                              onChange={(e) => setInlineValue(e.target.value)}
                              className="h-7 text-xs font-mono"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleInlineSave(c.key)}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setInlineEdit(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <code
                            className="text-xs text-muted-foreground max-w-[250px] block truncate cursor-pointer hover:text-foreground"
                            onClick={() => {
                              setInlineEdit(c.key)
                              setInlineValue(c.value)
                            }}
                            title="Click to edit inline"
                          >
                            {c.value}
                          </code>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[150px]">
                        <p className="truncate text-xs text-muted-foreground">
                          {c.description || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(c)}
                          >
                            <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(c.key)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive/60" />
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

      {/* Config Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && setDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? labels.editConfig : labels.newConfig}</DialogTitle>
            <DialogDescription>
              Dynamic config values are parsed as JSON. Strings, numbers, objects, and arrays are all supported.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.key}</Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. app.max_upload_size"
                disabled={!!editing}
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.value}</Label>
              <Textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={labels.valueHint}
                rows={4}
                className="font-mono text-xs resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{labels.description}</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this config for?"
                maxLength={500}
              />
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
              {labels.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving || !key.trim()}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {labels.save}
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
