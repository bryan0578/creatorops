export type PromptCategory =
  | "YouTube"
  | "Music"
  | "Artwork"
  | "Merch"
  | "Marketing"
  | "Label Ops"
  | "Digital Products"
  | "AI Generation Template"
  | "General"

export type WorkflowStatus = "Active" | "Draft" | "Paused" | "Archived"

export interface Prompt {
  id: string
  name: string
  category: PromptCategory
  description: string
  promptText: string
  variables: string[]
  outputFormat: string
  tags: string[]
  rating: number // 0-5
  notes: string
  createdAt: number
  updatedAt: number
}

export interface WorkflowStep {
  id: string
  title: string
  description: string
  promptId: string | null // reference to a Prompt
}

export interface Workflow {
  id: string
  name: string
  category: PromptCategory
  description: string
  status: WorkflowStatus
  estimatedTimeSaved: string // e.g. "2h / week"
  steps: WorkflowStep[]
  notes: string
  createdAt: number
  updatedAt: number
}

export interface PromptRun {
  id: string
  promptId: string
  promptName: string
  category: PromptCategory
  inputValues: Record<string, string>
  completedPrompt: string
  aiResponse: string
  notes: string
  campaignId: string
  campaignName: string
  moduleType: PromptRunModuleType | ""
  outputRecordId: string
  outputRecordType: CampaignLinkedRecordType | ""
  experimentId: string
  sourcePromptId: string
  sourcePromptName: string
  runType: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export type PromptRunModuleType =
  | "YouTube Packaging"
  | "YouTube Thumbnail"
  | "Release Plan"
  | "Social Repurposing"
  | "Email Campaign"
  | "Merch Idea"
  | "Product Listing"
  | "Mockup Prompt"
  | "Analytics"
  | "Campaign Context"
  | "Campaign Copilot"
  | "Experiment"
  | "Other"

export const PROMPT_RUN_MODULE_TYPES: PromptRunModuleType[] = [
  "YouTube Packaging",
  "YouTube Thumbnail",
  "Release Plan",
  "Social Repurposing",
  "Email Campaign",
  "Merch Idea",
  "Product Listing",
  "Mockup Prompt",
  "Analytics",
  "Campaign Context",
  "Campaign Copilot",
  "Experiment",
  "Other",
]

export type StepRunStatus =
  | "Not started"
  | "In progress"
  | "Complete"
  | "Skipped"

export type WorkflowRunStatus =
  | "Not started"
  | "In progress"
  | "Complete"
  | "Archived"

export interface StepRun {
  id: string
  workflowStepId: string
  title: string
  description: string
  promptId: string | null
  promptName: string
  status: StepRunStatus
  notes: string
  completedAt: number | null
}

export interface WorkflowRun {
  id: string
  workflowId: string
  workflowName: string
  category: PromptCategory
  status: WorkflowRunStatus
  stepRuns: StepRun[]
  notes: string
  startedAt: number
  updatedAt: number
  completedAt: number | null
}

export const PROMPT_CATEGORIES: PromptCategory[] = [
  "YouTube",
  "Music",
  "Artwork",
  "Merch",
  "Marketing",
  "Label Ops",
  "Digital Products",
  "AI Generation Template",
  "General",
]

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  "Active",
  "Draft",
  "Paused",
  "Archived",
]

export type VideoType =
  | "Visualizer"
  | "Lyric Video"
  | "Official Audio"
  | "Music Video"
  | "Shorts Clip"
  | "Live Version"
  | "Remix"

export type PrimaryGoal =
  | "Views"
  | "Subscribers"
  | "Streaming Saves"
  | "Merch Sales"
  | "Artist Awareness"
  | "Label Awareness"
  | "Comments/Engagement"

export const VIDEO_TYPES: VideoType[] = [
  "Visualizer",
  "Lyric Video",
  "Official Audio",
  "Music Video",
  "Shorts Clip",
  "Live Version",
  "Remix",
]

export const PRIMARY_GOALS: PrimaryGoal[] = [
  "Views",
  "Subscribers",
  "Streaming Saves",
  "Merch Sales",
  "Artist Awareness",
  "Label Awareness",
  "Comments/Engagement",
]

export interface YouTubePackage {
  id: string
  trackTitle: string
  artistName: string
  channelName: string
  genre: string
  mood: string
  targetListener: string
  visualTheme: string
  primaryGoal: string
  merchTieIn: string
  streamingLink: string
  releaseDate: string
  videoType: string
  keywords: string
  completedPrompt: string
  aiResponse: string
  finalTitle: string
  finalDescription: string
  finalTags: string
  finalHashtags: string
  finalPinnedComment: string
  finalThumbnailText: string
  finalShortsCaption: string
  finalCommunityPost: string
  notes: string
  createdAt: number
  updatedAt: number
}

export interface YouTubePackageFormValues {
  trackTitle: string
  artistName: string
  channelName: string
  genre: string
  mood: string
  targetListener: string
  visualTheme: string
  primaryGoal: string
  merchTieIn: string
  streamingLink: string
  releaseDate: string
  videoType: string
  keywords: string
  notes: string
}

export type MerchProductType =
  | "T-shirt"
  | "Hoodie"
  | "Sweatshirt"
  | "Mug"
  | "Poster"
  | "Sticker"
  | "Hat"
  | "Digital Download"
  | "Planner"
  | "Template"
  | "Prompt Pack"
  | "Mini Course"
  | "Other"

export type MerchStoreType =
  | "Fourthwall"
  | "Shopify"
  | "WooCommerce"
  | "Etsy"
  | "Gumroad"
  | "General Ecommerce"
  | "Artist Store"
  | "Other"

export const MERCH_PRODUCT_TYPES: MerchProductType[] = [
  "T-shirt",
  "Hoodie",
  "Sweatshirt",
  "Mug",
  "Poster",
  "Sticker",
  "Hat",
  "Digital Download",
  "Planner",
  "Template",
  "Prompt Pack",
  "Mini Course",
  "Other",
]

export const MERCH_STORE_TYPES: MerchStoreType[] = [
  "Fourthwall",
  "Shopify",
  "WooCommerce",
  "Etsy",
  "Gumroad",
  "General Ecommerce",
  "Artist Store",
  "Other",
]

export interface MerchIdea {
  id: string
  niche: string
  audience: string
  productType: string
  tone: string
  noun: string
  verb: string
  designStyle: string
  storeType: string
  primaryGoal: string
  completedPrompt: string
  aiResponse: string
  selectedConceptName: string
  selectedSlogan: string
  selectedDesignDirection: string
  selectedProductTitle: string
  selectedProductDescription: string
  selectedTags: string
  selectedMockupIdea: string
  selectedSocialCaption: string
  notes: string
  createdAt: number
  updatedAt: number
}

