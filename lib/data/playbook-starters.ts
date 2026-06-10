import { generateDefaultPublishingChecklist } from "@/lib/data/publishing-checklist"
import { normalizePlaybookRecord } from "@/lib/playbooks"
import type { PlaybookRecord } from "@/lib/types"

const STARTER_ID_PREFIX = "starter-playbook-"

function starterId(slug: string): string {
  return `${STARTER_ID_PREFIX}${slug}`
}

function musicChecklistItems() {
  return generateDefaultPublishingChecklist("Music Release").items.map((item) => ({
    phase: item.phase,
    title: item.title,
    status: "todo" as const,
    dueOffset: "",
    notes: "",
  }))
}

function darkKPopRelease(): PlaybookRecord {
  return normalizePlaybookRecord({
    id: starterId("dark-kpop-release"),
    name: "Dark K-Pop Release Playbook",
    description:
      "Full launch SOP for dark cinematic AI music releases with YouTube-first packaging, short-form content, email, merch, and analytics review.",
    playbookType: "Music Release",
    category: "AI Music / Dark Pop",
    status: "Active",
    targetCampaignType: "Music Release",
    exportPackTemplate: "full-release-pack",
    defaultCampaignFields: {
      campaignType: "Music Release",
      status: "Planning",
      priority: "High",
      niche: "Dark K-pop / dark pop AI music",
      primaryGoal:
        "Grow YouTube views, build artist identity, encourage comments, and support merch/product promotion.",
      targetAudience:
        "Fans of dark K-pop, horror pop, villain playlists, anime edits, AI music, cinematic pop, and gothic/creepy-cute visuals.",
      description:
        "Launch a dark cinematic AI music release with YouTube-first packaging, short-form content, email, merch tie-ins, and analytics review.",
    },
    taskTemplate: [
      { title: "Define song story angle", dueOffset: "-14 days" },
      { title: "Finalize lyric/video concept", dueOffset: "-14 days" },
      { title: "Create release plan", dueOffset: "-10 days" },
      { title: "Generate YouTube metadata package", dueOffset: "-7 days" },
      { title: "Generate thumbnail concepts", dueOffset: "-7 days" },
      { title: "Create social repurposing package", dueOffset: "-5 days" },
      { title: "Create email campaign", dueOffset: "-5 days" },
      { title: "Create merch concept", dueOffset: "-4 days" },
      { title: "Create product listing", dueOffset: "-3 days" },
      { title: "Create mockup prompt", dueOffset: "-3 days" },
      { title: "Prepare publishing checklist", dueOffset: "-2 days" },
      { title: "Export YouTube Upload Pack", dueOffset: "-1 days" },
      { title: "Publish video", dueOffset: "launch day" },
      { title: "Record 24-hour analytics", dueOffset: "+1 days" },
      { title: "Record 7-day analytics", dueOffset: "+7 days" },
      { title: "Record 30-day analytics", dueOffset: "+30 days" },
      { title: "Summarize learnings", dueOffset: "+30 days" },
    ],
    publishingChecklistTemplate: { version: 1, items: musicChecklistItems() },
    assetChecklist: [
      { assetType: "Audio File", title: "Final audio export", required: true, suggestedModule: "release-planner" },
      { assetType: "Video File", title: "Lyric/video master", required: true, suggestedModule: "youtube-packaging" },
      { assetType: "YouTube Thumbnail", title: "Primary thumbnail", required: true, suggestedModule: "youtube-thumbnails" },
      { assetType: "Shorts Cover", title: "Shorts cover frame", required: false, suggestedModule: "youtube-thumbnails" },
      { assetType: "Cover Art", title: "Release cover art", required: false },
      { assetType: "Merch Mockup", title: "Merch mockup concept", required: false, suggestedModule: "mockup-prompts" },
      { assetType: "Social Graphic", title: "Social promo graphic", required: false, suggestedModule: "social-repurposing" },
    ],
    promptChecklist: [
      { moduleType: "Release Planner", promptName: "Release Planner prompt", required: true },
      { moduleType: "YouTube Packaging", promptName: "YouTube Packaging prompt", required: true },
      { moduleType: "YouTube Thumbnail", promptName: "Thumbnail prompt", required: true },
      { moduleType: "Social Repurposing", promptName: "Social Repurposing prompt", required: true },
      { moduleType: "Email Campaign", promptName: "Email Campaign prompt", required: true },
      { moduleType: "Merch Ideas", promptName: "Merch Idea prompt", required: false },
      { moduleType: "Product Listings", promptName: "Product Listing prompt", required: false },
      { moduleType: "Mockup Prompts", promptName: "Mockup Prompt", required: false },
    ],
    experimentTemplate: [
      {
        experimentName: "Thumbnail Text Test",
        experimentType: "Thumbnail Text",
        metricFocus: "CTR",
        platform: "YouTube",
        hypothesis: "Shorter mysterious thumbnail text improves CTR.",
        variantA: "SONG TITLE",
        variantB: "MYSTERIOUS PHRASE",
      },
      {
        experimentName: "YouTube Title Test",
        experimentType: "YouTube Title",
        metricFocus: "CTR",
        platform: "YouTube",
        hypothesis: "Keyword-forward title vs curiosity title.",
        variantA: "Artist - Song | Genre",
        variantB: "What happens when...",
      },
      {
        experimentName: "Shorts Hook Test",
        experimentType: "Shorts Hook",
        metricFocus: "Views",
        platform: "YouTube",
        hypothesis: "Hook style affects Shorts retention.",
        variantA: "Visual reveal hook",
        variantB: "Lyric hook overlay",
      },
    ],
    tags: ["music", "dark k-pop", "youtube", "release"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
}

function baseStarter(
  slug: string,
  partial: Partial<PlaybookRecord> & Pick<PlaybookRecord, "name" | "playbookType" | "description">,
): PlaybookRecord {
  return normalizePlaybookRecord({
    id: starterId(slug),
    category: "",
    status: "Active",
    targetCampaignType: partial.playbookType,
    exportPackTemplate: "full-release-pack",
    defaultCampaignFields: {},
    taskTemplate: [],
    publishingChecklistTemplate: { version: 1, items: [] },
    assetChecklist: [],
    promptChecklist: [],
    experimentTemplate: [],
    tags: [],
    notes: "",
    automationNotes: "",
    recommendedPresetId: "",
    recommendedPresetName: "",
    recommendedWorkflowId: "",
    recommendedWorkflowName: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...partial,
  })
}

export const STARTER_PLAYBOOKS: PlaybookRecord[] = [
  darkKPopRelease(),
  baseStarter("youtube-lyric-video", {
    name: "YouTube Lyric Video Release Playbook",
    playbookType: "YouTube Release",
    category: "YouTube",
    description: "YouTube-first lyric video launch with metadata, thumbnail, Shorts, and analytics.",
    targetCampaignType: "YouTube Video",
    exportPackTemplate: "youtube-upload-pack",
    defaultCampaignFields: {
      campaignType: "YouTube Video",
      status: "Planning",
      priority: "High",
      primaryGoal: "Grow YouTube views and watch time.",
    },
    taskTemplate: [
      { title: "Finalize video concept", dueOffset: "-10 days" },
      { title: "Create YouTube package", dueOffset: "-7 days" },
      { title: "Create thumbnail", dueOffset: "-5 days" },
      { title: "Publish video", dueOffset: "launch day" },
      { title: "24-hour review", dueOffset: "+1 days" },
    ],
    assetChecklist: [
      { assetType: "Video File", title: "Lyric video master", required: true },
      { assetType: "YouTube Thumbnail", title: "Thumbnail", required: true },
    ],
    promptChecklist: [
      { moduleType: "YouTube Packaging", required: true },
      { moduleType: "YouTube Thumbnail", required: true },
    ],
    tags: ["youtube", "lyric video"],
  }),
  baseStarter("ai-music-single", {
    name: "AI Music Single Release Playbook",
    playbookType: "Music Release",
    category: "AI Music",
    description: "Streamlined single release for AI-generated music artists.",
    defaultCampaignFields: {
      campaignType: "Music Release",
      status: "Planning",
      niche: "AI music",
    },
    taskTemplate: [
      { title: "Define release angle", dueOffset: "-14 days" },
      { title: "Create release plan", dueOffset: "-10 days" },
      { title: "YouTube package + thumbnail", dueOffset: "-7 days" },
      { title: "Publish", dueOffset: "launch day" },
    ],
    publishingChecklistTemplate: { version: 1, items: musicChecklistItems() },
    tags: ["ai music", "single"],
  }),
  baseStarter("merch-drop", {
    name: "Merch Drop Playbook",
    playbookType: "Merch Drop",
    category: "Commerce",
    description: "Merch drop launch with mockups, listings, email, and social.",
    targetCampaignType: "Merch Drop",
    exportPackTemplate: "merch-launch-pack",
    defaultCampaignFields: { campaignType: "Merch Drop", status: "Planning" },
    taskTemplate: [
      { title: "Finalize merch concept", dueOffset: "-14 days" },
      { title: "Create mockup prompts", dueOffset: "-10 days" },
      { title: "Create product listing", dueOffset: "-7 days" },
      { title: "Launch merch drop", dueOffset: "launch day" },
    ],
    assetChecklist: [
      { assetType: "Merch Mockup", title: "Product mockup", required: true },
      { assetType: "Product Image", title: "Listing image", required: true },
    ],
    tags: ["merch", "commerce"],
  }),
  baseStarter("digital-product", {
    name: "Digital Product Launch Playbook",
    playbookType: "Digital Product",
    category: "Commerce",
    description: "Launch digital products with listings, email, and analytics.",
    targetCampaignType: "Digital Product Launch",
    defaultCampaignFields: { campaignType: "Digital Product Launch", status: "Planning" },
    taskTemplate: [
      { title: "Define offer", dueOffset: "-14 days" },
      { title: "Create product listing", dueOffset: "-7 days" },
      { title: "Email announcement", dueOffset: "-3 days" },
      { title: "Launch", dueOffset: "launch day" },
    ],
    tags: ["digital product"],
  }),
  baseStarter("prompt-pack", {
    name: "Prompt Pack Launch Playbook",
    playbookType: "Prompt Pack",
    category: "Creator Tools",
    description: "Launch a prompt pack with social, email, and listing assets.",
    defaultCampaignFields: { status: "Planning", primaryGoal: "Sell or distribute prompt pack." },
    taskTemplate: [
      { title: "Finalize prompt pack outline", dueOffset: "-10 days" },
      { title: "Create sales copy", dueOffset: "-7 days" },
      { title: "Launch", dueOffset: "launch day" },
    ],
    promptChecklist: [{ moduleType: "Prompt Library", required: true }],
    tags: ["prompts", "digital"],
  }),
  baseStarter("mini-course", {
    name: "Mini Course Launch Playbook",
    playbookType: "Course Launch",
    category: "Education",
    description: "Mini course launch with email sequence and social proof.",
    defaultCampaignFields: { status: "Planning", primaryGoal: "Enroll students." },
    taskTemplate: [
      { title: "Outline curriculum", dueOffset: "-21 days" },
      { title: "Create landing copy", dueOffset: "-10 days" },
      { title: "Email launch sequence", dueOffset: "-5 days" },
      { title: "Open enrollment", dueOffset: "launch day" },
    ],
    tags: ["course", "education"],
  }),
  baseStarter("30-day-content", {
    name: "30-Day Content Campaign Playbook",
    playbookType: "Content Campaign",
    category: "Marketing",
    description: "30-day content sprint with weekly tasks and publishing rhythm.",
    targetCampaignType: "Content Campaign",
    defaultCampaignFields: { campaignType: "Content Campaign", status: "Planning" },
    taskTemplate: [
      { title: "Plan content pillars", dueOffset: "-7 days" },
      { title: "Batch week 1 content", dueOffset: "-3 days" },
      { title: "Week 1 publish", dueOffset: "launch day" },
      { title: "Week 4 review", dueOffset: "+30 days" },
    ],
    tags: ["content", "30-day"],
  }),
  baseStarter("artist-brand", {
    name: "Artist Brand Launch Playbook",
    playbookType: "Artist Branding",
    category: "Branding",
    description: "Artist brand launch with CRM, visuals, and release foundation.",
    defaultCampaignFields: {
      campaignType: "Artist Campaign",
      status: "Planning",
      primaryGoal: "Establish artist brand identity.",
    },
    taskTemplate: [
      { title: "Define brand story", dueOffset: "-14 days" },
      { title: "Set up artist CRM profile", dueOffset: "-10 days" },
      { title: "Create visual identity assets", dueOffset: "-7 days" },
      { title: "Plan first release", dueOffset: "-3 days" },
    ],
    assetChecklist: [
      { assetType: "Brand Asset", title: "Brand kit", required: true },
      { assetType: "Logo", title: "Logo concept", required: true },
    ],
    tags: ["artist", "branding"],
  }),
]

export function getStarterPlaybookById(id: string): PlaybookRecord | undefined {
  return STARTER_PLAYBOOKS.find((playbook) => playbook.id === id)
}

export function isStarterPlaybookId(id: string): boolean {
  return id.startsWith(STARTER_ID_PREFIX)
}
