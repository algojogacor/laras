"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  FileText,
  ClipboardList,
  MessageSquareText,
  Headphones,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const ICONS: Record<string, LucideIcon> = {
  cv: FileText,
  app: ClipboardList,
  interview: MessageSquareText,
  english: Headphones,
}

export interface QuickAction {
  key: string
  title: string
  desc: string
  href: string
  accent: string // tailwind gradient classes
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((a, i) => {
        const Icon = ICONS[a.key] ?? FileText
        return (
          <motion.div
            key={a.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.06 * i }}
          >
            <Link href={a.href} className="group block h-full">
              <Card className="relative h-full overflow-hidden border-border/60 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift">
                {/* Gradient wash on hover */}
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                    a.accent
                  )}
                  aria-hidden
                />
                <CardContent className="relative flex h-full flex-col p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold leading-snug">
                    {a.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {a.desc}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
