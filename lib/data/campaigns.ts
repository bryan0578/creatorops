import {
  normalizeCampaignRecord,
  parseCampaignLinkedRecords,
  parseCampaignTasks,
  stringifyJsonArray,
} from "@/lib/campaigns"
import type { CampaignRecord } from "@/lib/types"
import type { Campaign as PrismaCampaign } from "@/lib/generated/prisma/client"

export { normalizeCampaignRecord } from "@/lib/campaigns"

export function campaignToPrismaCreate(record: CampaignRecord) {
  const normalized = normalizeCampaignRecord(record)
  return {
    id: normalized.id,
    campaignName: normalized.campaignName,
    campaignType: normalized.campaignType,
    status: normalized.status,
    priority: normalized.priority,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    niche: normalized.niche,
    primaryGoal: normalized.primaryGoal,
    targetAudience: normalized.targetAudience,
    startDate: normalized.startDate,
    launchDate: normalized.launchDate,
    endDate: normalized.endDate,
    description: normalized.description,
    notes: normalized.notes,
    lessonsLearned: normalized.lessonsLearned,
    whatWorked: normalized.whatWorked,
    whatToImprove: normalized.whatToImprove,
    linkedRecords: stringifyJsonArray(normalized.linkedRecords),
    tasks: stringifyJsonArray(normalized.tasks),
    createdAt: new Date(normalized.createdAt),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function campaignToPrismaUpdate(record: CampaignRecord) {
  const normalized = normalizeCampaignRecord(record)
  return {
    campaignName: normalized.campaignName,
    campaignType: normalized.campaignType,
    status: normalized.status,
    priority: normalized.priority,
    artistName: normalized.artistName,
    songTitle: normalized.songTitle,
    productName: normalized.productName,
    niche: normalized.niche,
    primaryGoal: normalized.primaryGoal,
    targetAudience: normalized.targetAudience,
    startDate: normalized.startDate,
    launchDate: normalized.launchDate,
    endDate: normalized.endDate,
    description: normalized.description,
    notes: normalized.notes,
    lessonsLearned: normalized.lessonsLearned,
    whatWorked: normalized.whatWorked,
    whatToImprove: normalized.whatToImprove,
    linkedRecords: stringifyJsonArray(normalized.linkedRecords),
    tasks: stringifyJsonArray(normalized.tasks),
    updatedAt: new Date(normalized.updatedAt),
  }
}

export function prismaCampaignToCampaignRecord(row: PrismaCampaign): CampaignRecord {
  return normalizeCampaignRecord({
    id: row.id,
    campaignName: row.campaignName,
    campaignType: row.campaignType,
    status: row.status,
    priority: row.priority,
    artistName: row.artistName,
    songTitle: row.songTitle,
    productName: row.productName,
    niche: row.niche,
    primaryGoal: row.primaryGoal,
    targetAudience: row.targetAudience,
    startDate: row.startDate,
    launchDate: row.launchDate,
    endDate: row.endDate,
    description: row.description,
    notes: row.notes,
    lessonsLearned: row.lessonsLearned,
    whatWorked: row.whatWorked,
    whatToImprove: row.whatToImprove,
    linkedRecords: parseCampaignLinkedRecords(row.linkedRecords),
    tasks: parseCampaignTasks(row.tasks),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