export interface MerchIdeaFormValues {
  niche: string
  audience: string
  productType: string
  tone: string
  noun: string
  verb: string
  designStyle: string
  storeType: string
  primaryGoal: string
  notes: string
}

export type ProductListingProductType =
  | "T-shirt"
  | "Hoodie"
  | "Sweatshirt"
  | "Mug"
  | "Poster"
  | "Sticker"
  | "Hat"
  | "Digital Planner"
  | "Template"
  | "Prompt Pack"
  | "Mini Course"
  | "Ebook"
  | "Notion Template"
  | "Spreadsheet Template"
  | "Canva Template"
  | "Tech Resource"
  | "Other"

export const PRODUCT_LISTING_TYPES: ProductListingProductType[] = [
  "T-shirt",
  "Hoodie",
  "Sweatshirt",
  "Mug",
  "Poster",
  "Sticker",
  "Hat",
  "Digital Planner",
  "Template",
  "Prompt Pack",
  "Mini Course",
  "Ebook",
  "Notion Template",
  "Spreadsheet Template",
  "Canva Template",
  "Tech Resource",
  "Other",
]

export interface ProductListing {
  id: string
  productType: string
  niche: string
  audience: string
  designConcept: string
  tone: string
  primaryKeyword: string
  secondaryKeywords: string
  storeName: string
  productBenefits: string
  pricingNotes: string
  completedPrompt: string
  aiResponse: string
  finalTitle: string
  finalShortDescription: string
  finalLongDescription: string
  finalBulletPoints: string
  finalTags: string
  finalCollection: string
  finalCTA: string
  finalSocialCaption: string
  finalEmailSubject: string
  notes: string
  createdAt: number
  updatedAt: number
}

export interface ProductListingFormValues {
  productType: string
  niche: string
  audience: string
  designConcept: string
  tone: string
  primaryKeyword: string
  secondaryKeywords: string
  storeName: string
  productBenefits: string
  pricingNotes: string
  notes: string
}

export type SocialContentType =
  | "Song Release"
  | "YouTube Video"
  | "Merch Product"
  | "Product Listing"
  | "Digital Product"
  | "Email Announcement"
  | "Artist Update"
  | "Label Announcement"
  | "Blog Post"
  | "Course/Training"
  | "Other"

export type SocialBusinessArea =
  | "AI Music"
  | "Record Label"
  | "Artist Merch"
  | "Funny Shirts"
  | "Digital Products"
  | "Tech Products"
  | "Templates"
  | "Prompt Packs"
  | "Mini Courses"
  | "General Ecommerce"
  | "Other"

export const SOCIAL_CONTENT_TYPES: SocialContentType[] = [
  "Song Release",
  "YouTube Video",
  "Merch Product",
  "Product Listing",
  "Digital Product",
  "Email Announcement",
  "Artist Update",
  "Label Announcement",
  "Blog Post",
  "Course/Training",
  "Other",
]

export const SOCIAL_BUSINESS_AREAS: SocialBusinessArea[] = [
  "AI Music",
  "Record Label",
  "Artist Merch",
  "Funny Shirts",
  "Digital Products",
  "Tech Products",
  "Templates",
  "Prompt Packs",
  "Mini Courses",
  "General Ecommerce",
  "Other",
]

export interface SocialRepurposingRecord {
  id: string
  campaignName: string
  sourceContent: string
  businessArea: string
  goal: string
  audience: string
  tone: string
  platforms: string
  callToAction: string
  productOrReleaseLink: string
  contentType: string
  completedPrompt: string
  aiResponse: string
  finalCoreMessage: string
  finalTikTokCaption: string
  finalInstagramCaption: string
  finalXPost: string
  finalYouTubeShortsIdea: string
  finalYouTubeCommunityPost: string
  finalEmailSnippet: string
  finalHashtags: string
  finalCTA: string
  notes: string
  createdAt: number
  updatedAt: number
}

export interface SocialRepurposingFormValues {
  sourceContent: string
  businessArea: string
  goal: string
  audience: string
  tone: string
  platforms: string
  callToAction: string
  productOrReleaseLink: string
  contentType: string
  campaignName: string
  notes: string
}

export type ReleasePlannerGoal =
  | "Build Artist Awareness"
  | "Increase YouTube Views"
  | "Drive Streaming Saves"
  | "Grow Subscribers"
  | "Promote Merch"
  | "Build Label Brand"
  | "Test New Genre/Audience"
  | "Other"

export const RELEASE_PLANNER_GOALS: ReleasePlannerGoal[] = [
  "Build Artist Awareness",
  "Increase YouTube Views",
  "Drive Streaming Saves",
  "Grow Subscribers",
  "Promote Merch",
  "Build Label Brand",
  "Test New Genre/Audience",
  "Other",
]

export interface ReleasePlan {
  id: string
  artistName: string
  songTitle: string
  genre: string
  mood: string
  releaseDate: string
  youtubeChannel: string
  targetAudience: string
  visualTheme: string
  merchTieIn: string
  streamingPlatforms: string
  primaryGoal: string
  completedPrompt: string
  aiResponse: string
  finalStrategySummary: string
  finalTargetListener: string
  finalPreReleasePlan: string
  finalReleaseDayChecklist: string
  finalPostReleasePlan: string
  finalYouTubePackage: string
  finalShortFormIdeas: string
  finalSocialCaptions: string
  finalEmailAnnouncement: string
  finalMerchTieIns: string
  finalPriorityTasks: string
  finalChecklist: string
  notes: string
  createdAt: number
  updatedAt: number
}

export interface ReleasePlanFormValues {
  artistName: string
  songTitle: string
  genre: string
  mood: string
  releaseDate: string
  youtubeChannel: string
  targetAudience: string
  visualTheme: string
  merchTieIn: string
  streamingPlatforms: string
  primaryGoal: string
  notes: string
}

export type AnalyticsItemType =
  | "YouTube Video"
  | "YouTube Short"
  | "Music Release"
  | "Merch Product"
  | "Product Listing"
  | "TikTok Post"
  | "Instagram Post"
  | "X Post"
  | "Email Campaign"
  | "Full Campaign"
  | "Other"

export type AnalyticsPlatform =
  | "YouTube"
  | "YouTube Shorts"
  | "Spotify"
  | "Apple Music"
  | "Amazon Music"
  | "TikTok"
  | "Instagram"
  | "X"
  | "Fourthwall"
  | "Website"
  | "Email"
  | "Other"

