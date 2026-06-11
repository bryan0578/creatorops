export function buildIntegrationsHref(params: {
  campaignId?: string
  campaignName?: string
  recordId?: string
  assetId?: string
  tab?: string
  platform?: string
  linkType?: string
  sourceRecordType?: string
  sourceRecordId?: string
}): string {
  const search = new URLSearchParams()
  if (params.campaignId) search.set("campaignId", params.campaignId)
  if (params.campaignName) search.set("campaignName", params.campaignName)
  if (params.recordId) search.set("recordId", params.recordId)
  if (params.assetId) search.set("assetId", params.assetId)
  if (params.tab) search.set("tab", params.tab)
  if (params.platform) search.set("platform", params.platform)
  if (params.linkType) search.set("linkType", params.linkType)
  if (params.sourceRecordType) search.set("sourceRecordType", params.sourceRecordType)
  if (params.sourceRecordId) search.set("sourceRecordId", params.sourceRecordId)
  const qs = search.toString()
  return qs ? `/integrations?${qs}` : "/integrations"
}
