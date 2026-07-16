"use client"

import { useState, useEffect } from "react"
import { Loader2, Sparkles, Send, History, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useT } from "@/components/providers/locale-provider"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"

type Version = {
  id: string
  versionNumber: number
  revisionInstruction: string | null
  createdAt: string
}

/**
 * Reusable follow-up revision panel (Brief Task 2).
 * Lets users instruct changes: "shorten", "more formal", "add X", etc.
 * Creates a new version (never overwrites), shows version history.
 * Fetches version history from API automatically.
 */
export function FollowUpRevisionPanel({
  documentId,
  documentType,
  versions: initialVersions = [],
  onRevised,
}: {
  documentId: string
  documentType: string
  versions?: Version[]
  onRevised?: (newContent: any, newVersionId: string) => void
}) {
  const t = useT()
  const [instruction, setInstruction] = useState("")
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [versions, setVersions] = useState<Version[]>(initialVersions)

  // Fetch version history from API
  useEffect(() => {
    apiClient(`/api/documents/${documentId}/versions`)
      .then((r) => r.json())
      .then((data) => {
        if (data.versions) setVersions(data.versions)
      })
      .catch(() => {})
  }, [documentId])

  // Restore an old version (loads its content as the current document content)
  async function restoreVersion(versionId: string, versionNumber: number) {
    if (!confirm(`Restore version ${versionNumber}? This will create a new version with the old content.`)) return
    setLoading(true)
    try {
      const res = await apiClient(`/api/documents/${documentId}/revise`, {
        method: "POST",
        body: JSON.stringify({
          instruction: `Restore to version ${versionNumber}`,
          documentType,
          restoreVersionId: versionId,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error("Restore failed"); return }
      toast.success(`Restored to v${versionNumber} → new v${data.versionNumber}`)
      if (onRevised) onRevised(data.content, data.versionId)
    } catch { toast.error("Restore failed") }
    finally { setLoading(false) }
  }

  const quickActions = [
    { label: "Shorten", instruction: "pendekkan / shorten this output" },
    { label: "More formal", instruction: "buat lebih formal / make more formal" },
    { label: "More natural", instruction: "buat lebih natural, kurangi kesan AI / make more natural, less AI-sounding" },
    { label: "More ATS-safe", instruction: "make more ATS-friendly" },
    { label: "Add numbers", instruction: "tambahkan angka/metrik dari context_notes / add numbers from context_notes" },
    { label: "EN", instruction: "ubah jadi bahasa Inggris / change to English" },
    { label: "ID", instruction: "ubah jadi bahasa Indonesia / change to Indonesian" },
  ]

  async function revise(instr?: string) {
    const finalInstruction = instr || instruction
    if (!finalInstruction.trim()) {
      toast.error("Please enter a revision instruction")
      return
    }
    setLoading(true)
    try {
      const res = await apiClient(`/api/documents/${documentId}/revise`, {
        method: "POST",
        body: JSON.stringify({ instruction: finalInstruction, documentType }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Revision failed")
        return
      }
      toast.success(`Revision completed — v${data.versionNumber}`)
      setInstruction("")
      if (onRevised) onRevised(data.content, data.versionId)
    } catch {
      toast.error("Revision failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Follow-up Revision
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-1.5">
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              onClick={() => revise(qa.instruction)}
              disabled={loading}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {qa.label}
            </button>
          ))}
        </div>

        {/* Custom instruction */}
        <div className="space-y-2">
          <Textarea
            rows={2}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g. 'make it more persuasive for a scholarship application' or 'add my volunteer experience'"
            disabled={loading}
          />
          <Button
            onClick={() => revise()}
            disabled={loading || !instruction.trim()}
            size="sm"
            className="w-full shadow-soft"
          >
            {loading ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Revising...</>
            ) : (
              <><Send className="mr-1.5 h-3.5 w-3.5" />Revise</>
            )}
          </Button>
        </div>

        {/* Version history */}
        {versions.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <History className="h-3 w-3" />
              Version history ({versions.length})
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1.5">
                {versions.map((v, idx) => (
                  <div key={v.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs">
                    <Badge variant="secondary" className="text-[10px]">v{v.versionNumber}</Badge>
                    <span className="flex-1 truncate text-muted-foreground">
                      {v.revisionInstruction || "Initial generation"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </span>
                    {idx > 0 && (
                      <button
                        onClick={() => restoreVersion(v.id, v.versionNumber)}
                        disabled={loading}
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/10 disabled:opacity-50"
                        title="Restore this version"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
