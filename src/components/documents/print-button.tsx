"use client"

import { useState, useCallback } from "react"
import { Printer, Loader2 } from "lucide-react"
import { larasToast } from "@/lib/laras-toast"
import { Button } from "@/components/ui/button"
import { useT } from "@/components/providers/locale-provider"

/**
 * Print-to-PDF button. Triggers browser print dialog which lets user
 * "Save as PDF". The print stylesheet in globals.css hides app chrome
 * and shows only elements with the `print-area` class.
 */
export function PrintButton({ className }: { className?: string }) {
  const t = useT()
  const [loading, setLoading] = useState(false)

  const onPrint = useCallback(() => {
    setLoading(true)
    larasToast.success(t.documents.downloadPdf)
    setTimeout(() => {
      window.print()
      setLoading(false)
    }, 300)
  }, [t])

  return (
    <Button onClick={onPrint} variant="outline" size="sm" className={className} disabled={loading}>
      {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Printer className="mr-1.5 h-3.5 w-3.5" />}
      {t.documents.downloadPdf}
    </Button>
  )
}
