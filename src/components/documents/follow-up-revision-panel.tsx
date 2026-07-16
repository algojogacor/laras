"use client"

import Link from "next/link"
import { ArrowRight, History, Sparkles } from "lucide-react"
import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Version = { id: string; versionNumber: number; revisionInstruction: string | null; createdAt: string }

/**
 * Backward-compatible entry point for legacy viewers. All editing now opens the
 * proposal-first Artifact Studio so AI output cannot bypass preview/accept.
 */
export function FollowUpRevisionPanel({ documentId, versions = [] }: { documentId: string; documentType: string; versions?: Version[]; onRevised?: (newContent: unknown, newVersionId: string) => void }) {
  const t = useT().documents.studio
  return <Card className="shadow-soft">
    <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 font-serif text-base"><Sparkles className="h-4 w-4 text-primary" />{t.improve}</CardTitle></CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">{t.noOverwrite}</p>
      {versions.length > 0 && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><History className="h-3.5 w-3.5" />{t.history}: {versions.length}</p>}
      <Button asChild className="mt-4"><Link href={`/documents/${documentId}/studio`}>{t.title}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
    </CardContent>
  </Card>
}