export const ANALYTICS_ITEM_TYPES: AnalyticsItemType[] = [
  "YouTube Video",
  "YouTube Short",
  "Music Release",
  "Merch Product",
  "Product Listing",
  "TikTok Post",
  "Instagram Post",
  "X Post",
  "Email Campaign",
  "Full Campaign",
  "Other",
]

export const ANALYTICS_PLATFORMS: AnalyticsPlatform[] = [
  "YouTube",
  "YouTube Shorts",
  "Spotify",
  "Apple Music",
  "Amazon Music",
  "TikTok",
  "Instagram",
  "X",
  "Fourthwall",
  "Website",
  "Email",
  "Other",
]

export interface AnalyticsRecord {
  id: string
  itemName: string
  itemType: string
  relatedArtist: string
  relatedSong: string
  relatedCampaign: string
  platform: string
  publishDate: string
  url: string
  niche: string
  genre: string
  mood: string
  titleUsed: string
  thumbnailText: string
  descriptionNotes: string
  tagsUsed: string
  callToAction: string
  views: number
  impressions: number
  clicks: number
  clickThroughRate: number
  likes: number
  comments: number
  shares: number
  saves: number
  subscribersGained: number
  watchTimeHours: number
  averageViewDuration: number
  retentionNotes: string
  revenue: number
  sales: number
  conversionRate: number
  whatWorked: string
  whatDidNotWork: string
  improvementIdeas: string
  nextActions: string
  rating: number
  notes: string
  experimentId: string
  experimentName: string
  createdAt: number
  updatedAt: number
}

export const EXPERIMENT_WINNER_OPTIONS = [
  "Variant A",
  "Variant B",
  "Variant C",
  "Inconclusive",
] as const

export const EXPERIMENT_TYPES = [
  "YouTube Title",
  "Thumbnail",
  "Thumbnail Text",
  "Description",
  "Pinned Comment",
  "Shorts Hook",
  "Social Caption",
  "Email Subject",
  "Merch Copy",
  "Product Listing",
  "Other",
] as const

export const EXPERIMENT_STATUSES = [
  "Idea",
  "Running",
  "Reviewing",
  "Winner Chosen",
  "Archived",
] as const

export const EXPERIMENT_METRIC_FOCUS = [
  "CTR",
  "Views",
  "Watch Time",
  "Comments",
  "Likes",
  "Subscribers",
  "Sales",
  "Conversion Rate",
  "Email Open Rate",
  "Email Click Rate",
  "Other",
] as const

export interface ExperimentRecord {
  id: string
  campaignId: string
  campaignName: string
  experimentName: string
  experimentType: string
  status: string
  platform: string
  hypothesis: string
  variantA: string
  variantB: string
  variantC: string
  winner: string
  resultSummary: string
  metricFocus: string
  startDate: string
  endDate: string
  notes: string
  whatWorked: string
  whatDidNotWork: string
  nextTestIdea: string
  relatedAnalyticsNotes: string
  variantAMetric: string
  variantBMetric: string
  variantCMetric: string
  analyticsRecordId: string
  analyticsRecordName: string
  confidenceNotes: string
  learningSummary: string
  createdAt: number
  updatedAt: number
}

export type MockupType =
  | "T-Shirt Mockup"
  | "Hoodie Mockup"
  | "Poster Mockup"
  | "Mug Mockup"
  | "Sticker Mockup"
  | "Digital Product Mockup"
  | "Planner Mockup"
  | "Template Mockup"
  | "Course Cover"
  | "YouTube Thumbnail"
  | "Album/Single Cover"
  | "Social Ad Creative"
  | "Ecommerce Banner"
  | "Other"

export type MockupPlatformUse =
  | "Fourthwall"
  | "Shopify"
  | "Etsy"
  | "Website"
  | "Instagram"
  | "TikTok"
  | "YouTube"
  | "YouTube Thumbnail"
  | "X"
  | "Email"
  | "General Ecommerce"
  | "Other"

export type MockupAspectRatio =
  | "1:1 Square"
  | "4:5 Instagram Portrait"
  | "9:16 Vertical"
  | "16:9 YouTube Thumbnail"
  | "3:4 Product Mockup"
  | "Other"

export const MOCKUP_TYPES: MockupType[] = [
  "T-Shirt Mockup",
  "Hoodie Mockup",
  "Poster Mockup",
  "Mug Mockup",
  "Sticker Mockup",
  "Digital Product Mockup",
  "Planner Mockup",
  "Template Mockup",
  "Course Cover",
  "YouTube Thumbnail",
  "Album/Single Cover",
  "Social Ad Creative",
  "Ecommerce Banner",
  "Other",
]

export const MOCKUP_PLATFORM_USES: MockupPlatformUse[] = [
  "Fourthwall",
  "Shopify",
  "Etsy",
  "Website",
  "Instagram",
  "TikTok",
  "YouTube",
  "YouTube Thumbnail",
  "X",
  "Email",
  "General Ecommerce",
  "Other",
]

export const MOCKUP_ASPECT_RATIOS: MockupAspectRatio[] = [
  "1:1 Square",
  "4:5 Instagram Portrait",
  "9:16 Vertical",
  "16:9 YouTube Thumbnail",
  "3:4 Product Mockup",
  "Other",
]

export interface MockupPromptRecord {
  id: string
  projectName: string
  mockupType: string
  productType: string
  niche: string
  audience: string
  designConcept: string
  visualStyle: string
  colors: string
  setting: string
  modelDescription: string
  cameraAngle: string
  lighting: string
  mood: string
  platformUse: string
  aspectRatio: string
  textToInclude: string
  textToAvoid: string
  brandNotes: string
  completedPrompt: string
  aiResponse: string
  finalImagePrompt: string
  finalNegativePrompt: string
  finalLayoutNotes: string
  finalTextPlacement: string
  finalUsageNotes: string
  notes: string
  createdAt: number
  updatedAt: number
}

export interface MockupPromptFormValues {
  projectName: string
  mockupType: string
  productType: string
  niche: string
  audience: string
  designConcept: string
  visualStyle: string
  colors: string
  setting: string
  modelDescription: string
  cameraAngle: string
  lighting: string
  mood: string
  platformUse: string
  aspectRatio: string
  textToInclude: string
  textToAvoid: string
  brandNotes: string
  notes: string
}

export type EmailCampaignType =
  | "Music Release Announcement"
  | "Merch Drop"
  | "Product Launch"
  | "Digital Product Launch"
  | "Newsletter"
  | "Sale/Promo"
  | "Follow-Up Email"
  | "Welcome Email"
  | "Course Launch"
  | "Prompt Pack Launch"
  | "Artist Update"
  | "Label Announcement"
  | "Other"

