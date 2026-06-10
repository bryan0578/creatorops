export type CampaignPackTemplateId =
  | "full-release-pack"
  | "youtube-upload-pack"
  | "social-promo-pack"
  | "merch-launch-pack"
  | "email-campaign-pack"
  | "analytics-review-pack"
  | "artist-brand-pack"

export type CampaignPackSectionKey =
  | "campaign-summary"
  | "readiness-summary"
  | "artist-context"
  | "release-plan"
  | "youtube-package"
  | "youtube-package-summary"
  | "thumbnail-package"
  | "thumbnail-text-concept"
  | "youtube-shorts-caption"
  | "youtube-community-post"
  | "youtube-pinned-comment"
  | "youtube-tags-hashtags"
  | "social-package"
  | "social-shorts-ideas"
  | "social-tiktok-caption"
  | "social-instagram-caption"
  | "social-x-post"
  | "social-youtube-community"
  | "social-email-snippet"
  | "social-hashtags"
  | "social-cta"
  | "email-campaign"
  | "email-subject-line"
  | "email-preview-text"
  | "email-body"
  | "email-cta"
  | "email-follow-up"
  | "email-resend-subject"
  | "email-resend-body"
  | "email-related-link"
  | "merch-idea"
  | "product-listing"
  | "mockup-prompt"
  | "merch-social-caption"
  | "merch-email-subject"
  | "commerce-store-details"
  | "analytics-checklist"
  | "analytics-record"
  | "analytics-current-metrics"
  | "analytics-24h-checklist"
  | "analytics-7d-checklist"
  | "analytics-30d-checklist"
  | "analytics-what-worked"
  | "analytics-what-to-improve"
  | "analytics-next-actions"
  | "artist-visual-identity"
  | "artist-target-audience"
  | "artist-content-style"
  | "artist-platform-links"
  | "artist-related-campaigns"
  | "artist-related-releases"
  | "artist-related-youtube"
  | "artist-related-merch"
  | "launch-tasks"
  | "publishing-checklist"
  | "missing-assets"
  | "missing-youtube-assets"
  | "missing-social-assets"
  | "missing-commerce-assets"
  | "linked-records"
  | "experiments-overview"
  | "experiment-winners-learnings"
  | "experiment-analytics-linked"
  | "experiment-variant-results"
  | "youtube-title-thumbnail-experiments"

export interface CampaignPackTemplate {
  id: CampaignPackTemplateId
  name: string
  slug: string
  description: string
  sections: CampaignPackSectionKey[]
}

export const DEFAULT_CAMPAIGN_PACK_TEMPLATE_ID: CampaignPackTemplateId =
  "full-release-pack"

export const CAMPAIGN_PACK_TEMPLATES: CampaignPackTemplate[] = [
  {
    id: "full-release-pack",
    name: "Full Release Pack",
    slug: "full-release-pack",
    description:
      "Complete launch document with readiness, all linked assets, tasks, and missing items.",
    sections: [
      "campaign-summary",
      "readiness-summary",
      "artist-context",
      "release-plan",
      "youtube-package",
      "thumbnail-package",
      "social-package",
      "email-campaign",
      "merch-idea",
      "product-listing",
      "mockup-prompt",
      "analytics-checklist",
      "experiments-overview",
      "experiment-winners-learnings",
      "launch-tasks",
      "publishing-checklist",
      "missing-assets",
      "linked-records",
    ],
  },
  {
    id: "youtube-upload-pack",
    name: "YouTube Upload Pack",
    slug: "youtube-upload-pack",
    description:
      "Title, description, tags, thumbnail prompt, pinned comment, Shorts caption, and community post.",
    sections: [
      "campaign-summary",
      "artist-context",
      "youtube-package",
      "thumbnail-package",
      "youtube-shorts-caption",
      "youtube-community-post",
      "youtube-pinned-comment",
      "youtube-tags-hashtags",
      "youtube-title-thumbnail-experiments",
      "launch-tasks",
      "publishing-checklist",
      "missing-youtube-assets",
    ],
  },
  {
    id: "social-promo-pack",
    name: "Social Promo Pack",
    slug: "social-promo-pack",
    description:
      "Social captions, Shorts ideas, hashtags, CTA, and email snippet for promo rollout.",
    sections: [
      "campaign-summary",
      "artist-context",
      "social-package",
      "social-shorts-ideas",
      "social-tiktok-caption",
      "social-instagram-caption",
      "social-x-post",
      "social-youtube-community",
      "social-email-snippet",
      "social-hashtags",
      "social-cta",
      "missing-social-assets",
    ],
  },
  {
    id: "merch-launch-pack",
    name: "Merch Launch Pack",
    slug: "merch-launch-pack",
    description:
      "Merch concept, product listing, mockup prompt, social caption, and store copy.",
    sections: [
      "campaign-summary",
      "artist-context",
      "merch-idea",
      "product-listing",
      "mockup-prompt",
      "merch-social-caption",
      "merch-email-subject",
      "commerce-store-details",
      "publishing-checklist",
      "missing-commerce-assets",
    ],
  },
  {
    id: "email-campaign-pack",
    name: "Email Campaign Pack",
    slug: "email-campaign-pack",
    description:
      "Subject line, preview text, body, CTA, follow-up, and resend copy.",
    sections: [
      "campaign-summary",
      "artist-context",
      "email-campaign",
      "email-subject-line",
      "email-preview-text",
      "email-body",
      "email-cta",
      "email-follow-up",
      "email-resend-subject",
      "email-resend-body",
      "email-related-link",
    ],
  },
  {
    id: "analytics-review-pack",
    name: "Analytics Review Pack",
    slug: "analytics-review-pack",
    description:
      "Metrics snapshot, review checklists, and notes on what worked and what to improve.",
    sections: [
      "campaign-summary",
      "youtube-package-summary",
      "thumbnail-text-concept",
      "analytics-record",
      "analytics-current-metrics",
      "analytics-24h-checklist",
      "analytics-7d-checklist",
      "analytics-30d-checklist",
      "analytics-what-worked",
      "analytics-what-to-improve",
      "analytics-next-actions",
      "experiment-analytics-linked",
      "experiment-variant-results",
    ],
  },
  {
    id: "artist-brand-pack",
    name: "Artist Brand Pack",
    slug: "artist-brand-pack",
    description:
      "Artist identity, audience, platform links, and related campaign assets.",
    sections: [
      "campaign-summary",
      "artist-context",
      "artist-visual-identity",
      "artist-target-audience",
      "artist-content-style",
      "artist-platform-links",
      "artist-related-campaigns",
      "artist-related-releases",
      "artist-related-youtube",
      "artist-related-merch",
    ],
  },
]

export function getCampaignPackTemplate(
  templateId?: string | null,
): CampaignPackTemplate {
  const id = (templateId ?? DEFAULT_CAMPAIGN_PACK_TEMPLATE_ID).trim()
  return (
    CAMPAIGN_PACK_TEMPLATES.find((template) => template.id === id) ??
    CAMPAIGN_PACK_TEMPLATES[0]
  )
}
