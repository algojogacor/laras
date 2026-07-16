"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"
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
import { UsersRound, Plus, Search, Loader2 } from "lucide-react"

interface CircleData {
  id: string
  name: string
  description: string | null
  type: string
  createdById: string
  memberCount: number
  userRole: string | null
}

interface CirclesPanelProps {
  initialCircles: CircleData[]
  myCircles: CircleData[]
  profileId: string
  labels: Record<string, string>
}

export function CirclesPanel({
  initialCircles,
  myCircles,
  profileId,
  labels,
}: CirclesPanelProps) {
  const router = useRouter()
  const [circles, setCircles] = useState<CircleData[]>(initialCircles)
  const [myCircleList, setMyCircleList] = useState<CircleData[]>(myCircles)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [circleType, setCircleType] = useState("community")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const myCircleIds = new Set(myCircleList.map((c) => c.id))

  async function handleCreate() {
    if (!name.trim() || name.trim().length < 3) {
      setError("Circle name must be at least 3 characters.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await apiClient("/api/circles", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, type: circleType }),
      })
      if (res.ok) {
        const data = await res.json()
        setShowCreate(false)
        setName("")
        setDescription("")
        router.push(`/circles/${data.id}`)
      } else {
        setError(labels.createError || "Failed to create circle")
      }
    } catch {
      setError(labels.createError || "Failed to create circle")
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(circleId: string) {
    try {
      const res = await apiClient(`/api/circles/${circleId}/members`, {
        method: "POST",
      })
      if (res.ok) {
        setMyCircleList((prev) => {
          const circle = circles.find((c) => c.id === circleId)
          if (circle && !prev.find((c) => c.id === circleId)) {
            return [...prev, { ...circle, userRole: "member" }]
          }
          return prev
        })
        setCircles((prev) =>
          prev.map((c) =>
            c.id === circleId ? { ...c, memberCount: c.memberCount + 1 } : c
          )
        )
      }
    } catch {
      setError(labels.error || "An error occurred")
    }
  }

  async function handleLeave(circleId: string) {
    try {
      const res = await apiClient(`/api/circles/${circleId}/members`, {
        method: "DELETE",
      })
      if (res.ok) {
        setMyCircleList((prev) => prev.filter((c) => c.id !== circleId))
        setCircles((prev) =>
          prev.map((c) =>
            c.id === circleId ? { ...c, memberCount: Math.max(0, c.memberCount - 1) } : c
          )
        )
      }
    } catch {
      setError(labels.error || "An error occurred")
    }
  }

  async function handleSearch() {
    const params = new URLSearchParams()
    if (search.trim()) params.set("search", search.trim())
    if (typeFilter) params.set("type", typeFilter)
    try {
      const res = await apiClient(`/api/circles?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setCircles(data.circles || [])
      }
    } catch {
      // keep current view
    }
  }

  const filtered = circles.filter((c) => {
    if (typeFilter && c.type !== typeFilter) return false
    if (search.trim() && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* My Circles */}
      {myCircleList.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-serif text-lg">My Circles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myCircleList.map((circle) => (
              <div
                key={circle.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/circles/${circle.id}`)}
              >
                <div className="flex items-center gap-3">
                  <UsersRound className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{circle.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {circle.memberCount} members &middot; {circle.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{circle.userRole}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLeave(circle.id)
                    }}
                  >
                    {labels.leave || "Leave"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder={labels.search || "Search circles..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-sm"
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setTimeout(handleSearch, 50); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={labels.allTypes || "All types"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{labels.allTypes || "All types"}</SelectItem>
            <SelectItem value="community">{labels.typeCommunity || "Community"}</SelectItem>
            <SelectItem value="study_group">{labels.typeStudyGroup || "Study Group"}</SelectItem>
            <SelectItem value="peer_review">{labels.typePeerReview || "Peer Review"}</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {labels.create || "Create Circle"}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Circles List */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center">
            <UsersRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">{labels.noCircles || "No circles found."}</p>
          </div>
        ) : (
          filtered.map((circle) => (
            <Card
              key={circle.id}
              className="shadow-soft cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/circles/${circle.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="font-serif text-base">{circle.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {circle.type === "study_group" ? (labels.typeStudyGroup || "Study Group") :
                     circle.type === "peer_review" ? (labels.typePeerReview || "Peer Review") :
                     (labels.typeCommunity || "Community")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {circle.description || ""}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {circle.memberCount} {labels.members || "members"}
                  </span>
                  {myCircleIds.has(circle.id) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/circles/${circle.id}`)
                      }}
                    >
                      {labels.join || "View"}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleJoin(circle.id)
                      }}
                    >
                      {labels.join || "Join"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.createTitle || "Create New Circle"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{labels.name || "Name"}</label>
              <Input
                placeholder={labels.namePlaceholder || "Enter circle name..."}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{labels.description || "Description"}</label>
              <Input
                placeholder={labels.descriptionPlaceholder || "Describe the circle's purpose..."}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{labels.type || "Type"}</label>
              <Select value={circleType} onValueChange={setCircleType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="community">{labels.typeCommunity || "Community"}</SelectItem>
                  <SelectItem value="study_group">{labels.typeStudyGroup || "Study Group"}</SelectItem>
                  <SelectItem value="peer_review">{labels.typePeerReview || "Peer Review"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {labels.create || "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