export type EmailBusinessArea =
  | "AI Music"
  | "Record Label"
  | "Artist Merch"
  | "Funny Shirts"
  | "Digital Products"
  | "Tech Products"
  | "Templates"
  | "Prompt Packs"
  | "Mini Courses"
  | "General Ecommerce"
  | "Other"

export const EMAIL_CAMPAIGN_TYPES: EmailCampaignType[] = [
  "Music Release Announcement",
  "Merch Drop",
  "Product Launch",
  "Digital Product Launch",
  "Newsletter",
  "Sale/Promo",
  "Follow-Up Email",
  "Welcome Email",
  "Course Launch",
  "Prompt Pack Launch",
  "Artist Update",
  "Label Announcement",
  "Other",
]

export const EMAIL_BUSINESS_AREAS: EmailBusinessArea[] = [
  "AI Music",
  "Record Label",
  "Artist Merch",
  "Funny Shirts",
  "Digital Products",
  "Tech Products",
  "Templates",
  "Prompt Packs",
  "Mini Courses",
  "General Ecommerce",
  "Other",
]

export interface EmailCampaignRecord {
  id: string
  campaignName: string
  campaignType: string
  businessArea: string
  audience: string
  offerOrAnnouncement: string
  productOrReleaseName: string
  keyBenefits: string
  tone: string
  callToAction: string
  link: string
  urgency: string
  senderName: string
  completedPrompt: string
  aiResponse: string
  finalSubjectLine: string
  finalPreviewText: string
  finalEmailBody: string
  finalCTA: string
  finalFollowUpEmail: string
  finalResendSubject: string
  finalResendBody: string
  notes: string
  createdAt: number
  updatedAt: number
}

export interface EmailCampaignFormValues {
  campaignName: string
  campaignType: string
  businessArea: string
  audience: string
  offerOrAnnouncement: string
  productOrReleaseName: string
  keyBenefits: string
  tone: string
  callToAction: string
  link: string
  urgency: string
  senderName: string
  notes: string
}

export type ArtistType =
  | "Solo Artist"
  | "AI Artist"
  | "Label Artist"
  | "Producer Alias"
  | "Compilation Brand"
  | "Playlist Brand"
  | "Other"

export const ARTIST_TYPES: ArtistType[] = [
  "Solo Artist",
  "AI Artist",
  "Label Artist",
  "Producer Alias",
  "Compilation Brand",
  "Playlist Brand",
  "Other",
]

export type ReleaseStatus =
  | "Idea"
  | "In Production"
  | "Ready"
  | "Scheduled"
  | "Released"
  | "Promoting"
  | "Archived"

export const RELEASE_STATUSES: ReleaseStatus[] = [
  "Idea",
  "In Production",
  "Ready",
  "Scheduled",
  "Released",
  "Promoting",
  "Archived",
]

export type ArtistProductStatus =
  | "Idea"
  | "Designed"
  | "Listed"
  | "Promoting"
  | "Sold"
  | "Retired"

export const ARTIST_PRODUCT_STATUSES: ArtistProductStatus[] = [
  "Idea",
  "Designed",
  "Listed",
  "Promoting",
  "Sold",
  "Retired",
]

export type ArtistCampaignStatus =
  | "Idea"
  | "Planning"
  | "Active"
  | "Complete"
  | "Archived"

export const ARTIST_CAMPAIGN_STATUSES: ArtistCampaignStatus[] = [
  "Idea",
  "Planning",
  "Active",
  "Complete",
  "Archived",
]

export interface ArtistRelease {
  id: string
  songTitle: string
  releaseDate: string
  genre: string
  mood: string
  status: string
  youtubeUrl: string
  streamingLinks: string
  notes: string
  thumbnailRecordId?: string
  youtubePackagingRecordId?: string
  releasePlanRecordId?: string
  analyticsRecordId?: string
}

export interface ArtistMerchProduct {
  id: string
  productName: string
  productType: string
  status: string
  storeLink: string
  notes: string
}

export interface ArtistCampaign {
  id: string
  campaignName: string
  campaignType: string
  status: string
  startDate: string
  endDate: string
  notes: string
}

export interface ArtistRecord {
  id: string
  artistName: string
  artistType: string
  genre: string
  subGenres: string
  mood: string
  brandDescription: string
  visualIdentity: string
  targetAudience: string
  contentStyle: string
  youtubeChannel: string
  spotifyLink: string
  appleMusicLink: string
  amazonMusicLink: string
  websiteLink: string
  merchStoreLink: string
  socialLinks: string
  notes: string
  releases: ArtistRelease[]
  merchProducts: ArtistMerchProduct[]
  campaigns: ArtistCampaign[]
  createdAt: number
  updatedAt: number
}

export interface ArtistFormValues {
  artistName: string
  artistType: string
  genre: string
  subGenres: string
  mood: string
  brandDescription: string
  visualIdentity: string
  targetAudience: string
  contentStyle: string
  youtubeChannel: string
  spotifyLink: string
  appleMusicLink: string
  amazonMusicLink: string
  websiteLink: string
  merchStoreLink: string
  socialLinks: string
  notes: string
}

export type ThumbnailContentFormat =
  | "YouTube Video Thumbnail"
  | "YouTube Shorts Cover"

export const THUMBNAIL_CONTENT_FORMATS: ThumbnailContentFormat[] = [
  "YouTube Video Thumbnail",
  "YouTube Shorts Cover",
]

export type ThumbnailVideoType =
  | "Music Visualizer"
  | "Lyric Video"
  | "Official Audio"
  | "Music Video"
  | "Teaser"
  | "Promo Clip"
  | "Shorts Clip"
  | "Artist Intro"
  | "Compilation"
  | "Other"

export const THUMBNAIL_VIDEO_TYPES: ThumbnailVideoType[] = [
  "Music Visualizer",
  "Lyric Video",
  "Official Audio",
  "Music Video",
  "Teaser",
  "Promo Clip",
  "Shorts Clip",
  "Artist Intro",
  "Compilation",
  "Other",
]

export type ThumbnailCtaGoal =
  | "Increase Click-Through Rate"
  | "Increase Views"
  | "Strengthen Branding"
  | "Improve Curiosity"
  | "Improve Emotional Pull"
  | "Support Music Release"
  | "Support Merch Promotion"
  | "Other"

