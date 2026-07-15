import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { db } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, MapPin, Clock, Building2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const TYPE_LABELS_ID: Record<string, string> = {
  job: "Pekerjaan", internship: "Magang", scholarship: "Beasiswa",
  fellowship: "Fellowship", competition: "Kompetisi", volunteer: "Volunteer",
  event: "Acara", odp: "ODP", bumn: "BUMN", cpns: "CPNS", other: "Lainnya",
}

const STATUS_COLORS: Record<string, string> = {
  saved: "bg-muted text-muted-foreground",
  applied: "bg-chart-1/15 text-chart-1",
  interviewing: "bg-chart-3/15 text-chart-3",
  offered: "bg-chart-2/15 text-chart-2",
  accepted: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
  archived: "bg-muted text-muted-foreground",
  expired: "bg-chart-4/15 text-chart-4",
}

export default async function OpportunitiesPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  const profile = await db.userProfile.findUnique({
    where: { accountId: session.userId },
    select: { id: true, onboardingComplete: true },
  })
  if (!profile) redirect("/onboarding")
  if (!profile.onboardingComplete) redirect("/onboarding")

  const { t, locale } = await getLocaleAndDict()
  const isId = locale === "id"

  const opportunities = await db.opportunity.findMany({
    where: { userProfileId: profile.id },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    take: 100,
  })

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            {isId ? "Kesempatan" : "Opportunities"}
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            {isId ? "Lacak dan kelola kesempatan kariermu" : "Track and manage your career opportunities"}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/opportunities/new">
            <Plus className="mr-1.5 h-4 w-4" />
            {isId ? "Tambah" : "Add"}
          </Link>
        </Button>
      </div>

      {opportunities.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {isId ? "Belum ada kesempatan tersimpan" : "No opportunities saved yet"}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/opportunities/new">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {isId ? "Simpan kesempatan pertama" : "Save your first opportunity"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opp) => (
            <Link key={opp.id} href={`/opportunities/${opp.id}`}>
              <Card className="group h-full shadow-soft transition-shadow hover:shadow-lift">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {isId ? TYPE_LABELS_ID[opp.type] ?? opp.type : opp.type}
                    </Badge>
                    {opp.matchScore != null && (
                      <span className={cn(
                        "text-xs font-medium tabular-nums",
                        opp.matchScore >= 70 ? "text-chart-2" : opp.matchScore >= 40 ? "text-chart-3" : "text-muted-foreground"
                      )}>
                        {opp.matchScore}%
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-serif text-base font-semibold group-hover:text-primary transition-colors line-clamp-2">
                    {opp.title}
                  </h3>
                  {opp.organization && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {opp.organization}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                    {opp.location && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" /> {opp.location}
                      </span>
                    )}
                    {opp.deadline && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" /> {new Date(opp.deadline).toLocaleDateString(isId ? "id-ID" : "en-US")}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_COLORS[opp.status] ?? STATUS_COLORS.saved)}>
                      {opp.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
