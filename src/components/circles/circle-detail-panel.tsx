"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { UsersRound, Star, MessageSquare, Loader2, ArrowLeft } from "lucide-react"

interface CircleData {
  id: string
  name: string
  description: string | null
  type: string
  createdById: string
  memberCount: number
  userRole: string | null
}

interface MemberData {
  id: string
  userProfileId: string
  role: string
  joinedAt: string
  fullName: string | null
  headline: string | null
  photoUrl: string | null
}

interface ReviewData {
  id: string
  requesterId: string
  reviewerId: string | null
  circleId: string
  prompt: string
  feedback: string | null
  rating: { clarity: number; specificity: number; actionability: number } | null
  status: string
  reviewerName: string | null
  requesterName: string | null
}

interface CircleDetailPanelProps {
  circle: CircleData
  members: MemberData[]
  reviews: ReviewData[]
  profileId: string
  labels: Record<string, string>
}

export function CircleDetailPanel({
  circle,
  members: initialMembers,
  reviews: initialReviews,
  profileId,
  labels,
}: CircleDetailPanelProps) {
  const router = useRouter()
  const [members, setMembers] = useState<MemberData[]>(initialMembers)
  const [reviews, setReviews] = useState<ReviewData[]>(initialReviews)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewPrompt, setReviewPrompt] = useState("")
  const [showSubmitReview, setShowSubmitReview] = useState<string | null>(null)
  const [feedback, setFeedback] = useState("")
  const [ratingClarity, setRatingClarity] = useState(3)
  const [ratingSpecificity, setRatingSpecificity] = useState(3)
  const [ratingActionability, setRatingActionability] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const isMember = circle.userRole !== null
  const isAdmin = circle.userRole === "admin"

  async function handleJoin() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/circles/${circle.id}/members`, {
        method: "POST",
      })
      if (res.ok) {
        // Refresh page
        router.refresh()
        setSuccess(labels.joinSuccess || "Joined circle")
      } else {
        setError(labels.error || "Failed to join")
      }
    } catch {
      setError(labels.error || "Error")
    } finally {
      setLoading(false)
    }
  }

  async function handleLeave() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/circles/${circle.id}/members`, {
        method: "DELETE",
      })
      if (res.ok) {
        router.push("/circles")
      } else {
        setError(labels.error || "Failed to leave")
      }
    } catch {
      setError(labels.error || "Error")
    } finally {
      setLoading(false)
    }
  }

  async function handleRequestReview() {
    if (!reviewPrompt.trim() || reviewPrompt.trim().length < 10) {
      setError("Prompt must be at least 10 characters.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/circles/${circle.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: reviewPrompt.trim() }),
      })
      if (res.ok) {
        setShowReviewDialog(false)
        setReviewPrompt("")
        setSuccess(labels.requestSent || "Review request sent")
        router.refresh()
      } else {
        setError(labels.error || "Failed")
      }
    } catch {
      setError(labels.error || "Error")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitReview(reviewId: string) {
    if (!feedback.trim() || feedback.trim().length < 10) {
      setError("Feedback must be at least 10 characters.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/circles/${circle.id}/reviews`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          feedback: feedback.trim(),
          rating: {
            clarity: ratingClarity,
            specificity: ratingSpecificity,
            actionability: ratingActionability,
          },
        }),
      })
      if (res.ok) {
        setShowSubmitReview(null)
        setFeedback("")
        setSuccess(labels.reviewSubmitted || "Review submitted")
        router.refresh()
      } else {
        setError(labels.error || "Failed")
      }
    } catch {
      setError(labels.error || "Error")
    } finally {
      setLoading(false)
    }
  }

  async function handlePromote(targetProfileId: string, role: string) {
    try {
      await fetch(`/api/circles/${circle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "promote", targetProfileId, role }),
      })
      router.refresh()
    } catch {
      setError(labels.error || "Error")
    }
  }

  async function handleDemote(targetProfileId: string) {
    try {
      await fetch(`/api/circles/${circle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "demote", targetProfileId }),
      })
      router.refresh()
    } catch {
      setError(labels.error || "Error")
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this circle?")) return
    try {
      const res = await fetch(`/api/circles/${circle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      })
      if (res.ok) {
        router.push("/circles")
      }
    } catch {
      setError(labels.error || "Error")
    }
  }

  const typeLabel =
    circle.type === "study_group" ? (labels.typeStudyGroup || "Study Group") :
    circle.type === "peer_review" ? (labels.typePeerReview || "Peer Review") :
    (labels.typeCommunity || "Community")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-3"
          onClick={() => router.push("/circles")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Circles
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">{circle.name}</h1>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{typeLabel}</Badge>
              <span>{circle.memberCount} members</span>
              {circle.userRole && (
                <Badge variant="outline">{circle.userRole}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                {labels.delete || "Delete"}
              </Button>
            )}
            {isMember && !isAdmin && (
              <Button variant="outline" onClick={handleLeave} disabled={loading}>
                {labels.leave || "Leave"}
              </Button>
            )}
            {!isMember && (
              <Button onClick={handleJoin} disabled={loading}>
                {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                {labels.join || "Join"}
              </Button>
            )}
          </div>
        </div>
        {circle.description && (
          <p className="mt-3 text-muted-foreground">{circle.description}</p>
        )}
        {success && <p className="mt-2 text-sm text-green-600">{success}</p>}
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      {/* Members */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            <UsersRound className="mr-2 inline h-5 w-5" />
            {labels.members || "Members"} ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {member.fullName?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.fullName || "Anonymous"}
                      </p>
                      {member.headline && (
                        <p className="text-xs text-muted-foreground">{member.headline}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {member.role === "admin" ? (labels.roleAdmin || "Admin") :
                       member.role === "moderator" ? (labels.roleModerator || "Moderator") :
                       (labels.roleMember || "Member")}
                    </Badge>
                    {isAdmin && member.userProfileId !== profileId && (
                      <div className="flex gap-1">
                        {member.role === "member" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePromote(member.userProfileId, "moderator")}
                          >
                            {labels.promote || "Promote"}
                          </Button>
                        )}
                        {member.role === "moderator" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePromote(member.userProfileId, "admin")}
                            >
                              {labels.promote || "Promote"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDemote(member.userProfileId)}
                            >
                              {labels.demote || "Demote"}
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Peer Reviews */}
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif text-lg">
            <MessageSquare className="mr-2 inline h-5 w-5" />
            {labels.reviews || "Peer Reviews"}
          </CardTitle>
          {isMember && (
            <Button size="sm" onClick={() => setShowReviewDialog(true)}>
              {labels.requestReview || "Request Review"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.noReviews || "No reviews yet."}</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {review.requesterName || "Anonymous"} requested feedback
                      </p>
                      <p className="text-xs text-muted-foreground">Status: {review.status}</p>
                    </div>
                    {review.rating && (
                      <div className="flex gap-3 text-xs">
                        <div className="text-center">
                          <Star className="mx-auto h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{review.rating.clarity}</span>
                          <span className="block text-muted-foreground">{labels.clarity || "Clarity"}</span>
                        </div>
                        <div className="text-center">
                          <Star className="mx-auto h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{review.rating.specificity}</span>
                          <span className="block text-muted-foreground">{labels.specificity || "Specificity"}</span>
                        </div>
                        <div className="text-center">
                          <Star className="mx-auto h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{review.rating.actionability}</span>
                          <span className="block text-muted-foreground">{labels.actionability || "Actionability"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Prompt: {review.prompt}
                  </p>
                  {review.feedback && (
                    <div className="mt-2 rounded bg-muted p-3">
                      <p className="text-xs font-medium">
                        {labels.reviewFeedback || "Feedback"} from {review.reviewerName || "Anonymous"}:
                      </p>
                      <p className="mt-1 text-sm">{review.feedback}</p>
                    </div>
                  )}
                  {review.status === "open" && isMember && review.requesterId !== profileId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowSubmitReview(review.id)}
                    >
                      {labels.submitReview || "Submit Review"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.requestReview || "Request Peer Review"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{labels.reviewPrompt || "What would you like feedback on?"}</label>
              <Input
                placeholder={labels.reviewPromptPlaceholder || "Describe what you want feedback on..."}
                value={reviewPrompt}
                onChange={(e) => setReviewPrompt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestReview} disabled={loading}>
              {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {labels.requestReview || "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Review Dialog */}
      <Dialog open={!!showSubmitReview} onOpenChange={() => setShowSubmitReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.submitReview || "Submit Peer Review"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{labels.reviewFeedback || "Feedback"}</label>
              <Input
                placeholder={labels.reviewFeedbackPlaceholder || "Provide constructive feedback..."}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium">{labels.clarity || "Clarity"} (1-5)</label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={ratingClarity}
                  onChange={(e) => setRatingClarity(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">{labels.specificity || "Specificity"} (1-5)</label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={ratingSpecificity}
                  onChange={(e) => setRatingSpecificity(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
                />
              </div>
              <div>
                <label className="text-xs font-medium">{labels.actionability || "Actionability"} (1-5)</label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={ratingActionability}
                  onChange={(e) => setRatingActionability(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitReview(null)}>
              Cancel
            </Button>
            <Button onClick={() => showSubmitReview && handleSubmitReview(showSubmitReview)} disabled={loading}>
              {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {labels.submitReview || "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