export const THUMBNAIL_CTA_GOALS: ThumbnailCtaGoal[] = [
  "Increase Click-Through Rate",
  "Increase Views",
  "Strengthen Branding",
  "Improve Curiosity",
  "Improve Emotional Pull",
  "Support Music Release",
  "Support Merch Promotion",
  "Other",
]

export interface YouTubeThumbnailRecord {
  id: string
  trackTitle: string
  artistName: string
  videoTitle: string
  contentFormat: string
  videoType: string
  genre: string
  mood: string
  targetAudience: string
  visualTheme: string
  hookAngle: string
  mainSubject: string
  textOverlay: string
  colorDirection: string
  brandingNotes: string
  referenceStyle: string
  ctaGoal: string
  completedPrompt: string
  aiResponse: string
  finalConcept: string
  finalTextOverlay: string
  finalComposition: string
  finalColorDirection: string
  finalImagePrompt: string
  finalAltVariation: string
  finalShortsVersion: string
  notes: string
  createdAt: number
  updatedAt: number
}

export interface YouTubeThumbnailFormValues {
  trackTitle: string
  artistName: string
  videoTitle: string
  contentFormat: string
  videoType: string
  genre: string
  mood: string
  targetAudience: string
  visualTheme: string
  hookAngle: string
  mainSubject: string
  textOverlay: string
  colorDirection: string
  brandingNotes: string
  referenceStyle: string
  ctaGoal: string
  notes: string
}

export type CampaignBuilderType =
  | "Music Release"
  | "YouTube Video"
  | "Merch Drop"
  | "Product Launch"
  | "Digital Product Launch"
  | "Email Campaign"
  | "Social Campaign"
  | "Artist Campaign"
  | "Label Campaign"
  | "Content Campaign"
  | "Other"

export const CAMPAIGN_BUILDER_TYPES: CampaignBuilderType[] = [
  "Music Release",
  "YouTube Video",
  "Merch Drop",
  "Product Launch",
  "Digital Product Launch",
  "Email Campaign",
  "Social Campaign",
  "Artist Campaign",
  "Label Campaign",
  "Content Campaign",
  "Other",
]

export type CampaignBuilderStatus =
  | "Idea"
  | "Planning"
  | "Active"
  | "Launched"
  | "Reviewing"
  | "Complete"
  | "Archived"

export const CAMPAIGN_BUILDER_STATUSES: CampaignBuilderStatus[] = [
  "Idea",
  "Planning",
  "Active",
  "Launched",
  "Reviewing",
  "Complete",
  "Archived",
]

export type CampaignPriority = "Low" | "Medium" | "High" | "Urgent"

export const CAMPAIGN_PRIORITIES: CampaignPriority[] = [
  "Low",
  "Medium",
  "High",
  "Urgent",
]

export type CampaignTaskStatus = "To Do" | "In Progress" | "Done" | "Skipped"

export const CAMPAIGN_TASK_STATUSES: CampaignTaskStatus[] = [
  "To Do",
  "In Progress",
  "Done",
  "Skipped",
]

export type CampaignLinkedRecordType =
  | "release-plan"
  | "youtube-package"
  | "youtube-thumbnail"
  | "social-repurposing"
  | "merch-idea"
  | "product-listing"
  | "mockup-prompt"
  | "email-campaign"
  | "analytics"
  | "artist"
  | "workflow"
  | "workflow-run"
  | "prompt-run"

export interface CampaignLinkedRecord {
  id: string
  type: CampaignLinkedRecordType
  title: string
  href: string
  notes: string
}

export interface CampaignTask {
  id: string
  title: string
  description: string
  status: CampaignTaskStatus
  dueDate: string
  relatedRecordType: CampaignLinkedRecordType | ""
  relatedRecordId: string
  order: number
}

export type PublishingChecklistItemStatus =
  | "todo"
  | "in-progress"
  | "done"
  | "skipped"
  | "blocked"

export const PUBLISHING_CHECKLIST_STATUSES: PublishingChecklistItemStatus[] = [
  "todo",
  "in-progress",
  "done",
  "skipped",
  "blocked",
]

export type PublishingChecklistPhase =
  | "Pre-Publish"
  | "Publishing"
  | "Immediately After Publish"
  | "24-Hour Review"
  | "7-Day Review"
  | "30-Day Review"

export const PUBLISHING_CHECKLIST_PHASES: PublishingChecklistPhase[] = [
  "Pre-Publish",
  "Publishing",
  "Immediately After Publish",
  "24-Hour Review",
  "7-Day Review",
  "30-Day Review",
]

export type PublishingChecklistQuickAction =
  | "export-campaign-pack"
  | "data-health"
  | "analytics"
  | "experiments"
  | "youtube-packaging"
  | "youtube-thumbnails"
  | "social-repurposing"
  | "email-campaigns"

export interface PublishingChecklistItem {
  id: string
  phase: PublishingChecklistPhase
  title: string
  status: PublishingChecklistItemStatus
  dueDate: string
  completedAt: string
  notes: string
  quickAction?: PublishingChecklistQuickAction
}

export interface PublishingChecklist {
  version: 1
  items: PublishingChecklistItem[]
}

export interface CampaignRecord {
  id: string
  campaignName: string
  campaignType: string
  status: string
  priority: string
  artistName: string
  songTitle: string
  productName: string
  niche: string
  primaryGoal: string
  targetAudience: string
  startDate: string
  launchDate: string
  endDate: string
  description: string
  notes: string
  lessonsLearned: string
  whatWorked: string
  whatToImprove: string
  linkedRecords: CampaignLinkedRecord[]
  tasks: CampaignTask[]
  publishingChecklist: PublishingChecklist
  createdAt: number
  updatedAt: number
}

export interface CampaignFormValues {
  campaignName: string
  campaignType: string
  status: string
  priority: string
  artistName: string
  songTitle: string
  productName: string
  niche: string
  primaryGoal: string
  targetAudience: string
  startDate: string
  launchDate: string
  endDate: string
  description: string
  notes: string
  lessonsLearned: string
  whatWorked: string
  whatToImprove: string
}

export type PresetType =
  | "Campaign"
  | "YouTube Package"
  | "YouTube Thumbnail"
  | "Release Plan"
  | "Merch Idea"
  | "Product Listing"
  | "Social Repurposing"
  | "Email Campaign"
  | "Analytics Record"
  | "Mockup Prompt"

export const PRESET_TYPES: PresetType[] = [
  "Campaign",
  "YouTube Package",
  "YouTube Thumbnail",
  "Release Plan",
  "Merch Idea",
  "Product Listing",
  "Social Repurposing",
  "Email Campaign",
  "Analytics Record",
  "Mockup Prompt",
]

