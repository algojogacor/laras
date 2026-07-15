"use client"

import { useState } from "react"
import { ShieldCheck, Crown, Megaphone, ToggleLeft, Tag } from "lucide-react"
import { AdminPanel } from "@/components/admin/admin-panel"
import { LicensePanel } from "@/components/admin/license-panel"
import { AnnouncementsPanel } from "@/components/admin/announcements-panel"
import { CampaignsPanel } from "@/components/admin/campaigns-panel"
import { ConfigPanel } from "@/components/admin/config-panel"
import { cn } from "@/lib/utils"

type TabId = "verification" | "licenses" | "announcements" | "campaigns" | "config"

interface AdminTabsProps {
  currentUserRole: string
  verificationLabels: React.ComponentProps<typeof AdminPanel>["labels"]
  licenseLabels: React.ComponentProps<typeof LicensePanel>["labels"]
  announcementLabels: React.ComponentProps<typeof AnnouncementsPanel>["labels"]
  campaignLabels: React.ComponentProps<typeof CampaignsPanel>["labels"]
  configLabels: React.ComponentProps<typeof ConfigPanel>["labels"]
  initialTab?: TabId
}

export function AdminTabs({
  currentUserRole,
  verificationLabels,
  licenseLabels,
  announcementLabels,
  campaignLabels,
  configLabels,
  initialTab = "verification",
}: AdminTabsProps) {
  const [tab, setTab] = useState<TabId>(initialTab)

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="inline-flex flex-wrap rounded-lg border border-border bg-card p-1 shadow-soft">
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
        <TabButton
          active={tab === "announcements"}
          onClick={() => setTab("announcements")}
          icon={Megaphone}
          label={announcementLabels.adminTitle}
        />
        <TabButton
          active={tab === "campaigns"}
          onClick={() => setTab("campaigns")}
          icon={Tag}
          label={campaignLabels.campaignsTitle}
        />
        <TabButton
          active={tab === "config"}
          onClick={() => setTab("config")}
          icon={ToggleLeft}
          label={configLabels.configTitle}
        />
      </div>

      {tab === "verification" ? (
        <AdminPanel labels={verificationLabels} currentUserRole={currentUserRole} />
      ) : tab === "licenses" ? (
        <LicensePanel labels={licenseLabels} />
      ) : tab === "announcements" ? (
        <AnnouncementsPanel labels={announcementLabels} />
      ) : tab === "campaigns" ? (
        <CampaignsPanel labels={campaignLabels} />
      ) : (
        <ConfigPanel labels={configLabels} />
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
