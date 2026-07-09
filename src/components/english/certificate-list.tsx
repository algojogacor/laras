"use client"

import Link from "next/link"
import { Award, ArrowRight, Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Locale } from "@/lib/i18n/dictionary"

type Cert = {
  id: string; certificateId: string; title: string; testMode: string
  percentage: number; estimatedCEFR: string | null; estimatedTOEFL: string | null
  confidence: string; issuedAt: string
}

export function CertificateList({ certificates, userName, locale }: { certificates: Cert[]; userName: string; locale: Locale }) {
  return (
    <div className="space-y-6 animate-rise">
      <div>
        <Link href="/english" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          ← Back to English Practice
        </Link>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Practice Certificates</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Non-official practice score certificates. Not valid as official TOEFL/IELTS scores.</p>
      </div>

      {/* Disclaimer banner */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
        <p className="text-xs text-amber-800 dark:text-amber-400">
          <strong>Disclaimer:</strong> Bukan sertifikat resmi TOEFL/IELTS. Skor ini adalah estimasi hasil latihan di platform Laras dan tidak dapat menggantikan skor resmi dari ETS, IELTS, British Council, IDP, Cambridge, atau lembaga penguji resmi lainnya.
        </p>
      </div>

      {certificates.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Award className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">No certificates yet. Complete a practice test to earn one.</p>
            <Button asChild className="mt-5 shadow-soft" size="sm">
              <Link href="/english">Start practicing</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {certificates.map((c) => (
            <Card key={c.id} className="group shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Award className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase">{c.testMode}</Badge>
                </div>
                <h3 className="mt-3 font-serif text-base font-semibold">{c.title}</h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <Trophy className="h-4 w-4 text-accent" />
                  <span className="font-serif text-2xl font-semibold">{c.percentage}%</span>
                  <span className="text-xs text-muted-foreground">practice estimate</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.estimatedCEFR && <Badge variant="outline" className="text-[10px]">CEFR: {c.estimatedCEFR}</Badge>}
                  {c.estimatedTOEFL && <Badge variant="outline" className="text-[10px]">TOEFL: {c.estimatedTOEFL}</Badge>}
                  <Badge variant="outline" className="text-[10px] capitalize">{c.confidence} confidence</Badge>
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">ID: {c.certificateId}</p>
                <p className="text-[10px] text-muted-foreground">Issued: {new Date(c.issuedAt).toLocaleDateString()}</p>
                <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2 text-primary hover:bg-primary/5">
                  <Link href={`/english/certificates/${c.id}`}>
                    View certificate
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