export interface PresetRecord {
  id: string
  name: string
  description: string
  presetType: PresetType
  category: string
  tags: string[]
  values: Record<string, unknown>
  notes: string
  createdAt: number
  updatedAt: number
}

export interface PresetFormValues {
  name: string
  description: string
  presetType: PresetType
  category: string
  tags: string
  valuesJson: string
  notes: string
}

export interface WorkspaceSettingsRecord {
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
  aiGenerationEnabled: boolean
  aiDefaultProvider: string
  aiDefaultModel: string
  aiTemperature: number
  aiMaxOutputTokens: number
  aiSystemStylePreference: string
  aiSaveGenerationsAsPromptRuns: boolean
  aiIncludeCampaignContextByDefault: boolean
  aiIncludeLearningsByDefault: boolean
  aiIncludeQualityNotesByDefault: boolean
  createdAt: number
  updatedAt: number
}

export type WorkspaceSettingsFormValues = Omit<
  WorkspaceSettingsRecord,
  "id" | "createdAt" | "updatedAt"
>

export const ASSET_TYPES = [
  "Cover Art",
  "YouTube Thumbnail",
  "Shorts Cover",
  "Video File",
  "Audio File",
  "Suno Export",
  "Lyric Sheet",
  "Lyrics",
  "Merch Mockup",
  "Merch Ideas",
  "Product Image",
  "Product Mockup",
  "Social Graphic",
  "Email Graphic",
  "Brand Asset",
  "Logo",
  "Reference Image",
  "Reference Asset",
  "Prompt Image",
  "Visual Concept",
  "Artist Bible",
  "Visual Identity",
  "Lore",
  "Song Concept",
  "YouTube Metadata",
  "Document",
  "Spreadsheet",
  "Other",
] as const

export type AssetType = (typeof ASSET_TYPES)[number]

export const ASSET_STATUSES = [
  "Idea",
  "Draft",
  "In Progress",
  "Ready",
  "Used",
  "Published",
  "Archived",
] as const

export type AssetStatus = (typeof ASSET_STATUSES)[number]

export const ASSET_SOURCE_TOOLS = [
  "Suno",
  "ChatGPT",
  "Midjourney",
  "Ideogram",
  "Leonardo",
  "Canva",
  "Photoshop",
  "Figma",
  "CapCut",
  "DaVinci Resolve",
  "Fourthwall",
  "YouTube Studio",
  "Other",
] as const

export type AssetSourceTool = (typeof ASSET_SOURCE_TOOLS)[number]

export interface AssetRecord {
  id: string
  assetName: string
  assetType: string
  status: string
  campaignId: string
  campaignName: string
  artistName: string
  songTitle: string
  productName: string
  platform: string
  filePath: string
  fileUrl: string
  externalUrl: string
  sourceTool: string
  sourcePromptRunId: string
  sourcePromptName: string
  sourceRecordType: string
  sourceRecordId: string
  experimentId: string
  analyticsRecordId: string
  versionLabel: string
  tags: string[]
  description: string
  usageNotes: string
  rightsNotes: string
  notes: string
  createdAt: number
  updatedAt: number
}

export const PLAYBOOK_TYPES = [
  "Music Release",
  "YouTube Release",
  "Merch Drop",
  "Product Launch",
  "Digital Product",
  "Prompt Pack",
  "Course Launch",
  "Content Campaign",
  "Artist Branding",
  "Other",
] as const

export type PlaybookType = (typeof PLAYBOOK_TYPES)[number]

export const PLAYBOOK_STATUSES = ["Active", "Draft", "Archived"] as const

export type PlaybookStatus = (typeof PLAYBOOK_STATUSES)[number]

export interface PlaybookTaskTemplateItem {
  title: string
  description?: string
  phase?: string
  status?: string
  priority?: string
  dueOffset?: string
}

export interface PlaybookChecklistTemplateItem {
  phase: PublishingChecklistPhase
  title: string
  status?: string
  dueOffset?: string
  notes?: string
}

export interface PlaybookAssetChecklistItem {
  assetType: string
  title: string
  required?: boolean
  notes?: string
  suggestedModule?: string
  dueOffset?: string
}

export interface PlaybookPromptChecklistItem {
  promptName?: string
  promptType?: string
  moduleType: string
  required?: boolean
  notes?: string
  suggestedPromptId?: string
}

export interface PlaybookExperimentTemplateItem {
  experimentName: string
  experimentType: string
  hypothesis?: string
  metricFocus?: string
  platform?: string
  variantA?: string
  variantB?: string
  variantC?: string
  notes?: string
}

export interface PlaybookDefaultCampaignFields {
  campaignType?: string
  status?: string
  priority?: string
  niche?: string
  primaryGoal?: string
  targetAudience?: string
  description?: string
  notes?: string
  launchTimelineNotes?: string
}

export interface PlaybookPublishingChecklistTemplate {
  version?: 1
  items: PlaybookChecklistTemplateItem[]
}

export interface PlaybookRecord {
  id: string
  name: string
  description: string
  playbookType: string
  category: string
  status: string
  targetCampaignType: string
  recommendedPresetId: string
  recommendedPresetName: string
  recommendedWorkflowId: string
  recommendedWorkflowName: string
  defaultCampaignFields: PlaybookDefaultCampaignFields
  taskTemplate: PlaybookTaskTemplateItem[]
  publishingChecklistTemplate: PlaybookPublishingChecklistTemplate
  assetChecklist: PlaybookAssetChecklistItem[]
  promptChecklist: PlaybookPromptChecklistItem[]
  experimentTemplate: PlaybookExperimentTemplateItem[]
  automationNotes: string
  exportPackTemplate: string
  tags: string[]
  notes: string
  createdAt: number
  updatedAt: number
}

export interface PlaybookFormValues {
  name: string
  description: string
  playbookType: string
  category: string
  status: string
  targetCampaignType: string
  recommendedPresetId: string
  recommendedPresetName: string
  recommendedWorkflowId: string
  recommendedWorkflowName: string
  defaultCampaignFields: PlaybookDefaultCampaignFields
  taskTemplate: PlaybookTaskTemplateItem[]
  publishingChecklistTemplate: PlaybookPublishingChecklistTemplate
  assetChecklist: PlaybookAssetChecklistItem[]
  promptChecklist: PlaybookPromptChecklistItem[]
  experimentTemplate: PlaybookExperimentTemplateItem[]
  automationNotes: string
  exportPackTemplate: string
  tags: string
  notes: string
}

