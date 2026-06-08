import type {
  EmailCampaignFormValues,
  EmailCampaignRecord,
  Prompt,
} from "@/lib/types"
import {
  buildCompletedPrompt,
  mergePromptVariables,
} from "@/lib/prompt-variables"

export const EMAIL_CAMPAIGN_PROMPT_ID = "p-email-campaign"
export const EMAIL_CAMPAIGN_PROMPT_NAME = "Email Campaign Generator"

export const FALLBACK_EMAIL_CAMPAIGN_TEMPLATE = `You are an expert email marketing strategist for music releases, merch drops, digital products, courses, and creator brands.

Create a complete email campaign based on the following:

Campaign name: {{campaignName}}
Campaign type: {{campaignType}}
Business area: {{businessArea}}
Audience: {{audience}}
Offer or announcement: {{offerOrAnnouncement}}
Product or release name: {{productOrReleaseName}}
Key benefits: {{keyBenefits}}
Tone: {{tone}}
Call to action: {{callToAction}}
Link: {{link}}
Urgency: {{urgency}}
Sender name: {{senderName}}

Additional notes: {{notes}}

Generate:
1. 10 subject line options
2. 10 preview text options
3. Three email body versions (standard, short, and story-driven)
4. One short version optimized for mobile skimmers
5. One story-driven version with narrative hook
6. One direct sales version focused on conversion
7. CTA options (button text and supporting lines)
8. A follow-up email for non-clickers
9. A resend version for non-openers (new subject + shorter body)
10. Segmentation ideas for who should receive which version

Match tone to the audience and business area. Keep subject lines under 60 characters when possible.`

export interface EmailCampaignFinalFields {
  finalSubjectLine: string
  finalPreviewText: string
  finalEmailBody: string
  finalCTA: string
  finalFollowUpEmail: string
  finalResendSubject: string
  finalResendBody: string
}

export function emptyEmailCampaignForm(): EmailCampaignFormValues {
  return {
    campaignName: "",
    campaignType: "Music Release Announcement",
    businessArea: "AI Music",
    audience: "",
    offerOrAnnouncement: "",
    productOrReleaseName: "",
    keyBenefits: "",
    tone: "",
    callToAction: "",
    link: "",
    urgency: "",
    senderName: "",
    notes: "",
  }
}

export function emptyFinalEmailFields(): EmailCampaignFinalFields {
  return {
    finalSubjectLine: "",
    finalPreviewText: "",
    finalEmailBody: "",
    finalCTA: "",
    finalFollowUpEmail: "",
    finalResendSubject: "",
    finalResendBody: "",
  }
}

export function normalizeEmailCampaignRecord(
  record: Partial<EmailCampaignRecord> & Pick<EmailCampaignRecord, "id">,
): EmailCampaignRecord {
  const form = emptyEmailCampaignForm()
  const finals = emptyFinalEmailFields()
  return {
    id: record.id,
    campaignName: record.campaignName ?? form.campaignName,
    campaignType: record.campaignType ?? form.campaignType,
    businessArea: record.businessArea ?? form.businessArea,
    audience: record.audience ?? form.audience,
    offerOrAnnouncement:
      record.offerOrAnnouncement ?? form.offerOrAnnouncement,
    productOrReleaseName:
      record.productOrReleaseName ?? form.productOrReleaseName,
    keyBenefits: record.keyBenefits ?? form.keyBenefits,
    tone: record.tone ?? form.tone,
    callToAction: record.callToAction ?? form.callToAction,
    link: record.link ?? form.link,
    urgency: record.urgency ?? form.urgency,
    senderName: record.senderName ?? form.senderName,
    completedPrompt: record.completedPrompt ?? "",
    aiResponse: record.aiResponse ?? "",
    finalSubjectLine: record.finalSubjectLine ?? finals.finalSubjectLine,
    finalPreviewText: record.finalPreviewText ?? finals.finalPreviewText,
    finalEmailBody: record.finalEmailBody ?? finals.finalEmailBody,
    finalCTA: record.finalCTA ?? finals.finalCTA,
    finalFollowUpEmail: record.finalFollowUpEmail ?? finals.finalFollowUpEmail,
    finalResendSubject: record.finalResendSubject ?? finals.finalResendSubject,
    finalResendBody: record.finalResendBody ?? finals.finalResendBody,
    notes: record.notes ?? form.notes,
    createdAt: record.createdAt ?? Date.now(),
    updatedAt: record.updatedAt ?? Date.now(),
  }
}

export function getEmailCampaignTemplate(prompts: Prompt[]): string {
  const saved = prompts.find(
    (p) =>
      p.id === EMAIL_CAMPAIGN_PROMPT_ID ||
      p.name === EMAIL_CAMPAIGN_PROMPT_NAME,
  )
  if (saved?.promptText) return saved.promptText
  return FALLBACK_EMAIL_CAMPAIGN_TEMPLATE
}

export function formValuesToRecord(
  form: EmailCampaignFormValues,
): Record<string, string> {
  return { ...form }
}

export function buildEmailCampaignCompletedPrompt(
  template: string,
  form: EmailCampaignFormValues,
): string {
  const values = formValuesToRecord(form)
  const variables = mergePromptVariables(Object.keys(values), template)
  return buildCompletedPrompt(template, values, variables)
}

export function buildFinalEmailText(
  campaignName: string,
  fields: EmailCampaignFinalFields,
): string {
  const sections: { label: string; value: string }[] = [
    { label: "Campaign", value: campaignName },
    { label: "Subject Line", value: fields.finalSubjectLine },
    { label: "Preview Text", value: fields.finalPreviewText },
    { label: "Email Body", value: fields.finalEmailBody },
    { label: "CTA", value: fields.finalCTA },
    { label: "Follow-Up Email", value: fields.finalFollowUpEmail },
    { label: "Resend Subject", value: fields.finalResendSubject },
    { label: "Resend Body", value: fields.finalResendBody },
  ]

  return sections
    .filter((section) => section.value.trim())
    .map((section) => `${section.label}:\n${section.value.trim()}`)
    .join("\n\n")
}

export function finalFieldsFromEmailRecord(
  record: Pick<EmailCampaignRecord, keyof EmailCampaignFinalFields>,
): EmailCampaignFinalFields {
  return {
    finalSubjectLine: record.finalSubjectLine ?? "",
    finalPreviewText: record.finalPreviewText ?? "",
    finalEmailBody: record.finalEmailBody ?? "",
    finalCTA: record.finalCTA ?? "",
    finalFollowUpEmail: record.finalFollowUpEmail ?? "",
    finalResendSubject: record.finalResendSubject ?? "",
    finalResendBody: record.finalResendBody ?? "",
  }
}
