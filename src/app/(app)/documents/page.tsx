import Link from "next/link"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { getEntitlement, hasFeature } from "@/lib/entitlement"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, ArrowRight, FileStack, Mail, Quote, PenLine, Palette, Presentation } from "lucide-react"
import { DocumentsTypePicker } from "@/components/documents/type-picker"

const TYPE_HREF: Record<string, string> = {
  "cv-ats": "/documents/cv-ats",
  "cv-visual": "/documents/cv-visual",
  "cover-letter": "/documents/cover-letter",
  bio: "/documents/bio",
  essay: "/documents/essay",
  deck: "/documents/deck",
}

const TYPE_ICON: Record<string, typeof FileText> = {
  "cv-ats": FileText,
  "cv-visual": Palette,
  "cover-letter": Mail,
  bio: Quote,
  essay: PenLine,
  deck: Presentation,
}

export default async function DocumentsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true },
  })
  if (!profile) redirect("/onboarding")

  const { t } = await getLocaleAndDict()

  // Entitlement: which document types are locked for this user? (Brief §9.4)
  const entitlement = await getEntitlement(profile)
  const lockedTypes: string[] = []
  if (!hasFeature(entitlement, "documents.visual_cv")) lockedTypes.push("cv-visual")

  const documents = await db.document.findMany({
    where: { userProfileId: profile.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, type: true, title: true, version: true, updatedAt: true, config: true },
  })

  return (
    <div className="space-y-8 animate-rise">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{t.documents.title}</h1>
          <p className="mt-1.5 text-muted-foreground">{t.documents.subtitle}</p>
        </div>
        <DocumentsTypePicker lockedTypes={lockedTypes} />
      </div>

      {documents.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <FileStack className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">{t.documents.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((d) => {
            const config = d.config ? JSON.parse(d.config) : {}
            const base = TYPE_HREF[d.type] || "/documents/cv-ats"
            const Icon = TYPE_ICON[d.type] || FileText
            return (
              <Card key={d.id} className="group shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {t.documents.types[d.type as keyof typeof t.documents.types] ?? d.type}
                    </Badge>
                  </div>
                  <h3 className="mt-3 font-serif text-base font-semibold leading-snug">{d.title}</h3>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{t.documents.version} {d.version}</span>
                    <span>·</span>
                    <span>{new Date(d.updatedAt).toLocaleDateString()}</span>
                  </div>
                  {typeof config.concreteness === "number" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t.documents.concretenessScore}: <span className="font-semibold text-foreground">{config.concreteness}%</span>
                    </p>
                  )}
                  <Button asChild variant="ghost" size="sm" className="mt-3 -ml-2 text-primary hover:bg-primary/5">
                    <Link href={`${base}/${d.id}`}>
                      {t.documents.preview}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