export interface CreateCampaignFromPlaybookOptions {
  createTasks: boolean
  createPublishingChecklist: boolean
  createExperimentIdeas: boolean
  createPlaceholderAssets: boolean
  applyRecommendedPreset: boolean
  linkRecommendedWorkflow: boolean
}

export interface CreateCampaignFromPlaybookInput {
  playbookId: string
  campaignName: string
  artistName?: string
  songTitle?: string
  productName?: string
  launchDate?: string
  presetId?: string
  options: CreateCampaignFromPlaybookOptions
}

export interface CreateCampaignFromPlaybookResult {
  success: boolean
  message: string
  campaignId?: string
  warnings?: string[]
}

export interface AssetFormValues {
  assetName: string
  assetType: string
  status: string
  campaignId: string
  campaignName: string
  artistName: string
  songTitle: string
  productName: string
  platform: string
  filePath: string
  fileUrl: string
  externalUrl: string
  sourceTool: string
  sourcePromptRunId: string
  sourcePromptName: string
  sourceRecordType: string
  sourceRecordId: string
  experimentId: string
  analyticsRecordId: string
  versionLabel: string
  tags: string
  description: string
  usageNotes: string
  rightsNotes: string
  notes: string
}

export const QUALITY_REVIEW_TYPES = [
  "YouTube Title",
  "YouTube Package",
  "Thumbnail",
  "Thumbnail Text",
  "Thumbnail Prompt",
  "Shorts Hook",
  "Social Caption",
  "Email Subject",
  "Email Campaign",
  "Merch Concept",
  "Product Listing",
  "Mockup Prompt",
  "Campaign Readiness",
  "Brand Consistency",
  "Experiment Variant",
  "Prompt Quality",
  "Other",
] as const

export type QualityReviewType = (typeof QUALITY_REVIEW_TYPES)[number]

export const QUALITY_REVIEW_STATUSES = [
  "Draft",
  "Reviewed",
  "Needs Revision",
  "Ready",
  "Archived",
] as const

export type QualityReviewStatus = (typeof QUALITY_REVIEW_STATUSES)[number]

export const QUALITY_READINESS_LABELS = [
  "Needs work",
  "Solid draft",
  "Strong",
  "Ready to publish",
  "Test-worthy",
] as const

export type QualityReadinessLabel = (typeof QUALITY_READINESS_LABELS)[number]

export interface QualityCriterionScore {
  key: string
  label: string
  description?: string
  score: number
  maxScore: number
  guidance?: string
  notes?: string
  whyNotes?: string
}

export interface QualityScoreBreakdown {
  rubricVersion: string
  criteria: QualityCriterionScore[]
}

