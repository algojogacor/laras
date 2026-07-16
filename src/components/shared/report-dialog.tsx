"use client"

import { useState } from "react"
import { apiClient } from "@/lib/api-client"

export type ReportTargetType = "user" | "connection" | "message" | "circle" | "mentorship" | "content"
export type ReportReason = "harassment" | "spam" | "impersonation" | "inappropriate" | "other"

export interface ReportDialogProps {
  targetType: ReportTargetType
  targetId: string
  targetLabel?: string
  triggerLabel?: string
  /** Called after successful report submission */
  onSubmitted?: () => void
}

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: "harassment", label: "Pelecehan / Harassment" },
  { value: "spam", label: "Spam" },
  { value: "impersonation", label: "Peniruan / Impersonation" },
  { value: "inappropriate", label: "Konten Tidak Pantas / Inappropriate" },
  { value: "other", label: "Lainnya / Other" },
]

export function ReportDialog({
  targetType,
  targetId,
  targetLabel,
  triggerLabel = "Laporkan",
  onSubmitted,
}: ReportDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason | "">("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason) return

    setSubmitting(true)
    setError("")

    try {
      const res = await apiClient("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          description: description.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Gagal mengirim laporan")
      }

      setSubmitted(true)
      onSubmitted?.()
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan")
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setOpen(false)
    setReason("")
    setDescription("")
    setError("")
    setSubmitted(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-red-600 transition-colors underline underline-offset-2"
      >
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-sm rounded-lg bg-white shadow-xl">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Laporkan {targetLabel || targetType}</h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {submitted ? (
                <div className="rounded-md bg-green-50 p-4 text-sm text-green-800 text-center">
                  Laporan berhasil dikirim. Terima kasih.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Reason */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Alasan laporan
                    </label>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value as ReportReason)}
                      required
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Pilih alasan...</option>
                      {REASON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Deskripsi (opsional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Jelaskan apa yang terjadi..."
                    />
                  </div>

                  {error && (
                    <p className="text-xs text-red-600">{error}</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !reason}
                      className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {submitting ? "Mengirim..." : "Kirim Laporan"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
