"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { FileText, ClipboardList, Users, Briefcase, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export interface StatCardData {
  key: string
  label: string
  value: number
  href: string
}

interface QuickStatsProps {
  stats: StatCardData[]
}

const DEFAULT_ICONS: Record<string, LucideIcon> = {
  documents: FileText,
  applications: ClipboardList,
  connections: Users,
  opportunities: Briefcase,
}

export function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="list" aria-label="Quick statistics">
      {stats.map((stat, i) => {
        const Icon = DEFAULT_ICONS[stat.key] ?? FileText
        return (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.06 * i }}
            role="listitem"
          >
            <Link href={stat.href} className="group block h-full">
              <Card className="h-full shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif text-2xl font-semibold leading-none tabular-nums">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}
