import {
  DEMO_ARTIST_NAME,
  DEMO_CAMPAIGN_NAME,
  DEMO_DATA_MARKER,
  DEMO_ID_PREFIX,
  DEMO_IDS,
  DEMO_LINK_NOTE,
  DEMO_SONG_TITLE,
  demoDates,
} from "@/lib/demo-data/constants"
import { buildDemoPublishingChecklist } from "@/lib/data/publishing-checklist"
import type {
  AnalyticsRecord,
  AssetRecord,
  ExperimentRecord,
  ArtistRecord,
  CampaignLinkedRecord,
  CampaignRecord,
  CampaignTask,
  EmailCampaignRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  PromptRun,
  ReleasePlan,
  SocialRepurposingRecord,
  YouTubePackage,
  YouTubeThumbnailRecord,
} from "@/lib/types"

export function buildPrettyWiseDemoRecords(now = new Date()) {
  const dates = demoDates(now)
  const ts = dates.timestamp

  const releasePlan: ReleasePlan = {
    id: DEMO_IDS.releasePlan,
    artistName: DEMO_ARTIST_NAME,
    songTitle: DEMO_SONG_TITLE,
    genre: "Dark Horror K-Pop / Dark Pop",
    mood: "Sweet, eerie, catchy, cinematic, creepy-cute, mysterious",
    releaseDate: dates.launchDate,
    youtubeChannel: "Dorsyth Records",
    targetAudience:
      "Fans of dark K-pop, horror pop, creepy-cute aesthetics, AI music, and cinematic pop visuals.",
    visualTheme:
      "Bubblegum pink skies, red balloons, haunted carnival lights, dark shadows, candy-colored horror, mysterious female character.",
    merchTieIn:
      "Cotton Candy Skies shirt, creepy-cute poster, lyric sticker pack, red balloon/candy-inspired merch.",
    streamingPlatforms: "YouTube Music, Spotify, Apple Music, Amazon Music",
    primaryGoal: "Grow YouTube views and build PrettyWise brand recognition.",
    notes: DEMO_DATA_MARKER,
    completedPrompt: "",
    aiResponse: "",
    finalStrategySummary:
      "Launch Cotton Candy Skies as a creepy-cute dark K-pop release where the sweet visual world hides danger underneath.",
    finalTargetListener:
      "Fans of dark K-pop, horror pop, villain playlists, creepy-cute aesthetics, anime edits, cinematic pop, and AI music.",
    finalPreReleasePlan:
      "Tease the cotton candy horror visual world with Shorts, community posts, and red balloon/candy imagery before release.",
    finalReleaseDayChecklist:
      "Publish lyric video, pin comment, post Shorts, share community post, announce to email list, and add merch teaser.",
    finalPostReleasePlan:
      "Track analytics, create follow-up Shorts, test thumbnail variants, and promote merch concepts.",
    finalYouTubePackage:
      "Use title and metadata focused on dark horror K-pop, creepy-cute AI music, and PrettyWise branding.",
    finalShortFormIdeas:
      "Red balloons reveal, sweet sky/dark secret transition, lyric hook overlay, character close-up teaser.",
    finalSocialCaptions: "Sweet skies. Dark secrets. PrettyWise opens the door.",
    finalEmailAnnouncement:
      "PrettyWise enters the Cotton Candy Skies world with a creepy-cute dark K-pop release.",
    finalMerchTieIns:
      "Sweet Skies, Dark Secrets shirt, poster, sticker pack, and lyric merch.",
    finalPriorityTasks:
      "YouTube package, thumbnail, social clips, email, analytics review.",
    finalChecklist: "Metadata, thumbnail, social, email, merch, analytics.",
    createdAt: ts,
    updatedAt: ts,
  }

  const youtubePackage: YouTubePackage = {
    id: DEMO_IDS.youtubePackage,
    trackTitle: DEMO_SONG_TITLE,
    artistName: DEMO_ARTIST_NAME,
    channelName: "Dorsyth Records",
    genre: "Dark Horror K-Pop / Dark Pop",
    mood: "Sweet, eerie, catchy, cinematic, creepy-cute",
    targetListener:
      "Fans of dark K-pop, horror pop, villain playlists, creepy-cute aesthetics, anime edits, and AI music.",
    visualTheme:
      "Bubblegum pink and red horror-pop visual with a mysterious female character, red balloons, candy clouds, and hidden danger.",
    primaryGoal: "Grow YouTube views and encourage comments.",
    merchTieIn: "Cotton Candy Skies themed shirt and poster.",
    streamingLink: "Coming soon",
    releaseDate: dates.launchDate,
    videoType: "Lyric Video",
    keywords:
      "PrettyWise, Cotton Candy Skies, dark kpop, horror kpop, dark pop, AI music, Dorsyth Records",
    notes: DEMO_DATA_MARKER,
    completedPrompt: "DEMO generated YouTube metadata prompt for Cotton Candy Skies.",
    aiResponse: "DEMO AI response for YouTube packaging.",
    finalTitle: "PrettyWise - Cotton Candy Skies | Dark Horror K-Pop AI Music",
    finalDescription:
      "A creepy-cute dark K-pop release from PrettyWise where sweetness hides something sinister.",
    finalTags:
      "PrettyWise, Cotton Candy Skies, dark kpop, horror kpop, dark pop, AI music, Dorsyth Records",
    finalHashtags: "#PrettyWise #CottonCandySkies #DarkKPop #HorrorKPop #AIMusic",
    finalPinnedComment: "What scene does Cotton Candy Skies make you imagine?",
    finalThumbnailText: "COTTON CANDY SKIES",
    finalShortsCaption: "Sweet skies. Dark secrets. PrettyWise is here.",
    finalCommunityPost:
      "PrettyWise enters a new creepy-cute world with Cotton Candy Skies. Are you ready?",
    createdAt: ts,
    updatedAt: ts,
  }

  const youtubeThumbnail: YouTubeThumbnailRecord = {
    id: DEMO_IDS.youtubeThumbnail,
    trackTitle: DEMO_SONG_TITLE,
    artistName: DEMO_ARTIST_NAME,
    videoTitle: "PrettyWise - Cotton Candy Skies | Dark Horror K-Pop AI Music",
    contentFormat: "YouTube Video Thumbnail",
    videoType: "Lyric Video",
    genre: "Dark Horror K-Pop / Dark Pop",
    mood: "Sweet, eerie, cinematic, creepy-cute, mysterious",
    targetAudience:
      "Fans of dark K-pop, horror pop, anime edits, creepy-cute visuals, and AI music.",
    visualTheme:
      "Candy pink sky with red balloons, shadowy horror atmosphere, mysterious K-pop-inspired female character, hidden danger.",
    hookAngle:
      "Make the viewer feel like they are entering a beautiful candy world that is secretly dangerous.",
    mainSubject:
      "Mysterious K-pop-inspired female character beneath a cotton candy sky with red balloons floating behind her.",
    textOverlay: "COTTON CANDY SKIES",
    colorDirection: "Candy pink, blood red, black, muted purple, cinematic shadows.",
    brandingNotes:
      "Keep PrettyWise dark, cinematic, feminine, eerie, creepy-cute, and story-driven.",
    referenceStyle:
      "Dark K-pop music video thumbnail, horror pop visualizer, creepy-cute anime-inspired character art.",
    ctaGoal: "Increase Click-Through Rate",
    notes: DEMO_DATA_MARKER,
    completedPrompt: "DEMO generated thumbnail prompt for Cotton Candy Skies.",
    aiResponse: "DEMO AI response for thumbnail concept.",
    finalConcept: "Sweet Trap Horror Pop",
    finalTextOverlay: "COTTON CANDY SKIES",
    finalComposition:
      "Character on the right, bold title on the left, candy sky behind, red balloons creating unease.",
    finalColorDirection: "Candy pink, red, black, muted purple, cinematic shadows.",
    finalImagePrompt:
      "Create a cinematic 16:9 YouTube thumbnail for a dark horror K-pop AI music lyric video titled Cotton Candy Skies by PrettyWise. Show a mysterious K-pop-inspired female character beneath a surreal cotton candy pink sky, with red balloons, candy-colored clouds, dark cinematic shadows, and a creepy-cute horror-pop atmosphere. Use bold readable text COTTON CANDY SKIES. High contrast, premium music packaging, mobile readable.",
    finalAltVariation:
      "Close-up of red balloon reflection in the character eye with pink sky behind.",
    finalShortsVersion:
      "Vertical 9:16 cover with character centered, red balloons above, COTTON CANDY SKIES large in the middle.",
    createdAt: ts,
    updatedAt: ts,
  }

  const social: SocialRepurposingRecord = {
    id: DEMO_IDS.social,
    campaignName: DEMO_CAMPAIGN_NAME,
    sourceContent:
      "A creepy-cute dark K-pop release where sweetness hides something sinister.",
    businessArea: "AI Music",
    goal: "Promote the YouTube lyric video and build PrettyWise brand recognition.",
    audience:
      "Fans of dark K-pop, horror pop, creepy-cute aesthetics, anime edits, and AI music.",
    tone: "Dark, playful, eerie, stylish, mysterious.",
    platforms: "YouTube Shorts, TikTok, Instagram, X, YouTube Community",
    callToAction:
      "Watch the full video and comment what scene it makes you imagine.",
    productOrReleaseLink: "Coming soon",
    contentType: "Music Release",
    notes: DEMO_DATA_MARKER,
    completedPrompt: "DEMO generated social repurposing prompt.",
    aiResponse: "DEMO AI response for social content.",
    finalCoreMessage:
      "Cotton Candy Skies looks sweet, but something darker is hiding underneath.",
    finalTikTokCaption:
      "Sweet skies. Dark secrets. PrettyWise just opened the door. #DarkKPop #AIMusic",
    finalInstagramCaption:
      "Cotton Candy Skies enters the PrettyWise universe — sweet, eerie, and impossible to ignore.",
    finalXPost:
      "PrettyWise - Cotton Candy Skies is a creepy-cute dark K-pop trip through sweetness and shadows.",
    finalYouTubeShortsIdea:
      "Start with a pink candy sky, cut to red balloons, reveal the lyric hook, end with “Sweet skies. Dark secrets.”",
    finalYouTubeCommunityPost:
      "PrettyWise is stepping into a creepy-cute world with Cotton Candy Skies. What do you think is hiding behind the sweetness?",
    finalEmailSnippet:
      "Sweet skies. Dark secrets. PrettyWise returns with Cotton Candy Skies.",
    finalHashtags: "#PrettyWise #CottonCandySkies #DarkKPop #HorrorKPop #AIMusic",
    finalCTA: "Watch the full video and comment the scene you imagine.",
    createdAt: ts,
    updatedAt: ts,
  }

  const email: EmailCampaignRecord = {
    id: DEMO_IDS.email,
    campaignName: DEMO_CAMPAIGN_NAME,
    campaignType: "Music Release Announcement",
    businessArea: "AI Music",
    audience:
      "Fans of dark K-pop, horror pop, creepy-cute pop visuals, villain playlists, and AI music.",
    offerOrAnnouncement: "Announce the PrettyWise release Cotton Candy Skies.",
    productOrReleaseName: DEMO_SONG_TITLE,
    keyBenefits:
      "Creepy-cute dark K-pop release, cinematic visuals, PrettyWise story world, YouTube premiere.",
    tone: "Dark, stylish, cinematic, creepy-cute, mysterious.",
    callToAction:
      "Watch the full video and comment what scene it makes you imagine.",
    link: "Coming soon",
    urgency: "New release announcement",
    senderName: "Dorsyth Records",
    notes: DEMO_DATA_MARKER,
    completedPrompt: "DEMO generated email campaign prompt.",
    aiResponse: "DEMO AI response for email campaign.",
    finalSubjectLine: "PrettyWise opens the door to Cotton Candy Skies",
    finalPreviewText:
      "Sweet skies. Dark secrets. A new creepy-cute dark K-pop release is here.",
    finalEmailBody:
      "PrettyWise is back with Cotton Candy Skies — a dark horror K-pop release where candy-colored visuals hide something sinister. Watch the full video and tell us what scene it creates in your mind.",
    finalCTA: "Watch Cotton Candy Skies",
    finalFollowUpEmail:
      "Did you catch the hidden darkness inside Cotton Candy Skies? Watch again and tell us what you noticed.",
    finalResendSubject: "The sweet sky has a darker side",
    finalResendBody:
      "PrettyWise invites you back into Cotton Candy Skies, a creepy-cute dark K-pop world full of candy colors and hidden danger.",
    createdAt: ts,
    updatedAt: ts,
  }

  const merch: MerchIdea = {
    id: DEMO_IDS.merch,
    niche: "Dark horror K-pop / creepy-cute pop merch",
    audience:
      "PrettyWise fans, dark K-pop fans, horror pop listeners, creepy-cute aesthetic fans.",
    productType: "T-shirt",
    tone: "Dark, playful, eerie, stylish.",
    noun: "skies",
    verb: "haunt",
    designStyle:
      "Creepy-cute lyric tee with candy pink, red balloon, and black horror-pop contrast.",
    storeType: "Fourthwall",
    primaryGoal: "Create release-connected PrettyWise merch.",
    notes: DEMO_DATA_MARKER,
    completedPrompt: "DEMO generated merch idea prompt.",
    aiResponse: "DEMO AI response for merch concepts.",
    selectedConceptName: "Sweet Trap",
    selectedSlogan: "Sweet Skies, Dark Secrets",
    selectedDesignDirection:
      "Bold lyric typography with candy pink clouds, red balloon silhouette, and dark shadow accents.",
    selectedProductTitle: "Sweet Skies, Dark Secrets PrettyWise Shirt",
    selectedProductDescription:
      "A creepy-cute PrettyWise shirt inspired by Cotton Candy Skies, blending dark K-pop energy with candy horror visuals.",
    selectedTags: "PrettyWise, dark kpop, horror pop, creepy cute, AI music merch",
    selectedMockupIdea:
      "Black shirt mockup with candy pink/red design under cinematic neon lighting.",
    selectedSocialCaption: "Sweet skies. Dark secrets. Wear the PrettyWise universe.",
    createdAt: ts,
    updatedAt: ts,
  }

  const productListing: ProductListing = {
    id: DEMO_IDS.productListing,
    productType: "T-shirt",
    niche: "Dark horror K-pop / creepy-cute pop merch",
    audience: "Fans of PrettyWise, dark K-pop, horror pop, and creepy-cute aesthetics.",
    designConcept:
      "Sweet Skies, Dark Secrets lyric tee with candy clouds and red balloon horror-pop details.",
    tone: "Stylish, dark, playful, eerie.",
    primaryKeyword: "dark k-pop shirt",
    secondaryKeywords:
      "PrettyWise shirt, horror k-pop merch, creepy cute shirt, AI music merch",
    storeName: "Dorsyth Records Store",
    productBenefits: "Release-inspired fan merch with a premium dark pop aesthetic.",
    pricingNotes:
      "Position as premium artist merch tied to the Cotton Candy Skies release.",
    notes: DEMO_DATA_MARKER,
    completedPrompt: "DEMO generated product listing prompt.",
    aiResponse: "DEMO AI response for product listing.",
    finalTitle: "Sweet Skies, Dark Secrets PrettyWise Shirt",
    finalShortDescription:
      "A creepy-cute dark K-pop shirt inspired by PrettyWise and Cotton Candy Skies.",
    finalLongDescription:
      "Step into the PrettyWise universe with a Cotton Candy Skies inspired shirt that blends candy-colored pop visuals with dark horror energy.",
    finalBulletPoints:
      "Dark K-pop inspired design; Creepy-cute candy horror aesthetic; Great for PrettyWise fans; Release-connected artist merch",
    finalTags: "PrettyWise, dark kpop, horror pop, creepy cute, AI music merch",
    finalCollection: "PrettyWise - Cotton Candy Skies",
    finalCTA: "Add this PrettyWise shirt to your collection.",
    finalSocialCaption: "Sweet skies. Dark secrets. Wear the PrettyWise universe.",
    finalEmailSubject: "New PrettyWise merch from Cotton Candy Skies",
    createdAt: ts,
    updatedAt: ts,
  }

  const mockup: MockupPromptRecord = {
    id: DEMO_IDS.mockup,
    projectName: "Sweet Skies, Dark Secrets PrettyWise Shirt",
    mockupType: "T-Shirt Mockup",
    productType: "T-shirt",
    niche: "Dark horror K-pop / creepy-cute pop merch",
    audience: "PrettyWise fans and dark K-pop fans.",
    designConcept:
      "Black shirt with candy pink clouds, red balloon detail, and Sweet Skies, Dark Secrets typography.",
    visualStyle: "Premium dark pop merch mockup with neon pink/red lighting.",
    colors: "Black, candy pink, red, muted purple.",
    setting:
      "Dark cinematic room with subtle horror-pop lighting and candy-colored glow.",
    modelDescription:
      "Young adult model wearing dark music merch, face not emphasized, premium streetwear framing.",
    cameraAngle: "Front-facing lifestyle product mockup angle.",
    lighting: "Pink and red neon rim lighting with dark shadows.",
    mood: "Stylish, eerie, premium, creepy-cute.",
    platformUse: "Fourthwall",
    aspectRatio: "1:1 Square",
    textToInclude: "Sweet Skies, Dark Secrets",
    textToAvoid: "Do not add random text or fake logos.",
    brandNotes: "Keep PrettyWise dark, cinematic, creepy-cute, and premium.",
    notes: DEMO_DATA_MARKER,
    completedPrompt: "DEMO generated mockup prompt.",
    aiResponse: "DEMO AI response for mockup.",
    finalImagePrompt:
      "Create a premium product mockup for a black PrettyWise t-shirt featuring the phrase Sweet Skies, Dark Secrets. Use candy pink clouds, red balloon accents, dark horror-pop lighting, and a stylish creepy-cute K-pop merch aesthetic.",
    finalNegativePrompt:
      "Avoid distorted text, extra logos, cluttered backgrounds, unreadable typography, and unrelated objects.",
    finalLayoutNotes:
      "Center the shirt, keep design readable, use dark background with pink/red glow.",
    finalTextPlacement: "Text should appear on the shirt only, large and readable.",
    finalUsageNotes: "Use for Fourthwall listing, social post, and merch teaser.",
    createdAt: ts,
    updatedAt: ts,
  }

  const analytics: AnalyticsRecord = {
    id: DEMO_IDS.analytics,
    itemName: "PrettyWise - Cotton Candy Skies Lyric Video",
    itemType: "YouTube Video",
    relatedArtist: DEMO_ARTIST_NAME,
    relatedSong: DEMO_SONG_TITLE,
    relatedCampaign: DEMO_CAMPAIGN_NAME,
    platform: "YouTube",
    publishDate: dates.launchDate,
    url: "Coming soon",
    niche: "Dark horror K-pop / dark pop AI music",
    genre: "Dark Horror K-Pop / Dark Pop",
    mood: "Sweet, eerie, cinematic, creepy-cute",
    titleUsed: "PrettyWise - Cotton Candy Skies | Dark Horror K-Pop AI Music",
    thumbnailText: "COTTON CANDY SKIES",
    descriptionNotes: "Creepy-cute dark K-pop YouTube upload package.",
    tagsUsed: "PrettyWise, Cotton Candy Skies, dark kpop, horror kpop, AI music",
    callToAction:
      "Watch the full video and comment what scene it makes you imagine.",
    views: 0,
    impressions: 0,
    clicks: 0,
    clickThroughRate: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    subscribersGained: 0,
    watchTimeHours: 0,
    averageViewDuration: 0,
    retentionNotes: "",
    revenue: 0,
    sales: 0,
    conversionRate: 0,
    whatWorked: "",
    whatDidNotWork: "",
    improvementIdeas: "",
    nextActions: "Review performance after publishing.",
    rating: 0,
    notes: DEMO_DATA_MARKER,
    experimentId: DEMO_IDS.experiment,
    experimentName: "Cotton Candy Skies Thumbnail Text Test",
    createdAt: ts,
    updatedAt: ts,
  }

  const artist: ArtistRecord = {
    id: DEMO_IDS.artist,
    artistName: DEMO_ARTIST_NAME,
    artistType: "AI Artist",
    genre: "Dark Horror K-Pop / Dark Pop",
    subGenres:
      "Horror K-Pop, Dark Pop, Cinematic Pop, Creepy-Cute Pop, Villain Pop",
    mood: "Dark, catchy, eerie, cinematic, playful, mysterious, hypnotic, emotional, villainous, creepy-cute",
    brandDescription:
      "PrettyWise is a dark horror K-pop / dark pop AI artist blending catchy hooks, eerie cinematic visuals, surreal candy horror aesthetics, villain energy, and creepy-cute storytelling.",
    visualIdentity:
      "Red and black contrast, candy pink highlights, eerie small-town horror, red balloons, haunted carnival lighting, mysterious female character, cinematic shadows, glitch textures, lyric overlays.",
    targetAudience:
      "Fans of dark K-pop, horror pop, villain playlists, creepy-cute aesthetics, anime edits, cinematic pop, AI music, gothic visuals, supernatural storytelling, and surreal music videos.",
    contentStyle:
      "Lyric videos, cinematic visualizers, Shorts teasers, creepy-cute social clips, character-led artwork, merch tie-ins, and story-driven release campaigns.",
    youtubeChannel: "Dorsyth Records",
    spotifyLink: "",
    appleMusicLink: "",
    amazonMusicLink: "",
    websiteLink: "",
    merchStoreLink: "Fourthwall store",
    socialLinks: "YouTube, TikTok, Instagram, X",
    notes: DEMO_DATA_MARKER,
    releases: [
      {
        id: DEMO_IDS.artistRelease,
        songTitle: DEMO_SONG_TITLE,
        releaseDate: dates.launchDate,
        genre: "Dark Horror K-Pop / Dark Pop",
        mood: "Sweet, eerie, catchy, cinematic, creepy-cute",
        status: "Planning",
        youtubeUrl: "",
        streamingLinks: "YouTube Music, Spotify, Apple Music, Amazon Music",
        notes: DEMO_DATA_MARKER,
        thumbnailRecordId: DEMO_IDS.youtubeThumbnail,
        youtubePackagingRecordId: DEMO_IDS.youtubePackage,
        releasePlanRecordId: DEMO_IDS.releasePlan,
        analyticsRecordId: DEMO_IDS.analytics,
      },
    ],
    merchProducts: [
      {
        id: DEMO_IDS.artistProduct,
        productName: "Sweet Skies, Dark Secrets PrettyWise Shirt",
        productType: "T-shirt",
        status: "Concept",
        storeLink: "Fourthwall store",
        notes: DEMO_DATA_MARKER,
      },
    ],
    campaigns: [
      {
        id: DEMO_IDS.artistCampaign,
        campaignName: DEMO_CAMPAIGN_NAME,
        campaignType: "Music Release",
        status: "Planning",
        startDate: dates.startDate,
        endDate: dates.endDate,
        notes: DEMO_DATA_MARKER,
      },
    ],
    createdAt: ts,
    updatedAt: ts,
  }

  const linkedRecords: CampaignLinkedRecord[] = [
    {
      id: DEMO_IDS.artist,
      type: "artist",
      title: DEMO_ARTIST_NAME,
      href: `/artist-crm?recordId=${DEMO_IDS.artist}`,
      notes: DEMO_LINK_NOTE,
    },
    {
      id: DEMO_IDS.releasePlan,
      type: "release-plan",
      title: `${DEMO_ARTIST_NAME} — ${DEMO_SONG_TITLE}`,
      href: `/release-planner?recordId=${DEMO_IDS.releasePlan}`,
      notes: DEMO_LINK_NOTE,
    },
    {
      id: DEMO_IDS.youtubePackage,
      type: "youtube-package",
      title: `${DEMO_ARTIST_NAME} — ${DEMO_SONG_TITLE}`,
      href: `/youtube-packaging?recordId=${DEMO_IDS.youtubePackage}`,
      notes: DEMO_LINK_NOTE,
    },
    {
      id: DEMO_IDS.youtubeThumbnail,
      type: "youtube-thumbnail",
      title: `${DEMO_ARTIST_NAME} — ${DEMO_SONG_TITLE}`,
      href: `/youtube-thumbnails?recordId=${DEMO_IDS.youtubeThumbnail}`,
      notes: DEMO_LINK_NOTE,
    },
    {
      id: DEMO_IDS.social,
      type: "social-repurposing",
      title: DEMO_CAMPAIGN_NAME,
      href: `/social-repurposing?recordId=${DEMO_IDS.social}`,
      notes: DEMO_LINK_NOTE,
    },
    {
      id: DEMO_IDS.email,
      type: "email-campaign",
      title: DEMO_CAMPAIGN_NAME,
      href: `/email-campaigns?recordId=${DEMO_IDS.email}`,
      notes: DEMO_LINK_NOTE,
    },
    {
      id: DEMO_IDS.merch,
      type: "merch-idea",
      title: "Sweet Trap",
      href: `/merch-ideas?recordId=${DEMO_IDS.merch}`,
      notes: DEMO_LINK_NOTE,
    },
    {
      id: DEMO_IDS.productListing,
      type: "product-listing",
      title: "Sweet Skies, Dark Secrets PrettyWise Shirt",
      href: `/product-listings?recordId=${DEMO_IDS.productListing}`,
      notes: DEMO_LINK_NOTE,
    },
    {
      id: DEMO_IDS.mockup,
      type: "mockup-prompt",
      title: "Sweet Skies, Dark Secrets PrettyWise Shirt",
      href: `/mockup-prompts?recordId=${DEMO_IDS.mockup}`,
      notes: DEMO_LINK_NOTE,
    },
    {
      id: DEMO_IDS.analytics,
      type: "analytics",
      title: "PrettyWise - Cotton Candy Skies Lyric Video",
      href: `/analytics?recordId=${DEMO_IDS.analytics}`,
      notes: DEMO_LINK_NOTE,
    },
  ]

  const taskTitles = [
    "Finalize song concept and story angle",
    "Generate release plan",
    "Create YouTube metadata package",
    "Create YouTube thumbnail concept",
    "Generate Shorts and social promo content",
    "Create merch concept ideas",
    "Create product listing for best merch idea",
    "Create email announcement",
    "Publish YouTube video",
    "Track analytics after 24 hours, 7 days, and 30 days",
  ]

  const taskStatuses: CampaignTask["status"][] = [
    "Done",
    "Done",
    "In Progress",
    "In Progress",
    "In Progress",
    "To Do",
    "To Do",
    "To Do",
    "To Do",
    "To Do",
  ]

  const tasks: CampaignTask[] = taskTitles.map((title, index) => ({
    id: `${DEMO_ID_PREFIX}prettywise-task-${index + 1}`,
    title,
    description: "",
    status: taskStatuses[index] ?? "To Do",
    dueDate: index < 5 ? dates.launchDate : "",
    relatedRecordType: "",
    relatedRecordId: "",
    order: index,
  }))

  const campaign: CampaignRecord = {
    id: DEMO_IDS.campaign,
    campaignName: DEMO_CAMPAIGN_NAME,
    campaignType: "Music Release",
    status: "Planning",
    priority: "High",
    artistName: DEMO_ARTIST_NAME,
    songTitle: DEMO_SONG_TITLE,
    productName: "",
    niche: "Dark horror K-pop / dark pop AI music",
    primaryGoal:
      "Grow YouTube views, build PrettyWise artist identity, attract fans of dark K-pop and horror-inspired pop, encourage comments, and create merch opportunities around the song concept.",
    targetAudience:
      "Fans of dark K-pop, horror pop, villain playlists, creepy-cute aesthetics, anime edits, cinematic pop, AI music, gothic visuals, supernatural storytelling, and surreal music videos.",
    startDate: dates.startDate,
    launchDate: dates.launchDate,
    endDate: dates.endDate,
    description:
      "A PrettyWise release campaign for Cotton Candy Skies, a bubblegum-dark K-pop track where sweetness hides something sinister.",
    notes: DEMO_DATA_MARKER,
    lessonsLearned: "",
    whatWorked: "",
    whatToImprove: "",
    linkedRecords,
    tasks,
    publishingChecklist: (() => {
      const checklist = buildDemoPublishingChecklist("Music Release")
      return {
        ...checklist,
        items: checklist.items.map((item, index) => {
          if (index < 4) {
            return { ...item, dueDate: dates.startDate }
          }
          if (item.phase === "24-Hour Review") {
            return { ...item, dueDate: dates.launchDate }
          }
          return item
        }),
      }
    })(),
    createdAt: ts,
    updatedAt: ts,
  }

  const experiment: ExperimentRecord = {
    id: DEMO_IDS.experiment,
    campaignId: DEMO_IDS.campaign,
    campaignName: DEMO_CAMPAIGN_NAME,
    experimentName: "Cotton Candy Skies Thumbnail Text Test",
    experimentType: "Thumbnail Text",
    status: "Winner Chosen",
    platform: "YouTube",
    hypothesis:
      "A short mysterious title overlay will improve CTR compared to a longer descriptive overlay.",
    metricFocus: "CTR",
    variantA: "COTTON CANDY SKIES",
    variantB: "SWEET SKIES. DARK SECRETS.",
    variantC: "THE SKY IS LYING",
    winner: "Variant B",
    resultSummary: "",
    startDate: dates.startDate,
    endDate: dates.endDate,
    notes: DEMO_DATA_MARKER,
    whatWorked: "",
    whatDidNotWork: "",
    nextTestIdea:
      "Test red balloon close-up thumbnail against character-focused thumbnail.",
    relatedAnalyticsNotes: "",
    variantAMetric: "CTR 4.2%",
    variantBMetric: "CTR 5.7%",
    variantCMetric: "CTR 3.8%",
    analyticsRecordId: DEMO_IDS.analytics,
    analyticsRecordName: "PrettyWise - Cotton Candy Skies Lyric Video",
    confidenceNotes: "",
    learningSummary:
      "The mysterious phrase performed better than the literal song title because it created more curiosity.",
    createdAt: ts,
    updatedAt: ts,
  }

  const assetThumbnail: AssetRecord = {
    id: DEMO_IDS.assetThumbnail,
    assetName: "Cotton Candy Skies Thumbnail Concept",
    assetType: "YouTube Thumbnail",
    status: "Ready",
    campaignId: DEMO_IDS.campaign,
    campaignName: DEMO_CAMPAIGN_NAME,
    artistName: DEMO_ARTIST_NAME,
    songTitle: DEMO_SONG_TITLE,
    productName: "",
    platform: "YouTube",
    filePath: "",
    fileUrl: "",
    externalUrl: "",
    sourceTool: "ChatGPT",
    sourcePromptRunId: DEMO_IDS.promptRunThumbnail,
    sourcePromptName: "YouTube Thumbnail Generator",
    sourceRecordType: "youtube-thumbnail",
    sourceRecordId: DEMO_IDS.youtubeThumbnail,
    experimentId: DEMO_IDS.experiment,
    analyticsRecordId: "",
    versionLabel: "v1",
    tags: ["prettywise", "thumbnail", "cotton candy skies", "dark k-pop"],
    description: "Demo thumbnail asset for Cotton Candy Skies.",
    usageNotes: "",
    rightsNotes: "",
    notes: DEMO_DATA_MARKER,
    createdAt: ts,
    updatedAt: ts,
  }

  const assetMockup: AssetRecord = {
    id: DEMO_IDS.assetMockup,
    assetName: "Sweet Skies Dark Secrets Shirt Mockup",
    assetType: "Merch Mockup",
    status: "Draft",
    campaignId: DEMO_IDS.campaign,
    campaignName: DEMO_CAMPAIGN_NAME,
    artistName: DEMO_ARTIST_NAME,
    songTitle: "",
    productName: "Sweet Skies, Dark Secrets PrettyWise Shirt",
    platform: "Fourthwall",
    filePath: "",
    fileUrl: "",
    externalUrl: "",
    sourceTool: "ChatGPT",
    sourcePromptRunId: "",
    sourcePromptName: "",
    sourceRecordType: "mockup-prompt",
    sourceRecordId: DEMO_IDS.mockup,
    experimentId: "",
    analyticsRecordId: "",
    versionLabel: "v1",
    tags: ["prettywise", "merch", "mockup", "shirt"],
    description: "Demo merch mockup asset for PrettyWise.",
    usageNotes: "",
    rightsNotes: "",
    notes: DEMO_DATA_MARKER,
    createdAt: ts,
    updatedAt: ts,
  }

  const promptRuns: PromptRun[] = [
    {
      id: DEMO_IDS.promptRunYoutube,
      promptId: "",
      promptName: "PrettyWise YouTube Metadata Prompt Run",
      category: "YouTube",
      inputValues: {},
      completedPrompt: youtubePackage.completedPrompt,
      aiResponse: youtubePackage.aiResponse,
      notes: DEMO_DATA_MARKER,
      campaignId: DEMO_IDS.campaign,
      campaignName: DEMO_CAMPAIGN_NAME,
      moduleType: "YouTube Packaging",
      outputRecordId: DEMO_IDS.youtubePackage,
      outputRecordType: "youtube-package",
      experimentId: "",
      sourcePromptId: "",
      sourcePromptName: "YouTube Metadata Generator",
      runType: "module",
      tags: ["demo", "prettywise", "youtube"],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: DEMO_IDS.promptRunThumbnail,
      promptId: "",
      promptName: "PrettyWise Thumbnail Prompt Run",
      category: "YouTube",
      inputValues: {},
      completedPrompt: youtubeThumbnail.completedPrompt,
      aiResponse: youtubeThumbnail.aiResponse,
      notes: DEMO_DATA_MARKER,
      campaignId: DEMO_IDS.campaign,
      campaignName: DEMO_CAMPAIGN_NAME,
      moduleType: "YouTube Thumbnail",
      outputRecordId: DEMO_IDS.youtubeThumbnail,
      outputRecordType: "youtube-thumbnail",
      experimentId: DEMO_IDS.experiment,
      sourcePromptId: "",
      sourcePromptName: "YouTube Thumbnail Generator",
      runType: "module",
      tags: ["demo", "prettywise", "thumbnail"],
      createdAt: ts,
      updatedAt: ts,
    },
  ]

  return {
    artist,
    campaign,
    releasePlan,
    youtubePackage,
    youtubeThumbnail,
    social,
    email,
    merch,
    productListing,
    mockup,
    analytics,
    experiment,
    promptRuns,
    assets: [assetThumbnail, assetMockup],
  }
}
