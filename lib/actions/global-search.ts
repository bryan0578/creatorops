"use server"

import {
  GLOBAL_SEARCH_FETCH_BATCH,
  GLOBAL_SEARCH_LIMIT_PER_TYPE,
  GLOBAL_SEARCH_TYPE_META,
  buildResultHref,
  filterGroupsByCategory,
  matchFields,
  normalizeSearchQuery,
  parseTagsArray,
  parseTagsJson,
  previewText,
  type GlobalSearchFilter,
  type GlobalSearchGroup,
  type GlobalSearchResponse,
  type GlobalSearchResult,
  type GlobalSearchResultType,
} from "@/lib/data/global-search"
import { prisma } from "@/lib/prisma"

function makeResult(
  type: GlobalSearchResultType,
  id: string,
  title: string,
  subtitle: string,
  description: string,
  createdAt: Date,
  updatedAt: Date,
  matchedFields?: string[],
): GlobalSearchResult {
  const meta = GLOBAL_SEARCH_TYPE_META[type]
  const link = buildResultHref(type, id)
  return {
    id,
    type,
    typeLabel: meta.typeLabel,
    category: meta.category,
    title: title || "Untitled",
    subtitle,
    description,
    href: link.href,
    createdAt: createdAt.getTime(),
    updatedAt: updatedAt.getTime(),
    matchedFields,
    directOpen: link.directOpen,
    openNote: link.openNote,
  }
}

function pushMatches<T extends Record<string, unknown>>(
  rows: T[],
  query: string,
  fieldKeys: string[],
  fieldLabels: Record<string, string>,
  mapRow: (
    row: T,
    matchedFields: string[],
  ) => GlobalSearchResult | null,
  limit: number,
): GlobalSearchResult[] {
  const results: GlobalSearchResult[] = []
  for (const row of rows) {
    if (results.length >= limit) break
    const { matched, matchedFields } = matchFields(row, fieldKeys, query, fieldLabels)
    if (!matched) continue
    const mapped = mapRow(row, matchedFields)
    if (mapped) results.push(mapped)
  }
  return results
}

