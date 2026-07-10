"use client"

import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

/** Reusable skeleton primitive — animated shimmer placeholder. */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      style={style}
      aria-hidden="true"
    />
  )
}

/** Document preview skeleton — simulates a paper-style loading state. */
export function DocumentSkeleton({ lines = 8 }: { lines?: number }) {
  return (
    <div className="mx-auto w-full max-w-[640px] bg-white p-10 shadow-lift">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-3 w-32" />
      <div className="mt-4 border-b border-border pb-2">
        <Skeleton className="h-3 w-full" />
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-3 w-24" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 w-full" style={{ width: `${85 + Math.random() * 15}%` }} />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-4/5" />
      </div>
    </div>
  )
}

/** Question list skeleton — for English practice loading. */
export function QuestionsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-full" />
              <Skeleton className="h-2.5 w-5/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Sidebar skeleton — for the config panel while generating. */
export function SidebarSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
