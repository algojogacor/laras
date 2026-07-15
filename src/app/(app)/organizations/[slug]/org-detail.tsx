"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Building2,
  Users,
  Globe,
  ShieldCheck,
  Clock,
  Settings,
  UserPlus,
  Trash2,
  Shield,
  ShieldAlert,
  Loader2,
  AlertCircle,
  MoreHorizontal,
  Edit,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OrgData {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  website: string | null
  type: string
  verificationStatus: string
  verifiedAt: string | null
  createdAt: string
  updatedAt: string
  memberCount: number
}

interface MemberData {
  id: string
  role: string
  joinedAt: string
  userProfile: {
    id: string
    fullName: string | null
    headline: string | null
    photoUrl: string | null
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TYPE_LABELS: Record<string, string> = {
  institution: "Institution",
  company: "Company",
  community: "Community",
  government: "Government",
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  member: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
}

const VERIFICATION_BADGES: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  verified: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", label: "Verified", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  pending: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", label: "Pending Verification", icon: <Clock className="h-3.5 w-3.5" /> },
  rejected: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", label: "Rejected", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  unverified: { color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", label: "Unverified", icon: <Shield className="h-3.5 w-3.5" /> },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface Props {
  organization: OrgData
  currentUserRole: string | null
  currentUserId: string
  members: MemberData[]
}

export function OrganizationDetail({ organization, currentUserRole, currentUserId, members }: Props) {
  const router = useRouter()
  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin"
  const isOwner = currentUserRole === "owner"

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(organization.name)
  const [editDescription, setEditDescription] = useState(organization.description ?? "")
  const [editWebsite, setEditWebsite] = useState(organization.website ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false)
  const [addUserId, setAddUserId] = useState("")
  const [addRole, setAddRole] = useState("member")
  const [addingMember, setAddingMember] = useState(false)

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/organizations/${organization.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          website: editWebsite.trim() || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || "Failed to save")
        return
      }
      setEditing(false)
      router.refresh()
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setAddingMember(true)
    try {
      const res = await fetch(`/api/organizations/${organization.slug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userProfileId: addUserId, role: addRole }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error === "not-found" ? "User profile not found" : d.error || "Failed to add member")
        return
      }
      setAddUserId("")
      setShowAddMember(false)
      router.refresh()
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setAddingMember(false)
    }
  }

  async function handleRemoveMember(userProfileId: string) {
    if (!confirm("Remove this member from the organization?")) return
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${organization.slug}/members?userId=${encodeURIComponent(userProfileId)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || "Failed to remove member")
        return
      }
      router.refresh()
    } catch {
      setError("An unexpected error occurred")
    }
  }

  async function handleRoleChange(userProfileId: string, newRole: string) {
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${organization.slug}/members/${userProfileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || "Failed to change role")
        return
      }
      router.refresh()
    } catch {
      setError("An unexpected error occurred")
    }
  }

  async function handleRequestVerification() {
    setError(null)
    try {
      // Verification is requested via PATCH on the org endpoint (handled by service if needed)
      // For now use a simple fetch; the actual endpoint logic is in the org detail route
      const res = await fetch(`/api/organizations/${organization.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || "Failed to update")
        return
      }
      router.refresh()
    } catch {
      setError("An unexpected error occurred")
    }
  }

  const verif = VERIFICATION_BADGES[organization.verificationStatus] ?? VERIFICATION_BADGES.unverified

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Organization header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                {editing ? (
                  <div className="space-y-3">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-lg font-bold h-auto py-1.5"
                      maxLength={200}
                    />
                  </div>
                ) : (
                  <CardTitle className="text-xl">{organization.name}</CardTitle>
                )}
                <CardDescription className="flex items-center gap-2 mt-1">
                  <span>@{organization.slug}</span>
                  <Badge className={verif.color} variant="outline">
                    {verif.icon}
                    <span className="ml-1">{verif.label}</span>
                  </Badge>
                  <Badge variant="outline">{TYPE_LABELS[organization.type] ?? organization.type}</Badge>
                </CardDescription>
              </div>
            </div>
            {isAdmin && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Brief description..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Website</label>
                <Input
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {organization.description ? (
                <p className="text-sm text-muted-foreground">{organization.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No description</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {organization.memberCount} member{organization.memberCount !== 1 ? "s" : ""}
                </span>
                {organization.website && (
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
              </div>
              {organization.verificationStatus === "verified" && organization.verifiedAt && (
                <p className="text-xs text-muted-foreground">
                  Verified on {new Date(organization.verifiedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Verification action */}
          {currentUserRole && (organization.verificationStatus === "unverified" || organization.verificationStatus === "rejected") && (
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={handleRequestVerification}>
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                Request Verification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members section */}
      {currentUserRole && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Members</CardTitle>
                <CardDescription>
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setShowAddMember(!showAddMember)}>
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Add Member
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Add member form */}
            {showAddMember && (
              <form onSubmit={handleAddMember} className="mb-4 p-4 border rounded-lg space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-medium">User Profile ID</label>
                    <Input
                      value={addUserId}
                      onChange={(e) => setAddUserId(e.target.value)}
                      placeholder="Paste user profile ID"
                      required
                      disabled={addingMember}
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <label className="text-xs font-medium">Role</label>
                    <Select value={addRole} onValueChange={setAddRole} disabled={addingMember}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        {isOwner && <SelectItem value="owner">Owner</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={addingMember || !addUserId}>
                    {addingMember && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Add
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddMember(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Member list */}
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {(member.userProfile.fullName ?? "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {member.userProfile.fullName ?? "Unknown User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Role badge or selector for admin */}
                    {isOwner && member.userProfile.id !== currentUserId ? (
                      <Select
                        value={member.role}
                        onValueChange={(role) => handleRoleChange(member.userProfile.id, role)}
                      >
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={ROLE_COLORS[member.role] ?? "bg-gray-100"} variant="outline">
                        {member.role}
                      </Badge>
                    )}

                    {/* Remove button */}
                    {isAdmin && member.userProfile.id !== currentUserId && member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveMember(member.userProfile.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {/* Self-leave button */}
                    {member.userProfile.id === currentUserId && member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveMember(currentUserId)}
                      >
                        Leave
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Non-member view */}
      {!currentUserRole && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Shield className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground text-center">
              You are not a member of this organization. Members can see the full member list and participate.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
