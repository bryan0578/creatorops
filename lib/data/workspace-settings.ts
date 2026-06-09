import {
  normalizeWorkspaceSettingsRecord,
  WORKSPACE_SETTINGS_ID,
} from "@/lib/workspace-settings"
import type { WorkspaceSettingsRecord } from "@/lib/types"

export { normalizeWorkspaceSettingsRecord } from "@/lib/workspace-settings"

export function workspaceSettingsToPrismaCreate(record: WorkspaceSettingsRecord) {
  const normalized = normalizeWorkspaceSettingsRecord(record)
  return {
    id: normalized.id,
    workspaceName: normalized.workspaceName,
    labelName: normalized.labelName,
    defaultYouTubeChannel: normalized.defaultYouTubeChannel,
    defaultStoreName: normalized.defaultStoreName,
    defaultStoreType: normalized.defaultStoreType,
    defaultMerchStoreLink: normalized.defaultMerchStoreLink,
    defaultWebsiteLink: normalized.defaultWebsiteLink,
    defaultStreamingLink: normalized.defaultStreamingLink,
    defaultPlatforms: normalized.defaultPlatforms,
    defaultCTA: normalized.defaultCTA,
    defaultHashtagSet: normalized.defaultHashtagSet,
    defaultBrandTone: normalized.defaultBrandTone,
    defaultVisualStyle: normalized.defaultVisualStyle,
    defaultAudience: normalized.defaultAudience,
    defaultEmailSender: normalized.defaultEmailSender,
    defaultBusinessArea: normalized.defaultBusinessArea,
    defaultPrimaryGoal: normalized.defaultPrimaryGoal,
    brandPrimaryColor: normalized.brandPrimaryColor,
    brandSecondaryColor: normalized.brandSecondaryColor,
    brandAccentColor: normalized.brandAccentColor,
    notes: normalized.notes,
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function workspaceSettingsToPrismaUpdate(record: WorkspaceSettingsRecord) {
  const { id: _id, createdAt: _c, ...rest } = workspaceSettingsToPrismaCreate(record)
  return rest
}

export function prismaWorkspaceSettingsToRecord(row: {
  id: string
  workspaceName: string
  labelName: string
  defaultYouTubeChannel: string
  defaultStoreName: string
  defaultStoreType: string
  defaultMerchStoreLink: string
  defaultWebsiteLink: string
  defaultStreamingLink: string
  defaultPlatforms: string
  defaultCTA: string
  defaultHashtagSet: string
  defaultBrandTone: string
  defaultVisualStyle: string
  defaultAudience: string
  defaultEmailSender: string
  defaultBusinessArea: string
  defaultPrimaryGoal: string
  brandPrimaryColor: string
  brandSecondaryColor: string
  brandAccentColor: string
  notes: string
  createdAt: Date
  updatedAt: Date
}): WorkspaceSettingsRecord {
  return normalizeWorkspaceSettingsRecord({
    id: row.id || WORKSPACE_SETTINGS_ID,
    workspaceName: row.workspaceName,
    labelName: row.labelName,
    defaultYouTubeChannel: row.defaultYouTubeChannel,
    defaultStoreName: row.defaultStoreName,
    defaultStoreType: row.defaultStoreType,
    defaultMerchStoreLink: row.defaultMerchStoreLink,
    defaultWebsiteLink: row.defaultWebsiteLink,
    defaultStreamingLink: row.defaultStreamingLink,
    defaultPlatforms: row.defaultPlatforms,
    defaultCTA: row.defaultCTA,
    defaultHashtagSet: row.defaultHashtagSet,
    defaultBrandTone: row.defaultBrandTone,
    defaultVisualStyle: row.defaultVisualStyle,
    defaultAudience: row.defaultAudience,
    defaultEmailSender: row.defaultEmailSender,
    defaultBusinessArea: row.defaultBusinessArea,
    defaultPrimaryGoal: row.defaultPrimaryGoal,
    brandPrimaryColor: row.brandPrimaryColor,
    brandSecondaryColor: row.brandSecondaryColor,
    brandAccentColor: row.brandAccentColor,
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
