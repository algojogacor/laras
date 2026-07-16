import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getLocale } from "@/lib/i18n"
import { OpportunityCreateForm } from "./form"

export default async function NewOpportunityPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <OpportunityCreateForm locale={await getLocale()} />
}
