"use client"

import { useState } from "react"
import { ShieldCheck, Crown } from "lucide-react"
import { AdminPanel } from "@/components/admin/admin-panel"
import { LicensePanel } from "@/components/admin/license-panel"
import { cn } from "@/lib/utils"

interface AdminTabsProps {
  verificationLabels: React.ComponentProps<typeof AdminPanel>["labels"]
  licenseLabels: React.ComponentProps<typeof LicensePanel>["labels"]
  initialTab?: "verification" | "licenses"
}

export function AdminTabs({
  verificationLabels,
  licenseLabels,
  initialTab = "verification",
}: AdminTabsProps) {
  const [tab, setTab] = useState<"verification" | "licenses">(initialTab)

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-soft">
        <TabButton
          active={tab === "verification"}
          onClick={() => setTab("verification")}
          icon={ShieldCheck}
          label={verificationLabels.title}
        />
        <TabButton
          active={tab === "licenses"}
          onClick={() => setTab("licenses")}
          icon={Crown}
          label={licenseLabels.licensesTitle}
        />
      </div>

      {tab === "verification" ? (
        <AdminPanel labels={verificationLabels} />
      ) : (
        <LicensePanel labels={licenseLabels} />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof ShieldCheck
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
