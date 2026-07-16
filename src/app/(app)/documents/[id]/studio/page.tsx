import { notFound } from "next/navigation"
import { requireActor, findOwnedDocument } from "@/lib/authorization"
import { ArtifactStudio } from "@/components/documents/artifact-studio"
import { db } from "@/lib/db"

export default async function ArtifactStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor(), doc = await findOwnedDocument((await params).id, actor)
  if (!doc.content) notFound()
  const versions = await db.documentVersion.findMany({ where: { documentId: doc.id }, orderBy: { versionNumber: "desc" }, select: { id: true, versionNumber: true, revisionInstruction: true, parentVersionId: true, createdAt: true, content: true } })
  return <ArtifactStudio initialDocument={{ id: doc.id, type: doc.type, title: doc.title, content: JSON.parse(doc.content), config: doc.config ? JSON.parse(doc.config) : {}, version: doc.version, updatedAt: doc.updatedAt.toISOString() }} initialVersions={versions.map((item) => ({ ...item, createdAt: item.createdAt.toISOString(), content: JSON.parse(item.content) }))} />
}
