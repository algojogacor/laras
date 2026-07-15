import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getSession, isAdminRole } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { isModeratorOrAbove } from "@/lib/moderation"
import { getReportQueue } from "@/lib/moderation"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function ModerationDashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  if (!isModeratorOrAbove(session.role)) redirect("/dashboard")

  const { t } = await getLocaleAndDict()
  const data = await getReportQueue({ limit: 50 })

  const statusLabels: Record<string, { label: string; badge: string }> = {
    open: { label: "Terbuka", badge: "bg-yellow-100 text-yellow-800" },
    investigating: { label: "Investigasi", badge: "bg-blue-100 text-blue-800" },
    resolved: { label: "Selesai", badge: "bg-green-100 text-green-800" },
    dismissed: { label: "Ditolak", badge: "bg-gray-100 text-gray-800" },
  }

  const priorityLabels: Record<string, { label: string; badge: string }> = {
    low: { label: "Rendah", badge: "bg-gray-100 text-gray-600" },
    normal: { label: "Normal", badge: "bg-blue-100 text-blue-600" },
    high: { label: "Tinggi", badge: "bg-orange-100 text-orange-800" },
    urgent: { label: "Mendesak", badge: "bg-red-100 text-red-800" },
  }

  const reasonLabels: Record<string, string> = {
    harassment: "Pelecehan",
    spam: "Spam",
    impersonation: "Peniruan",
    inappropriate: "Tidak Pantas",
    other: "Lainnya",
  }

  const targetLabels: Record<string, string> = {
    user: "Pengguna",
    connection: "Koneksi",
    message: "Pesan",
    circle: "Komunitas",
    mentorship: "Mentorship",
    content: "Konten",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel Moderasi</h1>
        <p className="mt-1 text-sm text-gray-500">Kelola laporan, kasus, dan sanksi pengguna.</p>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-4 border-b pb-3">
        <Link href="/moderation" className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 pb-3 -mb-3">
          Laporan ({data.items.length})
        </Link>
        <Link href="/moderation/cases" className="text-sm font-medium text-gray-500 hover:text-gray-700 pb-3 -mb-3">
          Kasus
        </Link>
      </div>

      {/* Report queue */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-gray-900">Antrian Laporan</h2>
        </div>

        {data.items.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            Tidak ada laporan yang perlu ditinjau.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Pelapor</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Target</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Alasan</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Prioritas</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Tanggal</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.items.map((report: any) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-900">
                        {report.reporter?.fullName || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {targetLabels[report.targetType] || report.targetType}: {report.targetId.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {reasonLabels[report.reason] || report.reason}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusLabels[report.status]?.badge || "bg-gray-100 text-gray-600"}`}>
                        {statusLabels[report.status]?.label || report.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priorityLabels[report.priority]?.badge || ""}`}>
                        {priorityLabels[report.priority]?.label || report.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/moderation/cases?reportId=${report.id}`}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Tinjau
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
