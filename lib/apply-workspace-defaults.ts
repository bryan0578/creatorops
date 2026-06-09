import type {
  CampaignFormValues,
  EmailCampaignFormValues,
  MerchIdeaFormValues,
  MockupPromptFormValues,
  ProductListingFormValues,
  ReleasePlanFormValues,
  SocialRepurposingFormValues,
  WorkspaceSettingsRecord,
  YouTubePackageFormValues,
  YouTubeThumbnailFormValues,
} from "@/lib/types"

export type WorkspaceDefaultsModule =
  | "youtube-packaging"
  | "youtube-thumbnail"
  | "release-plan"
  | "social-repurposing"
  | "email-campaign"
  | "merch-idea"
  | "product-listing"
  | "mockup-prompt"
  | "campaign"

function isEmpty(value: string | undefined | null): boolean {
  return !String(value ?? "").trim()
}

export function fillEmptyStringFields<T extends Record<string, string>>(
  current: T,
  patches: Partial<T>,
): T {
  const next = { ...current }
  for (const key of Object.keys(patches) as (keyof T)[]) {
    const value = patches[key]
    if (typeof value === "string" && value.trim() && isEmpty(next[key])) {
      next[key] = value as T[keyof T]
    }
  }
  return next
}

function brandColorHint(settings: WorkspaceSettingsRecord): string {
  return [
    settings.brandPrimaryColor,
    settings.brandSecondaryColor,
    settings.brandAccentColor,
  ]
    .filter(Boolean)
    .join(", ")
}

export function applyWorkspaceDefaultsToYouTubePackaging(
  form: YouTubePackageFormValues,
  settings: WorkspaceSettingsRecord,
): YouTubePackageFormValues {
  return fillEmptyStringFields(form, {
    channelName: settings.defaultYouTubeChannel,
    streamingLink: settings.defaultStreamingLink,
    primaryGoal: settings.defaultPrimaryGoal,
    targetListener: settings.defaultAudience,
    notes: settings.notes,
  })
}

export function applyWorkspaceDefaultsToYouTubeThumbnail(
  form: YouTubeThumbnailFormValues,
  settings: WorkspaceSettingsRecord,
): YouTubeThumbnailFormValues {
  const colorHint = brandColorHint(settings)
  return fillEmptyStringFields(form, {
    targetAudience: settings.defaultAudience,
    visualTheme: settings.defaultVisualStyle,
    brandingNotes: [settings.defaultBrandTone, settings.defaultVisualStyle]
      .filter(Boolean)
      .join(" · "),
    colorDirection: colorHint,
    notes: settings.notes,
  })
}

export function applyWorkspaceDefaultsToReleasePlan(
  form: ReleasePlanFormValues,
  settings: WorkspaceSettingsRecord,
): ReleasePlanFormValues {
  return fillEmptyStringFields(form, {
    youtubeChannel: settings.defaultYouTubeChannel,
    targetAudience: settings.defaultAudience,
    primaryGoal: settings.defaultPrimaryGoal,
    streamingPlatforms: settings.defaultPlatforms,
    notes: settings.notes,
  })
}

export function applyWorkspaceDefaultsToSocialRepurposing(
  form: SocialRepurposingFormValues,
  settings: WorkspaceSettingsRecord,
): SocialRepurposingFormValues {
  return fillEmptyStringFields(form, {
    platforms: settings.defaultPlatforms,
    callToAction: settings.defaultCTA,
    businessArea: settings.defaultBusinessArea,
    audience: settings.defaultAudience,
    goal: settings.defaultPrimaryGoal,
    tone: settings.defaultBrandTone,
    notes: settings.notes,
  })
}

export function applyWorkspaceDefaultsToEmailCampaign(
  form: EmailCampaignFormValues,
  settings: WorkspaceSettingsRecord,
): EmailCampaignFormValues {
  return fillEmptyStringFields(form, {
    senderName: settings.defaultEmailSender || settings.labelName,
    businessArea: settings.defaultBusinessArea,
    callToAction: settings.defaultCTA,
    audience: settings.defaultAudience,
    notes: settings.notes,
  })
}

