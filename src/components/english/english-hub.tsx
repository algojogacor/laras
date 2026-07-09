"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, BookOpen, Braces, Headphones, Loader2, Check, X, RefreshCw, Trophy, Sparkles, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { useT } from "@/components/providers/locale-provider"
import type { Locale } from "@/lib/i18n/dictionary"
import type { GeneratedReading, GeneratedStructure, GeneratedListening } from "@/lib/content-engine"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Skeleton, QuestionsSkeleton } from "@/components/ui/skeleton-doc"
import { cn } from "@/lib/utils"

type HistoryItem = { id: string; module: string; score: number; createdAt: string }
type Phase = "hub" | "practice" | "results"

export function EnglishHub({ locale, history }: { locale: Locale; history: HistoryItem[] }) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>("hub")
  const [activeModule, setModule] = useState<"reading" | "structure" | "listening">("reading")
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [reading, setReading] = useState<GeneratedReading | null>(null)
  const [structure, setStructure] = useState<GeneratedStructure | null>(null)
  const [listening, setListening] = useState<(GeneratedListening & { audioUrl?: string | null }) | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [results, setResults] = useState<{ score: number; correct: number; total: number; results: any[] } | null>(null)

  async function start(m: "reading" | "structure" | "listening") {
    setModule(m); setPhase("practice"); setLoading(true)
    setReading(null); setStructure(null); setListening(null); setAnswers({}); setResults(null)
    try {
      const res = await fetch("/api/english/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: m, difficulty, locale }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(t.auth.errGeneric); setPhase("hub"); return }
      setSessionId(data.sessionId)
      if (m === "reading") setReading(data.data)
      else if (m === "structure") setStructure(data.data)
      else setListening(data.data)
    } catch { toast.error(t.auth.errGeneric); setPhase("hub") }
    finally { setLoading(false) }
  }

  async function submit() {
    if (!sessionId) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/english/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(t.auth.errGeneric); return }
      setResults(data); setPhase("results")
    } catch { toast.error(t.auth.errGeneric) }
    finally { setSubmitting(false) }
  }

  function reset() {
    setPhase("hub"); setReading(null); setStructure(null); setAnswers({}); setResults(null); setSessionId(null)
  }

  // ── HUB ──
  if (phase === "hub") {
    const modules = [
      { value: "reading", Icon: BookOpen, title: t.english.reading, desc: t.english.subtitle, active: true },
      { value: "structure", Icon: Braces, title: t.english.structure, desc: t.english.subtitle, active: true },
      { value: "listening", Icon: Headphones, title: t.english.listening, desc: t.english.subtitle, active: true },
    ] as const

    return (
      <div className="space-y-8 animate-rise">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{t.english.title}</h1>
          <p className="mt-1.5 max-w-2xl text-muted-foreground text-pretty">{t.english.subtitle}</p>
        </div>

        {/* Difficulty selector */}
        <Card className="shadow-soft">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-muted-foreground">{t.english.difficulty}</span>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                    difficulty === d ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {t.english[d]}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Modules */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const Icon = m.Icon
            return (
              <Card key={m.value} className={cn("group shadow-soft transition-all", m.active && "hover:-translate-y-0.5 hover:shadow-lift")}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    {!m.active && <Badge variant="secondary" className="text-[10px] uppercase">{t.english.listeningSoon}</Badge>}
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-semibold">{m.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">{m.desc}</p>
                  {m.active && (
                    <Button onClick={() => start(m.value as "reading" | "structure")} size="sm" className="mt-4 shadow-soft">
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />{t.english.startPractice}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* History */}
        <section>
          <h2 className="font-serif text-xl font-semibold">{t.english.history}</h2>
          {history.length === 0 ? (
            <Card className="mt-4 shadow-soft"><CardContent className="py-10 text-center text-sm text-muted-foreground">{t.english.noHistory}</CardContent></Card>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {history.map((h) => (
                <Card key={h.id} className="shadow-soft">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px] uppercase">{h.module}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="mt-2 flex items-baseline gap-1.5">
                      <Trophy className="h-4 w-4 text-accent" />
                      <span className="font-serif text-2xl font-semibold">{h.score}</span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  // ── PRACTICE ──
  if (phase === "practice") {
    const questions = activeModule === "reading" ? reading?.questions ?? [] : activeModule === "structure" ? structure?.questions ?? [] : listening?.questions ?? []
    return (
      <div className="space-y-6 animate-rise">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={reset} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />{t.english.backToModules}
          </button>
          <Badge variant="secondary" className="text-xs">{t.english[activeModule]} · {t.english[difficulty]}</Badge>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Card className="shadow-soft"><CardContent className="flex items-center gap-3 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{t.english.generating}</span>
            </CardContent></Card>
            {activeModule === "listening" ? (
              <Card className="shadow-soft"><CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-20 w-full" />
              </CardContent></Card>
            ) : activeModule === "reading" ? (
              <Card className="shadow-soft"><CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-95%" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-90%" />
                <Skeleton className="h-3 w-full" />
              </CardContent></Card>
            ) : null}
            <QuestionsSkeleton count={4} />
          </div>
        ) : questions.length === 0 ? (
          <Card className="shadow-soft"><CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">{t.english.noHistory}</p>
            <Button onClick={() => start(activeModule)} className="mt-4 shadow-soft" size="sm"><RefreshCw className="mr-1.5 h-3.5 w-3.5" />{t.english.newSet}</Button>
          </CardContent></Card>
        ) : (
          <>
            {/* Reading passage */}
            {activeModule === "reading" && reading && (
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{reading.title}</CardTitle>
                  <CardDescription className="capitalize">{reading.topic} · {reading.difficulty}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-border bg-muted/20 p-4 text-sm leading-relaxed scrollbar-laras">
                    {reading.passage.split("\n").map((p, i) => <p key={i} className="mb-3">{p}</p>)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Listening audio player */}
            {activeModule === "listening" && listening && (
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="font-serif text-lg">{listening.title}</CardTitle>
                  <CardDescription>{listening.speaker} · {listening.difficulty}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {listening.audioUrl ? (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                        <Headphones className="h-4 w-4" /> {t.english.passage}
                      </div>
                      <audio controls className="w-full">
                        <source src={listening.audioUrl} type="audio/wav" />
                      </audio>
                      <p className="mt-2 text-[11px] text-muted-foreground">{t.english.yourAnswerHint}</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
                      <p className="text-sm text-amber-700 dark:text-amber-400">Audio unavailable — showing script text instead.</p>
                      <div className="mt-2 max-h-[30vh] overflow-y-auto text-sm leading-relaxed scrollbar-laras">
                        {listening.script.split("\n").map((p, i) => <p key={i} className="mb-2">{p}</p>)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Questions */}
            <div className="space-y-4">
              {questions.map((q, i) => (
                <Card key={q.id} className="shadow-soft">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-snug">{q.question}</p>
                        {activeModule === "structure" && (q as any).type && (
                          <Badge variant="outline" className="mt-1 text-[10px] capitalize">{(q as any).type.replace("-", " ")}</Badge>
                        )}
                        <RadioGroup
                          value={String(answers[q.id] ?? "")}
                          onValueChange={(v) => setAnswers({ ...answers, [q.id]: Number(v) })}
                          className="mt-3 space-y-1.5"
                        >
                          {q.options.map((opt, j) => (
                            <label key={j} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-sm transition-colors", answers[q.id] === j ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}>
                              <RadioGroupItem value={String(j)} className="mt-0.5" />
                              <span className="flex-1">
                                <span className="mr-1.5 font-semibold text-muted-foreground">{String.fromCharCode(65 + j)}.</span>
                                {opt}
                              </span>
                            </label>
                          ))}
                        </RadioGroup>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{Object.keys(answers).length}/{questions.length}</span>
              <Button onClick={submit} disabled={submitting || Object.keys(answers).length < questions.length} className="shadow-soft" size="sm">
                {submitting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{t.english.submitting}</> : t.english.submitAnswers}
              </Button>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── RESULTS ──
  if (phase === "results" && results) {
    const questions = activeModule === "reading" ? reading?.questions ?? [] : activeModule === "structure" ? structure?.questions ?? [] : listening?.questions ?? []
    const verdictColor = results.score >= 80 ? "text-emerald-600" : results.score >= 50 ? "text-amber-600" : "text-red-600"
    return (
      <div className="space-y-6 animate-rise">
        <button onClick={reset} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />{t.english.backToModules}
        </button>

        {/* Score card */}
        <Card className="shadow-lift">
          <CardContent className="flex flex-col items-center py-10">
            <Trophy className="h-10 w-10 text-accent" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">{t.english.score}</p>
            <p className={cn("font-serif text-6xl font-semibold", verdictColor)}>{results.score}</p>
            <p className="mt-1 text-sm text-muted-foreground">{results.correct} {t.english.ofTotal} {results.total} {t.english.correct.toLowerCase()}</p>
          </CardContent>
        </Card>

        {/* Review */}
        <div className="space-y-4">
          {questions.map((q, i) => {
            const r = results.results.find((x) => x.id === q.id)
            const userAns = r?.userAnswer
            return (
              <Card key={q.id} className="shadow-soft">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", r?.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                      {r?.isCorrect ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-snug">{i + 1}. {q.question}</p>
                      <div className="mt-2 space-y-1 text-xs">
                        {q.options.map((opt, j) => {
                          const isCorrect = j === q.answer
                          const isUser = j === userAns
                          return (
                            <div key={j} className={cn(
                              "flex items-start gap-1.5 rounded px-2 py-1",
                              isCorrect && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
                              isUser && !isCorrect && "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
                              !isCorrect && !isUser && "text-muted-foreground"
                            )}>
                              <span className="font-semibold">{String.fromCharCode(65 + j)}.</span>
                              <span className="flex-1">{opt}</span>
                              {isCorrect && <Check className="h-3 w-3" />}
                              {isUser && !isCorrect && <X className="h-3 w-3" />}
                            </div>
                          )
                        })}
                      </div>
                      {q.explanation && (
                        <p className="mt-2 rounded bg-muted/40 p-2 text-xs text-muted-foreground">
                          <span className="font-medium">{t.english.explanation}: </span>{q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex justify-center gap-2">
          <Button onClick={() => start(activeModule)} variant="outline" size="sm">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />{t.english.nextPractice}
          </Button>
          <Button onClick={reset} size="sm" className="shadow-soft">
            {t.english.backToModules}<ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return null
}
