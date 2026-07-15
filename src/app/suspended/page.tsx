import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getLocaleAndDict } from "@/lib/i18n"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function SuspendedPage() {
  const session = await getSession()

  // If not logged in, redirect to login
  if (!session) redirect("/login")

  // If logged in but not suspended, redirect to dashboard
  if (!session.suspended) redirect("/dashboard")

  const { t } = await getLocaleAndDict()

  const account = await db.account.findUnique({
    where: { id: session.userId },
    select: { suspendedAt: true, suspensionReason: true },
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full rounded-lg border border-red-200 bg-white p-8 shadow-sm text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-gray-900">Akun Ditangguhkan</h1>

        <p className="text-sm text-gray-600">
          Akun Anda telah ditangguhkan oleh moderator. Anda tidak dapat mengakses platform selama masa penangguhan.
        </p>

        {account?.suspensionReason && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 text-left">
            <span className="font-medium">Alasan:</span> {account.suspensionReason}
          </div>
        )}

        {account?.suspendedAt && (
          <p className="text-xs text-gray-500">
            Ditangguhkan sejak: {new Date(account.suspendedAt).toLocaleDateString("id-ID")}
          </p>
        )}

        <p className="text-xs text-gray-400">
          Jika Anda yakin ini adalah kesalahan, silakan hubungi tim dukungan.
        </p>

        <div className="pt-2">
          <a
            href="/api/auth/logout"
            className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Keluar
          </a>
        </div>
      </div>
    </div>
  )
}
