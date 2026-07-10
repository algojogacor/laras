"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  MessageSquare,
  GraduationCap,
  User,
  Settings,
  FilePlus,
  Plus,
  ExternalLink,
} from "lucide-react"
import type { Locale } from "@/lib/i18n/dictionary"

type NavItem = {
  href: string
  labelId: string
  labelEn: string
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
}

type ActionItem = {
  href: string
  labelId: string
  labelEn: string
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
}

const navItems: NavItem[] = [
  { href: "/dashboard", labelId: "Dasbor", labelEn: "Dashboard", icon: LayoutDashboard, shortcut: "G D" },
  { href: "/documents", labelId: "Dokumen", labelEn: "Documents", icon: FileText, shortcut: "G O" },
  { href: "/applications", labelId: "Lamaran", labelEn: "Applications", icon: Briefcase, shortcut: "G A" },
  { href: "/interview", labelId: "Wawancara", labelEn: "Interview", icon: MessageSquare, shortcut: "G I" },
  { href: "/english", labelId: "Bahasa Inggris", labelEn: "English Practice", icon: GraduationCap, shortcut: "G E" },
  { href: "/profile", labelId: "Profil", labelEn: "Profile", icon: User, shortcut: "G P" },
  { href: "/settings", labelId: "Pengaturan", labelEn: "Settings", icon: Settings, shortcut: "G S" },
]

const actionItems: ActionItem[] = [
  { href: "/documents/cv-ats/new", labelId: "Buat CV ATS baru", labelEn: "Create new ATS CV", icon: FilePlus },
  { href: "/documents/cover-letter/new", labelId: "Buat Cover Letter baru", labelEn: "Create new Cover Letter", icon: FilePlus },
  { href: "/documents/cv-visual/new", labelId: "Buat CV Visual baru", labelEn: "Create new Visual CV", icon: FilePlus },
  { href: "/documents/bio/new", labelId: "Buat Bio baru", labelEn: "Create new Bio", icon: FilePlus },
  { href: "/documents/essay/new", labelId: "Buat Essay baru", labelEn: "Create new Essay", icon: FilePlus },
  { href: "/documents/deck/new", labelId: "Buat Deck baru", labelEn: "Create new Deck", icon: FilePlus },
  { href: "/interview", labelId: "Mulai latihan wawancara", labelEn: "Start interview practice", icon: Plus },
  { href: "/english", labelId: "Mulai latihan English", labelEn: "Start English practice", icon: Plus },
]

export function CommandPalette({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isID = locale === "id"

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={isID ? "Palet Perintah" : "Command Palette"}
        description={isID ? "Cari perintah atau navigasi..." : "Search a command or navigate..."}
      >
        <CommandInput
          placeholder={isID ? "Ketik perintah atau cari..." : "Type a command or search..."}
        />
        <CommandList>
          <CommandEmpty>
            {isID ? "Tidak ada hasil." : "No results found."}
          </CommandEmpty>

          <CommandGroup heading={isID ? "Navigasi" : "Navigation"}>
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <CommandItem
                  key={item.href}
                  value={`${item.labelId} ${item.labelEn} ${item.href}`}
                  onSelect={() => runCommand(item.href)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{isID ? item.labelId : item.labelEn}</span>
                  {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                </CommandItem>
              )
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={isID ? "Aksi Cepat" : "Quick Actions"}>
            {actionItems.map((item) => {
              const Icon = item.icon
              return (
                <CommandItem
                  key={item.href}
                  value={`${item.labelId} ${item.labelEn} ${item.href}`}
                  onSelect={() => runCommand(item.href)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{isID ? item.labelId : item.labelEn}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={isID ? "Bantuan" : "Help"}>
            <CommandItem
              value={isID ? "bantuan tips pintasan keyboard" : "help tips keyboard shortcuts"}
              onSelect={() => {
                setOpen(false)
                window.open(
                  isID
                    ? "https://github.com/algojogacor/laras#keyboard-shortcuts"
                    : "https://github.com/algojogacor/laras#keyboard-shortcuts",
                  "_blank",
                )
              }}
            >
              <ExternalLink className="h-4 w-4" />
              <span>{isID ? "Tips Pintasan Keyboard" : "Keyboard Shortcuts Tips"}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Hidden hint button for discoverability — visible on focus only */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sr-only focus:not-sr-only focus:fixed focus:bottom-4 focus:right-4 focus:z-50 focus:rounded-lg focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg focus:border focus:border-border"
        aria-label={isID ? "Buka palet perintah (Cmd+K)" : "Open command palette (Cmd+K)"}
      >
        {isID ? "Palet Perintah" : "Command Palette"} (⌘K)
      </button>
    </>
  )
}
