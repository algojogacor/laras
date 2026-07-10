"use client"

import Link from "next/link"
import {
  ArrowLeft,
  MapPin,
  Link as LinkIcon,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Wrench,
  Award,
  Languages as LanguagesIcon,
  ShieldCheck,
  UserPlus,
  Lock,
  Globe2,
  Users,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

type Visibility = "public" | "connections" | "private"

interface PublicProfileData {
  id: string
  fullName: string | null
  headline: string | null
  summary: string | null
  email: string | null
  phone: string | null
  location: string | null
  links: Record<string, string> | null
  photoUrl: string | null
  createdAt: string
  experiences: Array<{
    title: string
    organization: string
    startDate: string | null
    endDate: string | null
    current: boolean
    description: string | null
  }>
  educations: Array<{
    institution: string
    degree: string | null
    field: string | null
    startDate: string | null
    endDate: string | null
  }>
  skills: Array<{ name: string; category: string | null; proficiency: string | null }>
  certifications: Array<{ name: string; issuer: string | null }>
  languages: Array<{ language: string; level: string | null }>
  consent: Record<string, Visibility>
  /** Viewer relationship: 'owner' | 'connection' | 'public' */
  viewerRelation: "owner" | "connection" | "public"
  verifiedBadges: Array<{ type: string; status: string }>
}

interface PublicProfileLabels {
  title: string
  back: string
  connectToView: string
  privateField: string
  connectionsOnly: string
  editProfile: string
  headline: string
  summary: string
  experience: string
  education: string
  skills: string
  certifications: string
  languages: string
  location: string
  links: string
  noExperience: string
  noEducation: string
  noSkills: string
  connectButton: string
  verifiedBadges: string
  memberSince: string
}

function initials(name: string | null): string {
  if (!name) return "?"
  return name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("")
}

function isVisible(vis: Visibility | undefined, relation: "owner" | "connection" | "public"): boolean {
  if (relation === "owner") return true
  if (vis === "public") return true
  if (vis === "connections") return relation === "connection"
  return false
}

function LockedField({ label, vis, labels }: { label: string; vis: Visibility; labels: PublicProfileLabels }) {
  const Icon = vis === "private" ? Lock : Users
  const text = vis === "private" ? labels.privateField : labels.connectionsOnly
  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
      <span className="ml-auto text-[10px] uppercase tracking-wide">{text}</span>
    </div>
  )
}

