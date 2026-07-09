"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, FileText, Mail, Quote, PenLine, Palette, Presentation } from "lucide-react"
import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const TYPES = [
  { value: "cv-ats", href: "/documents/cv-ats/new", Icon: FileText },
  { value: "cv-visual", href: "/documents/cv-visual/new", Icon: Palette },
  { value: "cover-letter", href: "/documents/cover-letter/new", Icon: Mail },
  { value: "bio", href: "/documents/bio/new", Icon: Quote },
  { value: "essay", href: "/documents/essay/new", Icon: PenLine },
  { value: "deck", href: "/documents/deck/new", Icon: Presentation },
] as const

export function DocumentsTypePicker() {
  const t = useT()
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="shadow-soft">
          <Plus className="mr-1.5 h-4 w-4" />
          {t.documents.new}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{t.documents.chooseType}</DialogTitle>
          <DialogDescription>{t.documents.chooseTypeDesc}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          {TYPES.map(({ value, href, Icon }) => (
            <DialogClose asChild key={value}>
              <Link
                href={href}
                className={cn(
                  "group flex items-center gap-4 rounded-xl border border-border p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-serif text-base font-semibold">
                    {t.documents.types[value as keyof typeof t.documents.types]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {value === "cv-ats" && t.documents.cvAtsNewSubtitle}
                    {value === "cv-visual" && t.documents.subtitle}
                    {value === "cover-letter" && t.documents.clNewSubtitle}
                    {value === "bio" && t.documents.bioNewSubtitle}
                    {value === "essay" && t.documents.essayNewSubtitle}
                    {value === "deck" && t.documents.subtitle}
                  </p>
                </div>
              </Link>
            </DialogClose>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
