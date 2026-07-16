"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2 } from "lucide-react"
import { larasToast } from "@/lib/laras-toast"
import { useT } from "@/components/providers/locale-provider"
import { apiClient } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog"

export function DeleteDocButton({ documentId }: { documentId: string }) {
  const t = useT()
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function del() {
    setDeleting(true)
    try {
      const res = await apiClient(`/api/documents/${documentId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      larasToast.success(t.documents.deleteDoc)
      router.push("/documents")
      router.refresh()
    } catch {
      larasToast.error(t.auth.errGeneric)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10">
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {t.documents.deleteDoc}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{t.documents.deleteDoc}</DialogTitle>
          <DialogDescription>{t.documents.deleteDocConfirm}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" size="sm">{t.common.cancel}</Button></DialogClose>
          <Button variant="destructive" size="sm" onClick={del} disabled={deleting}>
            {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {t.common.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
