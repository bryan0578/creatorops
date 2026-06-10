import type { WorkspaceSettingsRecord } from "@/lib/types"

export const WORKSPACE_SETTINGS_ID = "creatorops-workspace-default"

export function defaultWorkspaceSettingsRecord(
  now = Date.now(),
): WorkspaceSettingsRecord {
  return {
    id: WORKSPACE_SETTINGS_ID,
    workspaceName: "CreatorOps Dashboard",
    labelName: "Dorsyth Records",
    defaultYouTubeChannel: "Dorsyth Records",
    defaultStoreName: "Dorsyth Records Store",
    defaultStoreType: "Fourthwall",
    defaultMerchStoreLink: "",
    defaultWebsiteLink: "",
    defaultStreamingLink: "Coming soon",
    defaultPlatforms: "YouTube, YouTube Shorts, TikTok, Instagram, X, email",
    defaultCTA:
      "Watch the full video, comment what scene it makes you imagine, and subscribe for more AI music.",
    defaultHashtagSet: "",
    defaultBusinessArea: "AI Music",
    defaultPrimaryGoal:
      "Grow YouTube views, build artist identity, encourage comments, and support merch/product promotion.",
    defaultBrandTone: "Dark, cinematic, creator-focused, practical, modern",
    defaultVisualStyle: "Dark mode, violet/cyan accents, clean command-center UI",
    defaultAudience: "",
    defaultEmailSender: "Dorsyth Records",
    brandPrimaryColor: "#8B5CF6",
    brandSecondaryColor: "#06B6D4",
    brandAccentColor: "#EF4444",
    notes: "",
    aiGenerationEnabled: false,
    aiDefaultProvider: "openai",
    aiDefaultModel: "",
    aiTemperature: 0.7,
    aiMaxOutputTokens: 2048,
    aiSystemStylePreference: "",
    aiSaveGenerationsAsPromptRuns: true,
    aiIncludeCampaignContextByDefault: true,
    aiIncludeLearningsByDefault: true,
    aiIncludeQualityNotesByDefault: true,
    createdAt: now,
    updatedAt: now,
  }
}

export function normalizeWorkspaceSettingsRecord(
  record: Partial<WorkspaceSettingsRecord> &
    Pick<WorkspaceSettingsRecord, "id">,
): WorkspaceSettingsRecord {
  const defaults = defaultWorkspaceSettingsRecord(record.createdAt ?? Date.now())
  return {
    id: record.id,
    workspaceName: record.workspaceName ?? defaults.workspaceName,
    labelName: record.labelName ?? defaults.labelName,
    defaultYouTubeChannel:
      record.defaultYouTubeChannel ?? defaults.defaultYouTubeChannel,
    defaultStoreName: record.defaultStoreName ?? defaults.defaultStoreName,
    defaultStoreType: record.defaultStoreType ?? defaults.defaultStoreType,
    defaultMerchStoreLink:
      record.defaultMerchStoreLink ?? defaults.defaultMerchStoreLink,
    defaultWebsiteLink: record.defaultWebsiteLink ?? defaults.defaultWebsiteLink,
    defaultStreamingLink:
      record.defaultStreamingLink ?? defaults.defaultStreamingLink,
    defaultPlatforms: record.defaultPlatforms ?? defaults.defaultPlatforms,
    defaultCTA: record.defaultCTA ?? defaults.defaultCTA,
    defaultHashtagSet: record.defaultHashtagSet ?? defaults.defaultHashtagSet,
    defaultBrandTone: record.defaultBrandTone ?? defaults.defaultBrandTone,
    defaultVisualStyle: record.defaultVisualStyle ?? defaults.defaultVisualStyle,
    defaultAudience: record.defaultAudience ?? defaults.defaultAudience,
    defaultEmailSender: record.defaultEmailSender ?? defaults.defaultEmailSender,
    defaultBusinessArea: record.defaultBusinessArea ?? defaults.defaultBusinessArea,
    defaultPrimaryGoal: record.defaultPrimaryGoal ?? defaults.defaultPrimaryGoal,
    brandPrimaryColor: record.brandPrimaryColor ?? defaults.brandPrimaryColor,
    brandSecondaryColor:
      record.brandSecondaryColor ?? defaults.brandSecondaryColor,
    brandAccentColor: record.brandAccentColor ?? defaults.brandAccentColor,
    notes: record.notes ?? defaults.notes,
    aiGenerationEnabled: record.aiGenerationEnabled ?? defaults.aiGenerationEnabled,
    aiDefaultProvider: record.aiDefaultProvider ?? defaults.aiDefaultProvider,
    aiDefaultModel: record.aiDefaultModel ?? defaults.aiDefaultModel,
    aiTemperature: record.aiTemperature ?? defaults.aiTemperature,
    aiMaxOutputTokens: record.aiMaxOutputTokens ?? defaults.aiMaxOutputTokens,
    aiSystemStylePreference:
      record.aiSystemStylePreference ?? defaults.aiSystemStylePreference,
    aiSaveGenerationsAsPromptRuns:
      record.aiSaveGenerationsAsPromptRuns ?? defaults.aiSaveGenerationsAsPromptRuns,
    aiIncludeCampaignContextByDefault:
      record.aiIncludeCampaignContextByDefault ??
      defaults.aiIncludeCampaignContextByDefault,
    aiIncludeLearningsByDefault:
      record.aiIncludeLearningsByDefault ?? defaults.aiIncludeLearningsByDefault,
    aiIncludeQualityNotesByDefault:
      record.aiIncludeQualityNotesByDefault ?? defaults.aiIncludeQualityNotesByDefault,
    createdAt: record.createdAt ?? defaults.createdAt,
    updatedAt: record.updatedAt ?? defaults.updatedAt,
  }
}

export function workspaceSettingsToFormValues(
  record: WorkspaceSettingsRecord,
): Omit<WorkspaceSettingsRecord, "id" | "createdAt" | "updatedAt"> {
  const {
    id: _id,
    createdAt: _c,
    updatedAt: _u,
    ...form
  } = record
  return form
}