export function PublicProfileView({
  profile,
  labels,
}: {
  profile: PublicProfileData
  labels: PublicProfileLabels
}) {
  const isOwner = profile.viewerRelation === "owner"
  const isConnection = profile.viewerRelation === "connection"
  const verifiedBadges = profile.verifiedBadges.filter((b) => b.status === "verified")

  return (
    <div className="space-y-6 animate-rise">
      {/* Back link */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href={isOwner ? "/profile" : "/connections"}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            {labels.back}
          </Link>
        </Button>
        {isOwner && (
          <Button asChild variant="outline" size="sm">
            <Link href="/profile">
              {labels.editProfile}
            </Link>
          </Button>
        )}
      </div>

      {/* Header card */}
      <Card className="overflow-hidden shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20 shrink-0">
              {profile.photoUrl ? null : (
                <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">
                  {initials(profile.fullName)}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
                {profile.fullName || "Unknown"}
              </h1>
              {profile.headline && (
                <p className="mt-1 text-muted-foreground">{profile.headline}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {isVisible(profile.consent.location, profile.viewerRelation) && profile.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {profile.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {labels.memberSince} {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
              {/* Verified badges */}
              {verifiedBadges.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {labels.verifiedBadges}:
                  </span>
                  {verifiedBadges.map((b) => (
                    <span
                      key={b.type}
                      className="inline-flex items-center gap-1 rounded-full bg-chart-2/15 px-2 py-0.5 text-[10px] font-medium text-chart-2"
                    >
                      <ShieldCheck className="h-2.5 w-2.5" />
                      {b.type}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Connect button for non-connections */}
            {!isOwner && !isConnection && (
              <Button asChild size="sm">
                <Link href="/connections">
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  {labels.connectButton}
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connect-to-view nudge for public viewers */}
      {profile.viewerRelation === "public" && (
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] p-3 text-center">
          <p className="text-sm text-muted-foreground">
            {labels.connectToView}
          </p>
        </div>
      )}

      {/* Summary */}
      {isVisible(profile.consent.summary, profile.viewerRelation) && profile.summary && (
        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{labels.summary}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-pretty">{profile.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Contact info (consent-gated) */}
      <Card className="shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(["email", "phone"] as const).map((field) => {
            const vis = profile.consent[field] as Visibility
            const value = profile[field]
            if (isVisible(vis, profile.viewerRelation)) {
              return value ? (
                <div key={field} className="flex items-center gap-2 text-sm">
                  {field === "email" ? <Mail className="h-3.5 w-3.5 text-muted-foreground" /> : <Phone className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span>{value}</span>
                </div>
              ) : null
            }
            return <LockedField key={field} label={field === "email" ? "Email" : "Phone"} vis={vis} labels={labels} />
          })}
          {isVisible(profile.consent.links, profile.viewerRelation) && profile.links && Object.keys(profile.links).length > 0 && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {Object.entries(profile.links).map(([key, url]) =>
                url ? (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <LinkIcon className="h-3 w-3" />
                    {key}
                  </a>
                ) : null
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Experience */}
      <ConsentSection
        title={labels.experience}
        icon={Briefcase}
        visible={isVisible(profile.consent.experiences, profile.viewerRelation)}
        labels={labels}
        vis={profile.consent.experiences as Visibility}
        labelKey="experiences"
      >
        {profile.experiences.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{labels.noExperience}</p>
        ) : (
          <ul className="space-y-3">
            {profile.experiences.map((exp, i) => (
              <li key={i} className="rounded-lg border border-border bg-card/50 p-3">
                <p className="font-medium">{exp.title}</p>
                <p className="text-sm text-muted-foreground">{exp.organization}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {exp.startDate}{exp.current ? " — Present" : exp.endDate ? ` — ${exp.endDate}` : ""}
                </p>
                {exp.description && <p className="mt-1.5 text-sm text-pretty">{exp.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </ConsentSection>

      {/* Education */}
      <ConsentSection
        title={labels.education}
        icon={GraduationCap}
        visible={isVisible(profile.consent.education, profile.viewerRelation)}
        labels={labels}
        vis={profile.consent.education as Visibility}
        labelKey="education"
      >
        {profile.educations.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{labels.noEducation}</p>
        ) : (
          <ul className="space-y-2">
            {profile.educations.map((edu, i) => (
              <li key={i} className="rounded-lg border border-border bg-card/50 p-3">
                <p className="font-medium">{edu.institution}</p>
                <p className="text-sm text-muted-foreground">{edu.degree}{edu.field ? ` · ${edu.field}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </ConsentSection>

      {/* Skills */}
      <ConsentSection
        title={labels.skills}
        icon={Wrench}
        visible={isVisible(profile.consent.skills, profile.viewerRelation)}
        labels={labels}
        vis={profile.consent.skills as Visibility}
        labelKey="skills"
      >
        {profile.skills.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{labels.noSkills}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {s.name}
                {s.proficiency && <span className="ml-1 text-muted-foreground">· {s.proficiency}</span>}
              </Badge>
            ))}
          </div>
        )}
      </ConsentSection>

      {/* Certifications */}
      {profile.certifications.length > 0 && (
        <ConsentSection
          title={labels.certifications}
          icon={Award}
          visible={isVisible(profile.consent.certifications, profile.viewerRelation)}
          labels={labels}
          vis={profile.consent.certifications as Visibility}
          labelKey="certifications"
        >
          <ul className="space-y-2">
            {profile.certifications.map((c, i) => (
              <li key={i} className="rounded-lg border border-border bg-card/50 p-3">
                <p className="font-medium">{c.name}</p>
                {c.issuer && <p className="text-sm text-muted-foreground">{c.issuer}</p>}
              </li>
            ))}
          </ul>
        </ConsentSection>
      )}

      {/* Languages */}
      {profile.languages.length > 0 && (
        <ConsentSection
          title={labels.languages}
          icon={LanguagesIcon}
          visible={isVisible(profile.consent.languages, profile.viewerRelation)}
          labels={labels}
          vis={profile.consent.languages as Visibility}
          labelKey="languages"
        >
          <div className="flex flex-wrap gap-2">
            {profile.languages.map((l, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                {l.language}{l.level ? <span className="text-muted-foreground"> · {l.level}</span> : null}
              </span>
            ))}
          </div>
        </ConsentSection>
      )}
    </div>
  )
}

function ConsentSection({
  title,
  icon: Icon,
  visible,
  children,
  labels,
  vis,
  labelKey,
}: {
  title: string
  icon: typeof Briefcase
  visible: boolean
  children: React.ReactNode
  labels: PublicProfileLabels
  vis: Visibility
  labelKey: string
}) {
  return (
    <Card className="shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {visible ? (
          children
        ) : (
          <LockedField label={title} vis={vis} labels={labels} />
        )}
      </CardContent>
    </Card>
  )
}