async function searchPrompts(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.prompt.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows.map((row) => ({
      ...row,
      tagsText: parseTagsJson(row.tags),
    })),
    query,
    ["name", "category", "description", "promptText", "tagsText", "notes"],
    {
      name: "Name",
      category: "Category",
      description: "Description",
      promptText: "Prompt text",
      tagsText: "Tags",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "prompt",
        row.id as string,
        row.name as string,
        String(row.category ?? ""),
        previewText(row.description) || previewText(row.promptText),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchWorkflows(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.workflow.findMany({
    include: { steps: { orderBy: { sortOrder: "asc" } } },
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  const results: GlobalSearchResult[] = []
  for (const row of rows) {
    if (results.length >= GLOBAL_SEARCH_LIMIT_PER_TYPE) break

    const stepText = row.steps
      .map((s) => `${s.title} ${s.description}`)
      .join(" ")

    const record = {
      ...row,
      stepText,
    }

    const fieldKeys = [
      "name",
      "category",
      "description",
      "status",
      "notes",
      "stepText",
    ]
    const { matched, matchedFields } = matchFields(
      record,
      fieldKeys,
      query,
      {
        name: "Name",
        category: "Category",
        description: "Description",
        status: "Status",
        notes: "Notes",
        stepText: "Steps",
      },
    )

    if (!matched) continue

    results.push(
      makeResult(
        "workflow",
        row.id,
        row.name,
        `${row.category} · ${row.status}`,
        previewText(row.description) || previewText(stepText),
        row.createdAt,
        row.updatedAt,
        matchedFields,
      ),
    )
  }
  return results
}

async function searchPromptRuns(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.promptRun.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows.map((row) => ({
      ...row,
      tagsText: parseTagsArray(row.tags).join(" "),
    })),
    query,
    [
      "promptName",
      "category",
      "campaignName",
      "moduleType",
      "completedPrompt",
      "aiResponse",
      "notes",
      "tagsText",
    ],
    {
      promptName: "Prompt name",
      category: "Category",
      campaignName: "Campaign",
      moduleType: "Module",
      completedPrompt: "Completed prompt",
      aiResponse: "AI response",
      notes: "Notes",
      tagsText: "Tags",
    },
    (row, matchedFields) => {
      const subtitle = [
        row.moduleType,
        row.campaignName,
        row.category,
      ]
        .filter(Boolean)
        .join(" · ")
      return makeResult(
        "prompt-run",
        row.id as string,
        row.promptName as string,
        subtitle,
        previewText(row.aiResponse) || previewText(row.completedPrompt),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      )
    },
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchWorkflowRuns(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.workflowRun.findMany({
    include: { stepRuns: { orderBy: { sortOrder: "asc" } } },
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  const results: GlobalSearchResult[] = []
  for (const row of rows) {
    if (results.length >= GLOBAL_SEARCH_LIMIT_PER_TYPE) break

    const stepText = row.stepRuns
      .map((s) => `${s.title} ${s.description} ${s.notes}`)
      .join(" ")

    const record = { ...row, stepText }
    const { matched, matchedFields } = matchFields(
      record,
      ["workflowName", "category", "status", "notes", "stepText"],
      query,
      {
        workflowName: "Workflow name",
        category: "Category",
        status: "Status",
        notes: "Notes",
        stepText: "Step notes",
      },
    )

    if (!matched) continue

    results.push(
      makeResult(
        "workflow-run",
        row.id,
        row.workflowName,
        `${row.category} · ${row.status}`,
        previewText(row.notes) || previewText(stepText),
        row.startedAt,
        row.updatedAt,
        matchedFields,
      ),
    )
  }
  return results
}

async function searchYouTubePackages(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.youTubePackage.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows,
    query,
    [
      "trackTitle",
      "artistName",
      "channelName",
      "genre",
      "mood",
      "visualTheme",
      "finalTitle",
      "finalDescription",
      "notes",
    ],
    {
      trackTitle: "Track title",
      artistName: "Artist",
      channelName: "Channel",
      genre: "Genre",
      mood: "Mood",
      visualTheme: "Visual theme",
      finalTitle: "Final title",
      finalDescription: "Final description",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "youtube-package",
        row.id as string,
        (row.finalTitle as string) || (row.trackTitle as string),
        [row.artistName, row.channelName].filter(Boolean).join(" · "),
        previewText(row.finalDescription) || previewText(row.notes),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchYouTubeThumbnails(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.youTubeThumbnail.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows,
    query,
    [
      "trackTitle",
      "artistName",
      "videoTitle",
      "contentFormat",
      "videoType",
      "finalTextOverlay",
      "finalConcept",
      "notes",
    ],
    {
      trackTitle: "Track title",
      artistName: "Artist",
      videoTitle: "Video title",
      contentFormat: "Content format",
      videoType: "Video type",
      finalTextOverlay: "Final text overlay",
      finalConcept: "Final concept",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "youtube-thumbnail",
        row.id as string,
        (row.videoTitle as string) || (row.trackTitle as string),
        [row.artistName, row.contentFormat].filter(Boolean).join(" · "),
        previewText(row.finalConcept) || previewText(row.finalTextOverlay),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchReleasePlans(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.releasePlan.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows,
    query,
    [
      "artistName",
      "songTitle",
      "genre",
      "releaseDate",
      "youtubeChannel",
      "primaryGoal",
      "finalStrategySummary",
      "notes",
    ],
    {
      artistName: "Artist",
      songTitle: "Song title",
      genre: "Genre",
      releaseDate: "Release date",
      youtubeChannel: "YouTube channel",
      primaryGoal: "Primary goal",
      finalStrategySummary: "Strategy summary",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "release-plan",
        row.id as string,
        row.songTitle as string,
        [row.artistName, row.releaseDate].filter(Boolean).join(" · "),
        previewText(row.finalStrategySummary) || previewText(row.notes),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchArtists(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.artist.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows,
    query,
    [
      "artistName",
      "artistType",
      "genre",
      "subGenres",
      "mood",
      "brandDescription",
      "visualIdentity",
      "targetAudience",
      "notes",
    ],
    {
      artistName: "Artist name",
      artistType: "Artist type",
      genre: "Genre",
      subGenres: "Sub-genres",
      mood: "Mood",
      brandDescription: "Brand description",
      visualIdentity: "Visual identity",
      targetAudience: "Target audience",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "artist",
        row.id as string,
        row.artistName as string,
        [row.artistType, row.genre].filter(Boolean).join(" · "),
        previewText(row.brandDescription) || previewText(row.notes),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchMerchIdeas(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.merchIdea.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows,
    query,
    [
      "niche",
      "audience",
      "productType",
      "storeType",
      "selectedConceptName",
      "selectedSlogan",
      "notes",
    ],
    {
      niche: "Niche",
      audience: "Audience",
      productType: "Product type",
      storeType: "Store type",
      selectedConceptName: "Selected concept",
      selectedSlogan: "Selected slogan",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "merch-idea",
        row.id as string,
        (row.selectedConceptName as string) || (row.niche as string),
        [row.productType, row.storeType].filter(Boolean).join(" · "),
        previewText(row.selectedSlogan) || previewText(row.notes),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchProductListings(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.productListing.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows,
    query,
    [
      "productType",
      "niche",
      "storeName",
      "primaryKeyword",
      "finalTitle",
      "finalTags",
      "notes",
    ],
    {
      productType: "Product type",
      niche: "Niche",
      storeName: "Store name",
      primaryKeyword: "Primary keyword",
      finalTitle: "Final title",
      finalTags: "Final tags",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "product-listing",
        row.id as string,
        (row.finalTitle as string) || (row.primaryKeyword as string),
        [row.productType, row.storeName].filter(Boolean).join(" · "),
        previewText(row.finalTags) || previewText(row.notes),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchSocialRepurposing(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.socialRepurposing.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows,
    query,
    [
      "campaignName",
      "sourceContent",
      "businessArea",
      "goal",
      "platforms",
      "finalCoreMessage",
      "notes",
    ],
    {
      campaignName: "Campaign name",
      sourceContent: "Source content",
      businessArea: "Business area",
      goal: "Goal",
      platforms: "Platforms",
      finalCoreMessage: "Final core message",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "social-repurposing",
        row.id as string,
        row.campaignName as string,
        [row.businessArea, row.platforms].filter(Boolean).join(" · "),
        previewText(row.finalCoreMessage) || previewText(row.sourceContent),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchAnalytics(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.analyticsRecord.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows,
    query,
    [
      "itemName",
      "itemType",
      "relatedArtist",
      "relatedSong",
      "relatedCampaign",
      "platform",
      "titleUsed",
      "notes",
    ],
    {
      itemName: "Item name",
      itemType: "Item type",
      relatedArtist: "Related artist",
      relatedSong: "Related song",
      relatedCampaign: "Related campaign",
      platform: "Platform",
      titleUsed: "Title used",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "analytics",
        row.id as string,
        row.itemName as string,
        [row.itemType, row.platform].filter(Boolean).join(" · "),
        previewText(row.titleUsed) || previewText(row.notes),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchMockupPrompts(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.mockupPrompt.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows,
    query,
    [
      "projectName",
      "mockupType",
      "productType",
      "niche",
      "visualStyle",
      "finalImagePrompt",
      "notes",
    ],
    {
      projectName: "Project name",
      mockupType: "Mockup type",
      productType: "Product type",
      niche: "Niche",
      visualStyle: "Visual style",
      finalImagePrompt: "Final image prompt",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "mockup-prompt",
        row.id as string,
        row.projectName as string,
        [row.mockupType, row.productType].filter(Boolean).join(" · "),
        previewText(row.finalImagePrompt) || previewText(row.notes),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchPresets(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.preset.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows.map((row) => ({
      ...row,
      tagsText: parseTagsArray(row.tags).join(" "),
    })),
    query,
    ["name", "description", "presetType", "category", "tagsText", "notes"],
    {
      name: "Name",
      description: "Description",
      presetType: "Preset type",
      category: "Category",
      tagsText: "Tags",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "preset",
        row.id as string,
        row.name as string,
        [row.presetType, row.category].filter(Boolean).join(" · "),
        previewText(row.description) || previewText(row.notes),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchCampaigns(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.campaign.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows,
    query,
    [
      "campaignName",
      "campaignType",
      "status",
      "priority",
      "artistName",
      "songTitle",
      "productName",
      "niche",
      "primaryGoal",
      "targetAudience",
      "description",
      "notes",
    ],
    {
      campaignName: "Campaign name",
      campaignType: "Campaign type",
      status: "Status",
      priority: "Priority",
      artistName: "Artist",
      songTitle: "Song",
      productName: "Product",
      niche: "Niche",
      primaryGoal: "Primary goal",
      targetAudience: "Target audience",
      description: "Description",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "campaign",
        row.id as string,
        row.campaignName as string,
        [row.campaignType, row.status, row.priority].filter(Boolean).join(" · "),
        previewText(row.description) || previewText(row.primaryGoal),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchExperiments(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.experiment.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows,
    query,
    [
      "experimentName",
      "experimentType",
      "campaignName",
      "platform",
      "hypothesis",
      "variantA",
      "variantB",
      "variantC",
      "winner",
      "resultSummary",
      "notes",
    ],
    {
      experimentName: "Experiment name",
      experimentType: "Experiment type",
      campaignName: "Campaign name",
      platform: "Platform",
      hypothesis: "Hypothesis",
      variantA: "Variant A",
      variantB: "Variant B",
      variantC: "Variant C",
      winner: "Winner",
      resultSummary: "Result summary",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "experiment",
        row.id as string,
        row.experimentName as string,
        [row.experimentType, row.status, row.platform].filter(Boolean).join(" · "),
        previewText(row.hypothesis) || previewText(row.resultSummary),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

async function searchEmailCampaigns(query: string): Promise<GlobalSearchResult[]> {
  const rows = await prisma.emailCampaign.findMany({
    orderBy: { updatedAt: "desc" },
    take: GLOBAL_SEARCH_FETCH_BATCH,
  })

  return pushMatches(
    rows,
    query,
    [
      "campaignName",
      "campaignType",
      "businessArea",
      "productOrReleaseName",
      "finalSubjectLine",
      "senderName",
      "notes",
    ],
    {
      campaignName: "Campaign name",
      campaignType: "Campaign type",
      businessArea: "Business area",
      productOrReleaseName: "Product or release",
      finalSubjectLine: "Final subject line",
      senderName: "Sender name",
      notes: "Notes",
    },
    (row, matchedFields) =>
      makeResult(
        "email-campaign",
        row.id as string,
        row.campaignName as string,
        [row.campaignType, row.businessArea].filter(Boolean).join(" · "),
        previewText(row.finalSubjectLine) || previewText(row.notes),
        row.createdAt as Date,
        row.updatedAt as Date,
        matchedFields,
      ),
    GLOBAL_SEARCH_LIMIT_PER_TYPE,
  )
}

const SEARCHERS: {
  type: GlobalSearchResultType
  search: (query: string) => Promise<GlobalSearchResult[]>
}[] = [
  { type: "prompt", search: searchPrompts },
  { type: "workflow", search: searchWorkflows },
  { type: "prompt-run", search: searchPromptRuns },
  { type: "workflow-run", search: searchWorkflowRuns },
  { type: "youtube-package", search: searchYouTubePackages },
  { type: "youtube-thumbnail", search: searchYouTubeThumbnails },
  { type: "release-plan", search: searchReleasePlans },
  { type: "artist", search: searchArtists },
  { type: "merch-idea", search: searchMerchIdeas },
  { type: "product-listing", search: searchProductListings },
  { type: "social-repurposing", search: searchSocialRepurposing },
  { type: "analytics", search: searchAnalytics },
  { type: "mockup-prompt", search: searchMockupPrompts },
  { type: "email-campaign", search: searchEmailCampaigns },
  { type: "experiment", search: searchExperiments },
  { type: "campaign", search: searchCampaigns },
  { type: "preset", search: searchPresets },
]

/**
 * Search across all major CreatorOps record types in local SQLite.
 */
export async function searchGlobal(
  rawQuery: string,
  filter: GlobalSearchFilter = "all",
): Promise<GlobalSearchResponse> {
  const query = normalizeSearchQuery(rawQuery)

  if (!query) {
    return { query: "", filter, groups: [], totalResults: 0 }
  }

  const groupResults = await Promise.all(
    SEARCHERS.map(async ({ type, search }) => {
      const meta = GLOBAL_SEARCH_TYPE_META[type]
      try {
        const results = await search(query)
        return {
          type,
          typeLabel: meta.typeLabel,
          category: meta.category,
          results,
          total: results.length,
        } satisfies GlobalSearchGroup
      } catch (error) {
        console.error(`[CreatorOps] Global search failed for ${type}`, error)
        return {
          type,
          typeLabel: meta.typeLabel,
          category: meta.category,
          results: [],
          total: 0,
        } satisfies GlobalSearchGroup
      }
    }),
  )

  const groups = filterGroupsByCategory(
    groupResults.filter((group) => group.total > 0),
    filter,
  )

  return {
    query: rawQuery.trim(),
    filter,
    groups,
    totalResults: groups.reduce((sum, group) => sum + group.total, 0),
  }
}