export function applyWorkspaceDefaultsToMerchIdea(
  form: MerchIdeaFormValues,
  settings: WorkspaceSettingsRecord,
): MerchIdeaFormValues {
  return fillEmptyStringFields(form, {
    storeType: settings.defaultStoreType,
    tone: settings.defaultBrandTone,
    audience: settings.defaultAudience,
    primaryGoal: settings.defaultPrimaryGoal,
    notes: settings.notes,
  })
}

export function applyWorkspaceDefaultsToProductListing(
  form: ProductListingFormValues,
  settings: WorkspaceSettingsRecord,
): ProductListingFormValues {
  return fillEmptyStringFields(form, {
    storeName: settings.defaultStoreName,
    tone: settings.defaultBrandTone,
    audience: settings.defaultAudience,
    notes: settings.notes,
  })
}

export function applyWorkspaceDefaultsToMockupPrompt(
  form: MockupPromptFormValues,
  settings: WorkspaceSettingsRecord,
): MockupPromptFormValues {
  return fillEmptyStringFields(form, {
    visualStyle: settings.defaultVisualStyle,
    audience: settings.defaultAudience,
    platformUse: settings.defaultStoreType,
    brandNotes: settings.defaultBrandTone,
    colors: brandColorHint(settings),
    notes: settings.notes,
  })
}

export function applyWorkspaceDefaultsToCampaign(
  form: CampaignFormValues,
  settings: WorkspaceSettingsRecord,
): CampaignFormValues {
  return fillEmptyStringFields(form, {
    primaryGoal: settings.defaultPrimaryGoal,
    targetAudience: settings.defaultAudience,
    niche: settings.defaultBusinessArea,
    notes: settings.notes,
  })
}

export function applyWorkspaceDefaults<T extends Record<string, string>>(
  module: WorkspaceDefaultsModule,
  form: T,
  settings: WorkspaceSettingsRecord,
): T {
  switch (module) {
    case "youtube-packaging":
      return applyWorkspaceDefaultsToYouTubePackaging(
        form as YouTubePackageFormValues,
        settings,
      ) as T
    case "youtube-thumbnail":
      return applyWorkspaceDefaultsToYouTubeThumbnail(
        form as YouTubeThumbnailFormValues,
        settings,
      ) as T
    case "release-plan":
      return applyWorkspaceDefaultsToReleasePlan(
        form as ReleasePlanFormValues,
        settings,
      ) as T
    case "social-repurposing":
      return applyWorkspaceDefaultsToSocialRepurposing(
        form as SocialRepurposingFormValues,
        settings,
      ) as T
    case "email-campaign":
      return applyWorkspaceDefaultsToEmailCampaign(
        form as EmailCampaignFormValues,
        settings,
      ) as T
    case "merch-idea":
      return applyWorkspaceDefaultsToMerchIdea(
        form as MerchIdeaFormValues,
        settings,
      ) as T
    case "product-listing":
      return applyWorkspaceDefaultsToProductListing(
        form as ProductListingFormValues,
        settings,
      ) as T
    case "mockup-prompt":
      return applyWorkspaceDefaultsToMockupPrompt(
        form as MockupPromptFormValues,
        settings,
      ) as T
    case "campaign":
      return applyWorkspaceDefaultsToCampaign(
        form as CampaignFormValues,
        settings,
      ) as T
    default:
      return form
  }
}

export function countAppliedEmptyFields<T extends Record<string, string>>(
  before: T,
  after: T,
): number {
  let count = 0
  for (const key of Object.keys(after) as (keyof T)[]) {
    if (isEmpty(before[key]) && !isEmpty(after[key])) count += 1
  }
  return count
}
