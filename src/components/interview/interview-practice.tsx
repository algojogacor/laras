"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { ArrowLeft, Loader2, Sparkles, Trash2, ChevronDown, ChevronUp, MessageSquareText } from "lucide-react"
import { toast } from "sonner"
import { useT } from "@/components/providers/locale-provider"
import type { Locale } from "@/lib/i18n/dictionary"
import type { AnswerFeedback } from "@/lib/content-engine"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Question = {
  id: string; question: string; category: string
  userAnswer: string | null; suggestedAnswer: string | null; feedback: AnswerFeedback | null; order: number
}

const CATEGORY_COLOR: Record<string, string> = {
  behavioral: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  technical: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  motivational: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  situational: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
}

export function InterviewPractice({
  setId, title, role, questions: initialQuestions, locale,
}: {
  setId: string; title: string; role: string | null; questions: Question[]; locale: Locale
}) {
  const t = useT()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [answers, setAnswers] = useState<Record<string, string>>(
    Object.fromEntries(initialQuestions.map((q) => [q.id, q.userAnswer || ""]))
  )
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function getFeedback(qId: string) {
    const answer = answers[qId] || ""
    if (!answer.trim()) { toast.error(t.interview.yourAnswerHint); return }
    setLoading((p) => ({ ...p, [qId]: true }))
    try {
      const res = await apiClient(`/api/interview-sets/${setId}/feedback`, {
        method: "POST",
        body: JSON.stringify({ questionId: qId, answer, locale }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(t.auth.errGeneric); return }
      setQuestions((prev) => prev.map((q) => q.id === qId ? { ...q, userAnswer: answer, feedback: data.feedback, suggestedAnswer: data.feedback.suggestedAnswer } : q))
      setExpanded((p) => ({ ...p, [qId]: true }))
      toast.success(t.interview.feedback)
    } catch { toast.error(t.auth.errGeneric) }
    finally { setLoading((p) => ({ ...p, [qId]: false })) }
  }

  async function deleteSet() {
    try {
      await apiClient(`/api/interview-sets/${setId}`, { method: "DELETE" })
      router.push("/interview"); router.refresh()
    } catch { toast.error(t.auth.errGeneric) }
  }

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <Link href="/interview" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />{t.interview.backToSets}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{title}</h1>
            {role && <p className="mt-1.5 text-muted-foreground">{role}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={deleteSet} className="border-destructive/40 text-destructive hover:bg-destructive/10">
            <Trash2 className="mr-1.5 h-4 w-4" />{t.common.delete}
          </Button>
        </div>
      </div>

      {questions.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquareText className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">{t.interview.noQuestions}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => {
            const isOpen = expanded[q.id] || !!q.feedback
            return (
              <Card key={q.id} className="shadow-soft">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{q.question}</p>
                        <Badge className={cn("shrink-0 text-[10px]", CATEGORY_COLOR[q.category] || "bg-muted text-muted-foreground")}>
                          {t.interview.category[q.category as keyof typeof t.interview.category] || q.category}
                        </Badge>
                      </div>

                      {q.feedback && (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <ScorePill label={t.interview.structureScore} value={q.feedback.structureScore} />
                          <ScorePill label={t.interview.specificityScore} value={q.feedback.specificityScore} />
                          <ScorePill label={t.interview.lengthScore} value={q.feedback.lengthScore} />
                          <ScorePill label={t.interview.overall} value={q.feedback.overall} highlight />
                        </div>
                      )}

                      <button
                        onClick={() => setExpanded((p) => ({ ...p, [q.id]: !isOpen }))}
                        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {isOpen ? "Tutup" : "Buka jawaban"}
                      </button>

                      {isOpen && (
                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t.interview.yourAnswer}</p>
                            <Textarea
                              rows={4}
                              value={answers[q.id] || ""}
                              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                              placeholder={t.interview.yourAnswerHint}
                            />
                            <Button
                              onClick={() => getFeedback(q.id)}
                              disabled={loading[q.id] || !(answers[q.id] || "").trim()}
                              size="sm"
                              className="mt-2 shadow-soft"
                            >
                              {loading[q.id] ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t.interview.gettingFeedback}</> : <><Sparkles className="mr-1.5 h-3.5 w-3.5" />{t.interview.getFeedback}</>}
                            </Button>
                          </div>

                          {q.feedback && (
                            <div className="space-y-3 rounded-lg border border-border bg-card p-3">
                              <div>
                                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t.interview.feedback}</p>
                                <ul className="space-y-1">
                                  {q.feedback.feedback.map((f, j) => (
                                    <li key={j} className="flex gap-1.5 text-xs text-foreground/80">
                                      <span className="text-accent">→</span>{f}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {q.suggestedAnswer && (
                                <div>
                                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t.interview.suggestedAnswer}</p>
                                  <p className="rounded bg-muted/50 p-2.5 text-xs leading-relaxed text-foreground/80">{q.suggestedAnswer}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ScorePill({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const color = value >= 70 ? "text-emerald-600" : value >= 40 ? "text-amber-600" : "text-red-600"
  return (
    <div className={cn("rounded-lg border p-2 text-center", highlight ? "border-primary/30 bg-primary/5" : "border-border")}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn("font-serif text-lg font-semibold", color)}>{value}</p>
    </div>
  )
}
