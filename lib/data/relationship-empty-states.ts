import type { GetRelatedRecordsInput } from "@/lib/data/related-records"

export const CAMPAIGN_LINK_GROUP_EMPTY: Record<
  string,
  { title: string; description: string; actionLabel: string }
> = {
  planning: {
    title: "No planning records linked yet.",
    description: "Link a release plan to track launch strategy from this campaign.",
    actionLabel: "Create Release Plan",
  },
  youtube: {
    title: "No YouTube assets linked yet.",
    description: "Add packaging metadata or thumbnail concepts for this launch.",
    actionLabel: "Create YouTube Package",
  },
  commerce: {
    title: "No commerce records linked yet.",
    description: "Connect merch ideas, listings, or mockup prompts.",
    actionLabel: "Create Merch Idea",
  },
  marketing: {
    title: "No marketing records linked yet.",
    description: "Link social content or email campaigns for this launch.",
    actionLabel: "Create Social Content",
  },
  analytics: {
    title: "No analytics records linked yet.",
    description: "Track performance once assets are live.",
    actionLabel: "Add Analytics Record",
  },
  operations: {
    title: "No operational records linked yet.",
    description: "Link artist profiles or run workflows from this campaign.",
    actionLabel: "Run Workflow",
  },
}

export type RelationshipEmptyStateConfig = {
  title: string
  description: string
  primaryActionLabel?: string
  primaryActionHref?: string
  secondaryActionLabel?: string
  secondaryActionHref?: string
}

export const RELATIONSHIP_PANEL_EMPTY: Partial<
  Record<GetRelatedRecordsInput["currentType"], RelationshipEmptyStateConfig>
> = {
  "youtube-packaging": {
    title: "No related records yet",
    description:
      "Link a campaign or create matching thumbnail, release plan, and analytics records to see connections here.",
    primaryActionLabel: "Create YouTube Thumbnail",
    primaryActionHref: "/youtube-thumbnails",
    secondaryActionLabel: "Open Release Planner",
    secondaryActionHref: "/release-planner",
  },
  "youtube-thumbnail": {
    title: "No related records yet",
    description:
      "Related YouTube packages, release plans, and analytics appear when artist and track titles match.",
    primaryActionLabel: "Create YouTube Package",
    primaryActionHref: "/youtube-packaging",
    secondaryActionLabel: "Add Analytics",
    secondaryActionHref: "/analytics",
  },
  "release-plan": {
    title: "No related records yet",
    description:
      "Connect YouTube assets, social content, email, and analytics tied to this release.",
    primaryActionLabel: "Create YouTube Package",
    primaryActionHref: "/youtube-packaging",
    secondaryActionLabel: "Create Social Content",
    secondaryActionHref: "/social-repurposing",
  },
  "social-repurposing": {
    title: "No related records yet",
    description:
      "Matching release plans, YouTube packages, product listings, and email campaigns show here.",
    primaryActionLabel: "Open Campaign Builder",
    primaryActionHref: "/campaigns",
  },
  "email-campaign": {
    title: "No related records yet",
    description:
      "Related social, product, and release records appear when campaign or product names match.",
    primaryActionLabel: "Create Social Content",
    primaryActionHref: "/social-repurposing",
  },
  analytics: {
    title: "No related records yet",
    description:
      "Link a campaign or match artist, song, and title fields to surface YouTube and release assets.",
    primaryActionLabel: "Open Campaign Builder",
    primaryActionHref: "/campaigns",
  },
  "merch-idea": {
    title: "No related records yet",
    description:
      "Product listings, mockup prompts, and campaigns with matching niche or product names appear here.",
    primaryActionLabel: "Create Product Listing",
    primaryActionHref: "/product-listings",
    secondaryActionLabel: "Create Mockup Prompt",
    secondaryActionHref: "/mockup-prompts",
  },
  "product-listing": {
    title: "No related records yet",
    description:
      "Merch ideas, mockups, social posts, and email campaigns with matching product details show here.",
    primaryActionLabel: "Create Merch Idea",
    primaryActionHref: "/merch-ideas",
  },
  "mockup-prompt": {
    title: "No related records yet",
    description:
      "Related merch ideas, product listings, thumbnails, and campaigns match by niche or project name.",
    primaryActionLabel: "Create Product Listing",
    primaryActionHref: "/product-listings",
  },
  "artist-crm": {
    title: "No related records yet",
    description:
      "Campaigns, releases, YouTube assets, and analytics linked by artist name will appear here.",
    primaryActionLabel: "Create Campaign",
    primaryActionHref: "/campaigns",
    secondaryActionLabel: "Seed demo data",
    secondaryActionHref: "/backups",
  },
}