export interface QualityReviewRecord {
  id: string
  reviewName: string
  reviewType: string
  status: string
  campaignId: string
  campaignName: string
  artistName: string
  songTitle: string
  productName: string
  sourceRecordType: string
  sourceRecordId: string
  sourcePromptRunId: string
  sourceExperimentId: string
  platform: string
  rubricVersion: string
  overallScore: number
  scoreBreakdown: QualityScoreBreakdown
  strengths: string
  weaknesses: string
  improvementIdeas: string
  recommendedActions: string
  readinessLabel: string
  reviewerNotes: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface QualityReviewFormValues {
  reviewName: string
  reviewType: string
  status: string
  campaignId: string
  campaignName: string
  artistName: string
  songTitle: string
  productName: string
  sourceRecordType: string
  sourceRecordId: string
  sourcePromptRunId: string
  sourceExperimentId: string
  platform: string
  rubricVersion: string
  overallScore: number
  scoreBreakdown: QualityScoreBreakdown
  strengths: string
  weaknesses: string
  improvementIdeas: string
  recommendedActions: string
  readinessLabel: string
  reviewerNotes: string
  tags: string
}

export interface GenerateQualityReviewDraftInput {
  reviewType: string
  reviewName?: string
  campaignId?: string
  campaignName?: string
  artistName?: string
  songTitle?: string
  productName?: string
  sourceRecordType?: string
  sourceRecordId?: string
  sourcePromptRunId?: string
  sourceExperimentId?: string
  platform?: string
}

export const LEARNING_TYPES = [
  "YouTube Title",
  "Thumbnail",
  "Thumbnail Text",
  "YouTube Description",
  "Pinned Comment",
  "Shorts Hook",
  "Social Caption",
  "Email Subject",
  "Merch Copy",
  "Product Listing",
  "Campaign Strategy",
  "Audience Insight",
  "Visual Style",
  "Prompt Pattern",
  "Experiment Result",
  "Analytics Review",
  "Quality Review",
  "Playbook Insight",
  "Other",
] as const

export type LearningType = (typeof LEARNING_TYPES)[number]

export const LEARNING_CATEGORIES = [
  "Win",
  "Loss",
  "Pattern",
  "Warning",
  "Opportunity",
  "Repeatable Tactic",
  "Avoid",
  "Hypothesis",
  "Audience Signal",
] as const

export type LearningCategory = (typeof LEARNING_CATEGORIES)[number]

export const LEARNING_CONFIDENCE_LEVELS = ["Low", "Medium", "High"] as const

export type LearningConfidence = (typeof LEARNING_CONFIDENCE_LEVELS)[number]

export const LEARNING_IMPACT_LEVELS = ["Unknown", "Low", "Medium", "High"] as const

export type LearningImpact = (typeof LEARNING_IMPACT_LEVELS)[number]

export const LEARNING_STATUSES = [
  "Active",
  "Needs Validation",
  "Validated",
  "Archived",
] as const

export type LearningStatus = (typeof LEARNING_STATUSES)[number]

export interface LearningRecord {
  id: string
  title: string
  learningType: string
  category: string
  confidence: string
  impact: string
  status: string
  campaignId: string
  campaignName: string
  artistName: string
  songTitle: string
  productName: string
  platform: string
  sourceType: string
  sourceId: string
  analyticsRecordId: string
  experimentId: string
  qualityReviewId: string
  assetId: string
  promptRunId: string
  playbookId: string
  insight: string
  evidence: string
  recommendation: string
  repeatWhen: string
  avoidWhen: string
  tags: string[]
  notes: string
  createdAt: number
  updatedAt: number
}

export interface LearningFormValues {
  title: string
  learningType: string
  category: string
  confidence: string
  impact: string
  status: string
  campaignId: string
  campaignName: string
  artistName: string
  songTitle: string
  productName: string
  platform: string
  sourceType: string
  sourceId: string
  analyticsRecordId: string
  experimentId: string
  qualityReviewId: string
  assetId: string
  promptRunId: string
  playbookId: string
  insight: string
  evidence: string
  recommendation: string
  repeatWhen: string
  avoidWhen: string
  tags: string
  notes: string
}

export interface CreateLearningFromAnalyticsInput {
  analyticsRecordId: string
  campaignId?: string
  campaignName?: string
}

export interface CreateLearningFromExperimentInput {
  experimentId: string
  campaignId?: string
  campaignName?: string
}

export interface CreateLearningFromQualityReviewInput {
  qualityReviewId: string
  campaignId?: string
  campaignName?: string
}

export interface GetReusableLearningsInput {
  campaignId?: string
  campaignName?: string
  artistName?: string
  learningType?: string
  platform?: string
  limit?: number
}

export const EXTERNAL_LINK_PLATFORMS = [
  "YouTube",
  "YouTube Studio",
  "Google Drive",
  "Fourthwall",
  "Suno",
  "Spotify",
  "Apple Music",
  "Amazon Music",
  "TikTok",
  "Instagram",
  "X",
  "Website",
  "Notion",
  "Canva",
  "Midjourney",
  "ChatGPT",
  "Claude",
  "Other",
] as const

export type ExternalLinkPlatform = (typeof EXTERNAL_LINK_PLATFORMS)[number]

export const EXTERNAL_LINK_TYPES = [
  "Published Video",
  "YouTube Studio Analytics",
  "YouTube Analytics CSV",
  "Google Drive Folder",
  "Google Drive File",
  "Asset Source",
  "Thumbnail File",
  "Video File",
  "Audio File",
  "Suno Song",
  "Suno Project",
  "Fourthwall Product",
  "Fourthwall Collection",
  "Fourthwall Store",
  "Streaming Link",
  "Social Post",
  "Reference",
  "Other",
] as const

export type ExternalLinkType = (typeof EXTERNAL_LINK_TYPES)[number]

export const EXTERNAL_LINK_STATUSES = [
  "Active",
  "Draft",
  "Archived",
  "Broken",
  "Needs Review",
] as const

export type ExternalLinkStatus = (typeof EXTERNAL_LINK_STATUSES)[number]

export interface ExternalLinkRecord {
  id: string
  name: string
  platform: ExternalLinkPlatform | string
  linkType: ExternalLinkType | string
  url: string
  status: ExternalLinkStatus | string
  campaignId: string
  campaignName: string
  artistName: string
  songTitle: string
  productName: string
  sourceRecordType: string
  sourceRecordId: string
  assetId: string
  analyticsRecordId: string
  notes: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export const YOUTUBE_CONNECTION_STATUSES = [
  "Connected",
  "ConnectedNeedsChannel",
  "ConnectedNeedsReconnect",
  "ChannelIdSaved",
  "Disconnected",
  "Expired",
  "Error",
] as const

export type YouTubeConnectionStatus = (typeof YOUTUBE_CONNECTION_STATUSES)[number]

export interface YouTubeConnectionRecord {
  id: string
  accountEmail: string
  channelId: string
  channelTitle: string
  channelHandle: string
  channelUrl: string
  thumbnailUrl: string
  scopes: string[]
  status: YouTubeConnectionStatus | string
  lastSyncedAt: number | null
  notes: string
  createdAt: number
  updatedAt: number
  hasRefreshToken: boolean
  tokenExpiry: number | null
  envConfigured: boolean
  encryptionConfigured: boolean
}

export interface YouTubeVideoRecord {
  id: string
  youtubeVideoId: string
  title: string
  description: string
  channelId: string
  channelTitle: string
  publishedAt: number | null
  thumbnailUrl: string
  videoUrl: string
  duration: string
  privacyStatus: string
  campaignId: string
  campaignName: string
  artistName: string
  songTitle: string
  externalLinkId: string
  analyticsRecordId: string
  rawJson: string
  lastSyncedAt: number | null
  notes: string
  createdAt: number
  updatedAt: number
  viewCount?: number
  likeCount?: number
  commentCount?: number
}

export interface YouTubeConnectionStatusSummary {
  configured: boolean
  encryptionConfigured: boolean
  /** Channel fully resolved — can fetch videos and sync stats. */
  connected: boolean
  /** OAuth tokens stored or channel ID saved locally. */
  oauthConnected: boolean
  needsChannelSelection: boolean
  needsOAuthReconnect: boolean
  apiKeyConfigured: boolean
  connection: YouTubeConnectionRecord | null
  clientIdConfigured: boolean
  clientSecretConfigured: boolean
  redirectUri: string
  message?: string
}

export const DRIVE_CONNECTION_STATUSES = [
  "Connected",
  "Disconnected",
  "Expired",
  "ReconnectRequired",
  "Error",
] as const

export type DriveConnectionStatus = (typeof DRIVE_CONNECTION_STATUSES)[number]

export interface DriveConnectionRecord {
  id: string
  accountEmail: string
  displayName: string
  scopes: string[]
  status: DriveConnectionStatus | string
  lastSyncedAt: number | null
  notes: string
  createdAt: number
  updatedAt: number
  hasRefreshToken: boolean
  tokenExpiry: number | null
  envConfigured: boolean
  encryptionConfigured: boolean
  credentialSource: "drive" | "youtube-fallback"
}

export interface DriveConnectionStatusSummary {
  configured: boolean
  encryptionConfigured: boolean
  connected: boolean
  oauthConnected: boolean
  connection: DriveConnectionRecord | null
  clientIdConfigured: boolean
  clientSecretConfigured: boolean
  redirectUri: string
  credentialSource: "drive" | "youtube-fallback" | null
  usingYoutubeFallback: boolean
  message?: string
}

export interface DriveFolderRecord {
  id: string
  driveFolderId: string
  name: string
  url: string
  campaignId: string
  campaignName: string
  artistName: string
  songTitle: string
  productName: string
  sourceRecordType: string
  sourceRecordId: string
  externalLinkId: string
  status: string
  lastSyncedAt: number | null
  notes: string
  tags: string[]
  rawJson: string
  createdAt: number
  updatedAt: number
}

export interface DriveFileRecord {
  id: string
  driveFileId: string
  name: string
  mimeType: string
  url: string
  webViewLink: string
  thumbnailLink: string
  iconLink: string
  sizeBytes: number | null
  modifiedTime: number | null
  folderId: string
  driveFolderId: string
  campaignId: string
  campaignName: string
  artistName: string
  songTitle: string
  productName: string
  assetId: string
  sourceRecordType: string
  sourceRecordId: string
  detectedAssetType: string
  status: string
  lastSyncedAt: number | null
  notes: string
  tags: string[]
  rawJson: string
  createdAt: number
  updatedAt: number
}
