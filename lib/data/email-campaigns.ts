import { normalizeEmailCampaignRecord } from "@/lib/email-campaigns"
import type { EmailCampaignRecord } from "@/lib/types"
import type { EmailCampaign as PrismaEmailCampaign } from "@/lib/generated/prisma/client"

/**
 * Shared email campaign data layer — maps between app types and Prisma rows.
 */

export { normalizeEmailCampaignRecord } from "@/lib/email-campaigns"

export function emailCampaignToPrismaCreate(record: EmailCampaignRecord) {
  const normalized = normalizeEmailCampaignRecord(record)
  return {
    id: normalized.id,
    campaignName: normalized.campaignName,
    campaignType: normalized.campaignType,
    businessArea: normalized.businessArea,
    audience: normalized.audience,
    offerOrAnnouncement: normalized.offerOrAnnouncement,
    productOrReleaseName: normalized.productOrReleaseName,
    keyBenefits: normalized.keyBenefits,
    tone: normalized.tone,
    callToAction: normalized.callToAction,
    link: normalized.link,
    urgency: normalized.urgency,
    senderName: normalized.senderName,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalSubjectLine: normalized.finalSubjectLine,
    finalPreviewText: normalized.finalPreviewText,
    finalEmailBody: normalized.finalEmailBody,
    finalCTA: normalized.finalCTA,
    finalFollowUpEmail: normalized.finalFollowUpEmail,
    finalResendSubject: normalized.finalResendSubject,
    finalResendBody: normalized.finalResendBody,
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function emailCampaignToPrismaUpdate(record: EmailCampaignRecord) {
  const normalized = normalizeEmailCampaignRecord(record)
  return {
    campaignName: normalized.campaignName,
    campaignType: normalized.campaignType,
    businessArea: normalized.businessArea,
    audience: normalized.audience,
    offerOrAnnouncement: normalized.offerOrAnnouncement,
    productOrReleaseName: normalized.productOrReleaseName,
    keyBenefits: normalized.keyBenefits,
    tone: normalized.tone,
    callToAction: normalized.callToAction,
    link: normalized.link,
    urgency: normalized.urgency,
    senderName: normalized.senderName,
    completedPrompt: normalized.completedPrompt,
    aiResponse: normalized.aiResponse,
    finalSubjectLine: normalized.finalSubjectLine,
    finalPreviewText: normalized.finalPreviewText,
    finalEmailBody: normalized.finalEmailBody,
    finalCTA: normalized.finalCTA,
    finalFollowUpEmail: normalized.finalFollowUpEmail,
    finalResendSubject: normalized.finalResendSubject,
    finalResendBody: normalized.finalResendBody,
    notes: normalized.notes,
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaEmailCampaignToEmailCampaignRecord(
  row: PrismaEmailCampaign,
): EmailCampaignRecord {
  return normalizeEmailCampaignRecord({
    id: row.id,
    campaignName: row.campaignName,
    campaignType: row.campaignType,
    businessArea: row.businessArea,
    audience: row.audience,
    offerOrAnnouncement: row.offerOrAnnouncement,
    productOrReleaseName: row.productOrReleaseName,
    keyBenefits: row.keyBenefits,
    tone: row.tone,
    callToAction: row.callToAction,
    link: row.link,
    urgency: row.urgency,
    senderName: row.senderName,
    completedPrompt: row.completedPrompt,
    aiResponse: row.aiResponse,
    finalSubjectLine: row.finalSubjectLine,
    finalPreviewText: row.finalPreviewText,
    finalEmailBody: row.finalEmailBody,
    finalCTA: row.finalCTA,
    finalFollowUpEmail: row.finalFollowUpEmail,
    finalResendSubject: row.finalResendSubject,
    finalResendBody: row.finalResendBody,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
