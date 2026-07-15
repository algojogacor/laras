import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { isModeratorOrAbove } from "@/lib/moderation"
import { getCaseById } from "@/lib/moderation"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const session = await getSession()
  if (!session) redirect("/login")

  if (!isModeratorOrAbove(session.role)) redirect("/dashboard")

  const { t } = await getLocaleAndDict()
  const caseData = await getCaseById(id)

  if (!caseData) notFound()

  const typeLabels: Record<string, string> = {
    warning: "Peringatan",
    suspension: "Penangguhan",
    ban: "Ban",
    restriction: "Pembatasan",
  }

  const statusLabels: Record<string, { label: string; badge: string }> = {
    active: { label: "Aktif", badge: "bg-red-100 text-red-800" },
    expired: { label: "Kedaluwarsa", badge: "bg-gray-100 text-gray-600" },
    revoked: { label: "Dicabut", badge: "bg-green-100 text-green-800" },
  }

  const appealStatusLabels: Record<string, { label: string; badge: string }> = {
    pending: { label: "Menunggu", badge: "bg-yellow-100 text-yellow-800" },
    reviewed: { label: "Ditinjau", badge: "bg-blue-100 text-blue-800" },
    granted: { label: "Dikabulkan", badge: "bg-green-100 text-green-800" },
    denied: { label: "Ditolak", badge: "bg-gray-100 text-gray-600" },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/moderation" className="text-sm text-blue-600 hover:text-blue-800">
          &larr; Kembali ke panel
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Detail Kasus</h1>
        <p className="mt-1 text-sm text-gray-500">Kasus moderasi #{caseData.id.slice(0, 8)}</p>
      </div>

      {/* Case info card */}
      <div className="rounded-lg border bg-white shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-500">Tipe:</span>{" "}
            <span className="text-gray-900">{typeLabels[caseData.type] || caseData.type}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Status:</span>{" "}
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusLabels[caseData.status]?.badge}`}>
              {statusLabels[caseData.status]?.label || caseData.status}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Subjek (Account ID):</span>{" "}
            <span className="text-gray-900 font-mono text-xs">{caseData.subjectId}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Moderator:</span>{" "}
            <span className="text-gray-900 font-mono text-xs">{caseData.moderatorId.slice(0, 12)}...</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Durasi:</span>{" "}
            <span className="text-gray-900">{caseData.duration || "N/A"}</span>
          </div>
          <div>
            <span className="font-medium text-gray-500">Kedaluwarsa:</span>{" "}
            <span className="text-gray-900">{caseData.expiresAt ? new Date(caseData.expiresAt).toLocaleDateString("id-ID") : "N/A"}</span>
          </div>
        </div>

        <div>
          <span className="font-medium text-sm text-gray-500">Alasan:</span>
          <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{caseData.reason}</p>
        </div>

        <div className="text-xs text-gray-400">
          Dibuat: {new Date(caseData.createdAt).toLocaleString("id-ID")}
        </div>
      </div>

      {/* Linked report */}
      {caseData.report && (
        <div className="rounded-lg border bg-white shadow-sm p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Laporan Terkait</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Alasan: {caseData.report.reason}</p>
            <p>Tipe Target: {caseData.report.targetType}</p>
            <p>Deskripsi: {caseData.report.description || "Tidak ada"}</p>
            <p>Pelapor: {caseData.report.reporter?.fullName || "Unknown"}</p>
          </div>
        </div>
      )}

      {/* Appeals */}
      <div className="rounded-lg border bg-white shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Banding ({caseData.appeals.length})</h2>
        {caseData.appeals.length === 0 ? (
          <p className="text-sm text-gray-500">Tidak ada banding.</p>
        ) : (
          <div className="space-y-3">
            {caseData.appeals.map((appeal: any) => (
              <div key={appeal.id} className="rounded border p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${appealStatusLabels[appeal.status]?.badge}`}>
                    {appealStatusLabels[appeal.status]?.label || appeal.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(appeal.createdAt).toLocaleString("id-ID")}
                  </span>
                </div>
                <p className="text-gray-700">{appeal.reason}</p>
                {appeal.reviewNote && (
                  <p className="text-gray-500 text-xs italic">Catatan: {appeal.reviewNote}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
