import type { FeedbackEvidence, FeedbackRelatedRecord } from "@/lib/feedback-loop/types"

export function recordHref(type: string, id: string): string {
  switch (type) {
    case "campaign":
      return `/campaigns?campaignId=${encodeURIComponent(id)}`
    case "analytics":
      return `/analytics?recordId=${encodeURIComponent(id)}`
    case "experiment":
      return `/experiments?recordId=${encodeURIComponent(id)}`
    case "learning":
      return `/learnings?recordId=${encodeURIComponent(id)}`
    case "quality-review":
      return `/quality?recordId=${encodeURIComponent(id)}`
    case "youtube-video":
      return `/videos?recordId=${encodeURIComponent(id)}`
    case "pattern":
      return `/patterns`
    case "quality-performance":
      return `/quality-performance`
    case "playbook":
      return `/playbooks?recordId=${encodeURIComponent(id)}`
    case "revenue-record":
      return `/revenue?recordId=${encodeURIComponent(id)}`
    default:
      return "/feedback-loop"
  }
}

export function evidenceItem(
  label: string,
  value: string,
  sourceType?: string,
  sourceId?: string,
): FeedbackEvidence {
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
): FeedbackRelatedRecord {
  return {
    sourceType,
    sourceId,
    title,
    href: recordHref(sourceType, sourceId),
  }
}
