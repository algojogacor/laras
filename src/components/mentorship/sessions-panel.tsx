"use client"

import { useState } from "react"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { CalendarClock, CheckCircle, Loader2 } from "lucide-react"

interface SessionData {
  id: string
  mentorId: string
  menteeId: string
  title: string | null
  notes: string | null
  scheduledAt: string | null
  completedAt: string | null
  feedback: any | null
  mentorName: string | null
  menteeName: string | null
}

interface SessionsPanelProps {
  sessions: SessionData[]
  profileId: string
  labels: Record<string, string>
}

export function SessionsPanel({
  sessions: initialSessions,
  profileId,
  labels,
}: SessionsPanelProps) {
  const [sessions, setSessions] = useState<SessionData[]>(initialSessions)
  const [showSchedule, setShowSchedule] = useState(false)
  const [title, setTitle] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // For the purpose of this demo, we'll use simple fixed mentor/mentee IDs
  async function handleSchedule() {
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    if (!scheduledAt) {
      setError("Date and time are required.")
      return
    }
    setLoading(true)
    setError("")

    // Find a session partner from existing sessions
    const partner = sessions.find(
      (s) => s.mentorId !== profileId || s.menteeId !== profileId
    )
    const mentorId = partner?.mentorId ?? profileId
    const menteeId = partner?.menteeId ?? profileId

    try {
      const res = await apiClient("/api/mentorship/sessions", {
        method: "POST",
        body: JSON.stringify({
          mentorId: mentorId === profileId ? profileId : mentorId,
          menteeId: menteeId === profileId ? profileId : menteeId,
          title: title.trim(),
          scheduledAt: new Date(scheduledAt).toISOString(),
          notes: notes.trim() || undefined,
        }),
      })
      if (res.ok) {
        setShowSchedule(false)
        setTitle("")
        setScheduledAt("")
        setNotes("")
        setSuccess(labels.scheduleSuccess || "Session scheduled")
        window.location.reload()
      } else {
        setError(labels.error || "Error")
      }
    } catch {
      setError(labels.error || "Error")
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete(sessionId: string) {
    // Simplified: just complete without feedback dialog for now
    try {
      const res = await apiClient(`/api/mentorship/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "complete" }),
      })
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, completedAt: new Date().toISOString() } : s
          )
        )
        setSuccess(labels.completeSuccess || "Completed")
      }
    } catch {
      setError(labels.error || "Error")
    }
  }

  const upcoming = sessions.filter((s) => !s.completedAt)
  const past = sessions.filter((s) => s.completedAt)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            {labels.sessions || "Mentorship Sessions"}
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            {labels.subtitle || "Schedule and manage mentorship sessions."}
          </p>
        </div>
        <Button onClick={() => setShowSchedule(true)}>
          <CalendarClock className="mr-1 h-4 w-4" />
          {labels.scheduleSession || "Schedule"}
        </Button>
      </div>

      {success && <p className="text-sm text-green-600">{success}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Upcoming Sessions */}
      {upcoming.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{session.title || "Untitled Session"}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.mentorName || "Mentor"} &middot; {session.menteeName || "Mentee"}
                  </p>
                  {session.scheduledAt && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.scheduledAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleComplete(session.id)}
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  {labels.complete || "Complete"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Past Sessions */}
      {past.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-serif text-lg">{labels.completed || "Completed"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {past.map((session) => (
              <div key={session.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{session.title || "Untitled Session"}</p>
                  <Badge variant="secondary">{labels.completed || "Completed"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {session.mentorName || "Mentor"} &middot; {session.menteeName || "Mentee"}
                </p>
                {session.feedback && (
                  <div className="mt-2 rounded bg-muted p-2">
                    <p className="text-xs text-muted-foreground">
                      {session.feedback.comments || "No feedback"}
                    </p>
                    {session.feedback.rating && (
                      <p className="text-xs font-medium">Rating: {session.feedback.rating}/5</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <Card className="shadow-soft">
          <CardContent className="flex min-h-[200px] items-center justify-center">
            <p className="text-muted-foreground">{labels.noSessions || "No sessions yet."}</p>
          </CardContent>
        </Card>
      )}

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.scheduleSession || "Schedule Session"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{labels.sessionTitle || "Title"}</label>
              <Input
                placeholder={labels.sessionTitlePlaceholder || "Session topic..."}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{labels.sessionDate || "Date & Time"}</label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{labels.sessionNotes || "Notes"}</label>
              <Input
                placeholder={labels.sessionNotesPlaceholder || "Agenda or notes..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSchedule(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedule} disabled={loading}>
              {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {labels.scheduleSession || "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
