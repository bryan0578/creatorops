import {
  normalizePresetRecord,
  parsePresetTags,
  parsePresetValues,
  stringifyPresetTags,
  stringifyPresetValues,
} from "@/lib/presets"
import type { PresetRecord } from "@/lib/types"

export { normalizePresetRecord }

export function presetToPrismaCreate(record: PresetRecord) {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    presetType: record.presetType,
    category: record.category,
    tags: stringifyPresetTags(record.tags),
    values: stringifyPresetValues(record.values),
    notes: record.notes,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt),
  }
}

export function presetToPrismaUpdate(record: PresetRecord) {
  const { id: _id, createdAt: _createdAt, ...rest } = presetToPrismaCreate(record)
  return rest
}

export function prismaPresetToPresetRecord(row: {
  id: string
  name: string
  description: string
  presetType: string
  category: string
  tags: string
  values: string
  notes: string
  createdAt: Date
  updatedAt: Date
}): PresetRecord {
  return normalizePresetRecord({
    id: row.id,
    name: row.name,
    description: row.description,
    presetType: row.presetType,
    category: row.category,
    tags: parsePresetTags(row.tags),
    values: parsePresetValues(row.values),
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  })
}
