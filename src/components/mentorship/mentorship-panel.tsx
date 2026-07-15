"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { GraduationCap, Clock, Loader2 } from "lucide-react"

interface MentorData {
  id: string
  userProfileId: string
  mentorTopics: string[] | null
  bio: string | null
  availability: string | null
  fullName: string | null
  headline: string | null
  photoUrl: string | null
}

interface MentorshipPanelProps {
  initialMentors: MentorData[]
  myProfile: {
    isMentor: boolean
    isMentee: boolean
    mentorTopics: string[] | null
    menteeGoals: { goal: string; timeline?: string }[] | null
    bio: string | null
    availability: string | null
  } | null
  incomingRequests: any[]
  outgoingRequests: any[]
  labels: Record<string, string>
}

export function MentorshipPanel({
  initialMentors,
  myProfile,
  incomingRequests,
  outgoingRequests,
  labels,
}: MentorshipPanelProps) {
  const [search, setSearch] = useState("")
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showRequestDialog, setShowRequestDialog] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Profile fields
  const [isMentor, setIsMentor] = useState(myProfile?.isMentor ?? false)
  const [isMentee, setIsMentee] = useState(myProfile?.isMentee ?? false)
  const [topics, setTopics] = useState(myProfile?.mentorTopics?.join(", ") ?? "")
  const [bio, setBio] = useState(myProfile?.bio ?? "")
  const [availability, setAvailability] = useState(myProfile?.availability ?? "")

  async function handleSaveProfile() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/mentorship/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isMentor,
          isMentee,
          mentorTopics: topics ? topics.split(",").map((t) => t.trim()).filter(Boolean) : null,
          bio: bio.trim() || null,
          availability: availability || null,
        }),
      })
      if (res.ok) {
        setShowProfileDialog(false)
        setSuccess(labels.profileUpdated || "Profile updated")
      } else {
        setError(labels.error || "Error")
      }
    } catch {
      setError(labels.error || "Error")
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestMentorship(mentorId: string) {
    if (!message.trim()) {
      setError("Please write an introduction message.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/mentorship/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorId, message: message.trim() }),
      })
      if (res.ok) {
        setShowRequestDialog(null)
        setMessage("")
        setSuccess(labels.requestSent || "Request sent")
      } else {
        setError(labels.requestError || "Failed")
      }
    } catch {
      setError(labels.error || "Error")
    } finally {
      setLoading(false)
    }
  }

  async function handleAccept(requestId: string) {
    try {
      const res = await fetch(`/api/mentorship/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      })
      if (res.ok) {
        window.location.reload()
      }
    } catch {
      setError(labels.error || "Error")
    }
  }

  async function handleDecline(requestId: string) {
    try {
      const res = await fetch(`/api/mentorship/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      })
      if (res.ok) {
        window.location.reload()
      }
    } catch {
      setError(labels.error || "Error")
    }
  }

  const filtered = initialMentors.filter((m) => {
    if (!search.trim()) return true
    const s = search.trim().toLowerCase()
    return (
      (m.fullName?.toLowerCase().includes(s)) ||
      (m.headline?.toLowerCase().includes(s)) ||
      (m.bio?.toLowerCase().includes(s)) ||
      (m.mentorTopics?.some((t) => t.toLowerCase().includes(s)))
    )
  })

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif text-lg">
            <GraduationCap className="mr-2 inline h-5 w-5" />
            {labels.profile || "Mentorship Profile"}
          </CardTitle>
          <Button size="sm" onClick={() => setShowProfileDialog(true)}>
            {myProfile ? "Edit" : "Setup"}
          </Button>
        </CardHeader>
        <CardContent>
          {!myProfile ? (
            <p className="text-sm text-muted-foreground">
              Set up your mentorship profile to discover mentors or offer guidance.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                {myProfile.isMentor && <Badge>{labels.isMentor || "Mentor"}</Badge>}
                {myProfile.isMentee && <Badge variant="secondary">{labels.isMentee || "Mentee"}</Badge>}
              </div>
              {myProfile.mentorTopics && myProfile.mentorTopics.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {myProfile.mentorTopics.map((t, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              )}
              {myProfile.bio && <p className="text-sm text-muted-foreground">{myProfile.bio}</p>}
              {myProfile.availability && (
                <p className="text-xs text-muted-foreground">
                  <Clock className="mr-1 inline h-3 w-3" />
                  {myProfile.availability}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {success && <p className="text-sm text-green-600">{success}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-serif text-lg">{labels.incoming || "Incoming Requests"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomingRequests.map((req) => (
              <div key={req.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">
                  {req.menteeName || "Anonymous"} wants mentorship
                </p>
                {req.message && (
                  <p className="mt-1 text-xs text-muted-foreground">{req.message}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => handleAccept(req.id)}>
                    {labels.accept || "Accept"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDecline(req.id)}>
                    {labels.decline || "Decline"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Outgoing Requests */}
      {outgoingRequests.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-serif text-lg">{labels.outgoing || "Sent Requests"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {outgoingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{req.mentorName || "Unknown"}</p>
                  <Badge variant="outline" className="text-xs">
                    {req.status === "pending" ? (labels.pending || "Pending") :
                     req.status === "accepted" ? (labels.accepted || "Accepted") :
                     (labels.declined || "Declined")}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search & Discover */}
      <div>
        <h2 className="mb-3 font-serif text-xl font-semibold">{labels.discover || "Discover Mentors"}</h2>
        <Input
          placeholder={labels.searchMentors || "Search mentors..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 max-w-sm"
        />
      </div>

      {/* Mentor List */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="col-span-full py-8 text-center">
            <GraduationCap className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">{labels.noMentors || "No mentors found."}</p>
          </div>
        ) : (
          filtered.map((mentor) => (
            <Card key={mentor.id} className="shadow-soft">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {mentor.fullName?.charAt(0) || "?"}
                    </div>
                    <div>
                      <CardTitle className="font-serif text-base">
                        {mentor.fullName || "Anonymous"}
                      </CardTitle>
                      {mentor.headline && (
                        <p className="text-xs text-muted-foreground">{mentor.headline}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {mentor.mentorTopics && mentor.mentorTopics.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {mentor.mentorTopics.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
                {mentor.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{mentor.bio}</p>
                )}
                {mentor.availability && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {mentor.availability}
                  </p>
                )}
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setShowRequestDialog(mentor.userProfileId)
                    setMessage("")
                  }}
                >
                  {labels.requestMentorship || "Request Mentorship"}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{labels.profile || "Mentorship Profile"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isMentor}
                  onChange={(e) => setIsMentor(e.target.checked)}
                  className="rounded"
                />
                {labels.isMentor || "I am a mentor"}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isMentee}
                  onChange={(e) => setIsMentee(e.target.checked)}
                  className="rounded"
                />
                {labels.isMentee || "I am a mentee"}
              </label>
            </div>
            <div>
              <label className="text-sm font-medium">{labels.topics || "Topics"}</label>
              <Input
                placeholder={labels.topicsPlaceholder || "e.g. career, technical, leadership..."}
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{labels.bio || "Bio"}</label>
              <Input
                placeholder={labels.bioPlaceholder || "Tell about yourself..."}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{labels.availability || "Availability"}</label>
              <Select value={availability} onValueChange={setAvailability}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{labels.availabilityWeekly || "Weekly"}</SelectItem>
                  <SelectItem value="biweekly">{labels.availabilityBiweekly || "Biweekly"}</SelectItem>
                  <SelectItem value="monthly">{labels.availabilityMonthly || "Monthly"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={loading}>
              {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {labels.save || "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Mentorship Dialog */}
      <Dialog open={!!showRequestDialog} onOpenChange={() => setShowRequestDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.requestMentorship || "Request Mentorship"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{labels.message || "Message"}</label>
              <Input
                placeholder={labels.messagePlaceholder || "Introduce yourself..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => showRequestDialog && handleRequestMentorship(showRequestDialog)}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {labels.send || "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
