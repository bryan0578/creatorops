import type {
  QualityPerformanceEvidence,
  QualityPerformanceRelatedRecord,
} from "@/lib/quality-performance/types"

export function recordHref(type: string, id: string): string {
  switch (type) {
    case "campaign":
      return `/campaigns?campaignId=${encodeURIComponent(id)}`
    case "analytics":
      return `/analytics?recordId=${encodeURIComponent(id)}`
    case "youtube-video":
      return `/videos?recordId=${encodeURIComponent(id)}`
    case "experiment":
      return `/experiments?recordId=${encodeURIComponent(id)}`
    case "learning":
      return `/learnings?recordId=${encodeURIComponent(id)}`
    case "quality-review":
      return `/quality?recordId=${encodeURIComponent(id)}`
    case "youtube-thumbnail":
      return `/youtube-thumbnails?recordId=${encodeURIComponent(id)}`
    case "youtube-package":
      return `/youtube-packaging?recordId=${encodeURIComponent(id)}`
    case "product-listing":
      return `/product-listings?recordId=${encodeURIComponent(id)}`
    case "merch-idea":
      return `/merch-ideas?recordId=${encodeURIComponent(id)}`
    default:
      return "/quality-performance"
  }
}

export function evidenceItem(
  label: string,
  value: string,
  sourceType?: string,
  sourceId?: string,
): QualityPerformanceEvidence {
  return {
    label,
    value,
    sourceType,
    sourceId,
    href: sourceType && sourceId ? recordHref(sourceType, sourceId) : undefined,
  }
}

export function relatedRecord(
  sourceType: string,
  sourceId: string,
  title: string,
): QualityPerformanceRelatedRecord {
  return {
    sourceType,
    sourceId,
    title,
    href: recordHref(sourceType, sourceId),
  }
}

export function formatMetric(value: number, suffix = ""): string {
  if (!Number.isFinite(value)) return "—"
  return `${Math.round(value * 10) / 10}${suffix}`
}
