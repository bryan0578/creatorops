"use client"

import * as React from "react"
import type {
  AnalyticsRecord,
  ArtistRecord,
  CampaignRecord,
  EmailCampaignRecord,
  MerchIdea,
  MockupPromptRecord,
  ProductListing,
  Prompt,
  PromptRun,
  ReleasePlan,
  SocialRepurposingRecord,
  Workflow,
  WorkflowRun,
  YouTubePackage,
  YouTubeThumbnailRecord,
} from "@/lib/types"
import {
  loadAnalyticsRecords,
  loadArtistRecords,
  loadCampaigns,
  loadEmailCampaignRecords,
  loadMerchIdeas,
  loadMockupPromptRecords,
  loadProductListings,
  loadPrompts,
  loadReleasePlans,
  loadRuns,
  loadSocialRepurposingRecords,
  loadWorkflowRuns,
  loadWorkflows,
  loadYouTubePackages,
  loadYouTubeThumbnailRecords,
} from "@/lib/storage"
import {
  deleteCampaignById,
  getCampaigns,
  importCampaigns as importCampaignsToDb,
  upsertCampaign,
} from "@/lib/actions/campaigns"
import {
  deleteEmailCampaignRecordById,
  getEmailCampaignRecords,
  importEmailCampaignRecords as importEmailCampaignRecordsToDb,
  upsertEmailCampaignRecord,
} from "@/lib/actions/email-campaigns"
import {
  deleteMockupPromptRecordById,
  getMockupPromptRecords,
  importMockupPromptRecords as importMockupPromptRecordsToDb,
  upsertMockupPromptRecord,
} from "@/lib/actions/mockup-prompts"
import {
  deleteAnalyticsRecordById,
  getAnalyticsRecords,
  importAnalyticsRecords as importAnalyticsRecordsToDb,
  upsertAnalyticsRecord,
} from "@/lib/actions/analytics-records"
import {
  deleteSocialRepurposingRecordById,
  getSocialRepurposingRecords,
  importSocialRepurposingRecords as importSocialRepurposingRecordsToDb,
  upsertSocialRepurposingRecord,
} from "@/lib/actions/social-repurposing"
import {
  deleteMerchIdeaById,
  getMerchIdeas,
  importMerchIdeas as importMerchIdeasToDb,
  upsertMerchIdea,
} from "@/lib/actions/merch-ideas"
import {
  deleteProductListingById,
  getProductListings,
  importProductListings as importProductListingsToDb,
  upsertProductListing,
} from "@/lib/actions/product-listings"
import {
  deleteArtistById,
  getArtists,
  importArtists as importArtistsToDb,
  upsertArtist,
} from "@/lib/actions/artists"
import {
  deletePromptById,
  getPrompts,
  importPrompts as importPromptsToDb,
  upsertPrompt,
} from "@/lib/actions/prompts"
import {
  deletePromptRunById,
  getPromptRuns,
  importPromptRuns as importPromptRunsToDb,
  upsertPromptRun,
} from "@/lib/actions/prompt-runs"
import {
  deleteReleasePlanById,
  getReleasePlans,
  importReleasePlans as importReleasePlansToDb,
  upsertReleasePlan,
} from "@/lib/actions/release-plans"
import {
  deleteYouTubeThumbnailById,
  getYouTubeThumbnails,
  importYouTubeThumbnails as importYouTubeThumbnailsToDb,
  upsertYouTubeThumbnail,
} from "@/lib/actions/youtube-thumbnails"
import {
  deleteYouTubePackageById,
  getYouTubePackages,
  importYouTubePackages as importYouTubePackagesToDb,
  upsertYouTubePackage,
} from "@/lib/actions/youtube-packages"
import {
  deleteWorkflowRunById,
  getWorkflowRuns,
  importWorkflowRuns as importWorkflowRunsToDb,
  upsertWorkflowRun,
} from "@/lib/actions/workflow-runs"
import {
  deleteWorkflowById,
  getWorkflows,
  importWorkflows as importWorkflowsToDb,
  upsertWorkflow,
} from "@/lib/actions/workflows"

export { createId } from "@/lib/storage"

interface StoreContextValue {
  prompts: Prompt[]
  workflows: Workflow[]
  runs: PromptRun[]
  workflowRuns: WorkflowRun[]
  youtubePackages: YouTubePackage[]
  merchIdeas: MerchIdea[]
  productListings: ProductListing[]
  socialRepurposingRecords: SocialRepurposingRecord[]
  releasePlans: ReleasePlan[]
  analyticsRecords: AnalyticsRecord[]
  mockupPromptRecords: MockupPromptRecord[]
  emailCampaignRecords: EmailCampaignRecord[]
  campaigns: CampaignRecord[]
  artistRecords: ArtistRecord[]
  youtubeThumbnailRecords: YouTubeThumbnailRecord[]
  hydrated: boolean
  promptsUseDatabase: boolean
  workflowsUseDatabase: boolean
  runsUseDatabase: boolean
  workflowRunsUseDatabase: boolean
  youtubePackagesUseDatabase: boolean
  youtubeThumbnailRecordsUseDatabase: boolean
  releasePlansUseDatabase: boolean
  artistRecordsUseDatabase: boolean
  merchIdeasUseDatabase: boolean
  productListingsUseDatabase: boolean
  socialRepurposingRecordsUseDatabase: boolean
  analyticsRecordsUseDatabase: boolean
  mockupPromptRecordsUseDatabase: boolean
  emailCampaignRecordsUseDatabase: boolean
  campaignsUseDatabase: boolean
  addPrompt: (p: Prompt) => Promise<void>
  updatePrompt: (p: Prompt) => Promise<void>
  deletePrompt: (id: string) => Promise<void>
  importPrompts: (items: Prompt[]) => Promise<void>
  reloadPrompts: () => Promise<void>
  addWorkflow: (w: Workflow) => Promise<void>
  updateWorkflow: (w: Workflow) => Promise<void>
  deleteWorkflow: (id: string) => Promise<void>
  importWorkflows: (items: Workflow[]) => Promise<void>
  reloadWorkflows: () => Promise<void>
  getPrompt: (id: string | null) => Prompt | undefined
  addRun: (run: PromptRun) => Promise<void>
  updateRun: (run: PromptRun) => Promise<void>
  deleteRun: (id: string) => Promise<void>
  importRuns: (items: PromptRun[]) => Promise<void>
  reloadRuns: () => Promise<void>
  addWorkflowRun: (run: WorkflowRun) => Promise<void>
  updateWorkflowRun: (run: WorkflowRun) => Promise<void>
  deleteWorkflowRun: (id: string) => Promise<void>
  importWorkflowRuns: (items: WorkflowRun[]) => Promise<void>
  reloadWorkflowRuns: () => Promise<void>
  addYouTubePackage: (pkg: YouTubePackage) => Promise<void>
  updateYouTubePackage: (pkg: YouTubePackage) => Promise<void>
  deleteYouTubePackage: (id: string) => Promise<void>
  importYouTubePackages: (items: YouTubePackage[]) => Promise<void>
  reloadYouTubePackages: () => Promise<void>
  addMerchIdea: (idea: MerchIdea) => Promise<void>
  updateMerchIdea: (idea: MerchIdea) => Promise<void>
  deleteMerchIdea: (id: string) => Promise<void>
  importMerchIdeas: (items: MerchIdea[]) => Promise<void>
  reloadMerchIdeas: () => Promise<void>
  addProductListing: (listing: ProductListing) => Promise<void>
  updateProductListing: (listing: ProductListing) => Promise<void>
  deleteProductListing: (id: string) => Promise<void>
  importProductListings: (items: ProductListing[]) => Promise<void>
  reloadProductListings: () => Promise<void>
  addSocialRepurposingRecord: (record: SocialRepurposingRecord) => Promise<void>
  updateSocialRepurposingRecord: (record: SocialRepurposingRecord) => Promise<void>
  deleteSocialRepurposingRecord: (id: string) => Promise<void>
  importSocialRepurposingRecords: (items: SocialRepurposingRecord[]) => Promise<void>
  reloadSocialRepurposingRecords: () => Promise<void>
  addReleasePlan: (plan: ReleasePlan) => Promise<void>
  updateReleasePlan: (plan: ReleasePlan) => Promise<void>
  deleteReleasePlan: (id: string) => Promise<void>
  importReleasePlans: (items: ReleasePlan[]) => Promise<void>
  reloadReleasePlans: () => Promise<void>
  addAnalyticsRecord: (record: AnalyticsRecord) => Promise<void>
  updateAnalyticsRecord: (record: AnalyticsRecord) => Promise<void>
  deleteAnalyticsRecord: (id: string) => Promise<void>
  importAnalyticsRecords: (items: AnalyticsRecord[]) => Promise<void>
  reloadAnalyticsRecords: () => Promise<void>
  addMockupPromptRecord: (record: MockupPromptRecord) => Promise<void>
  updateMockupPromptRecord: (record: MockupPromptRecord) => Promise<void>
  deleteMockupPromptRecord: (id: string) => Promise<void>
  importMockupPromptRecords: (items: MockupPromptRecord[]) => Promise<void>
  reloadMockupPromptRecords: () => Promise<void>
  addEmailCampaignRecord: (record: EmailCampaignRecord) => Promise<void>
  updateEmailCampaignRecord: (record: EmailCampaignRecord) => Promise<void>
  deleteEmailCampaignRecord: (id: string) => Promise<void>
  importEmailCampaignRecords: (items: EmailCampaignRecord[]) => Promise<void>
  reloadEmailCampaignRecords: () => Promise<void>
  addCampaign: (record: CampaignRecord) => Promise<void>
  updateCampaign: (record: CampaignRecord) => Promise<void>
  deleteCampaign: (id: string) => Promise<void>
  importCampaigns: (items: CampaignRecord[]) => Promise<void>
  reloadCampaigns: () => Promise<void>
  addArtistRecord: (record: ArtistRecord) => Promise<void>
  updateArtistRecord: (record: ArtistRecord) => Promise<void>
  deleteArtistRecord: (id: string) => Promise<void>
  importArtistRecords: (items: ArtistRecord[]) => Promise<void>
  reloadArtistRecords: () => Promise<void>
  addYouTubeThumbnailRecord: (record: YouTubeThumbnailRecord) => Promise<void>
  updateYouTubeThumbnailRecord: (record: YouTubeThumbnailRecord) => Promise<void>
  deleteYouTubeThumbnailRecord: (id: string) => Promise<void>
  importYouTubeThumbnailRecords: (items: YouTubeThumbnailRecord[]) => Promise<void>
  reloadYouTubeThumbnailRecords: () => Promise<void>
}

const StoreContext = React.createContext<StoreContextValue | null>(null)

export function useStore() {
  const ctx = React.useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [prompts, setPrompts] = React.useState<Prompt[]>([])
  const [workflows, setWorkflows] = React.useState<Workflow[]>([])
  const [runs, setRuns] = React.useState<PromptRun[]>([])
  const [workflowRuns, setWorkflowRuns] = React.useState<WorkflowRun[]>([])
  const [youtubePackages, setYoutubePackages] = React.useState<YouTubePackage[]>(
    [],
  )
  const [merchIdeas, setMerchIdeas] = React.useState<MerchIdea[]>([])
  const [productListings, setProductListings] = React.useState<ProductListing[]>(
    [],
  )
  const [socialRepurposingRecords, setSocialRepurposingRecords] = React.useState<
    SocialRepurposingRecord[]
  >([])
  const [releasePlans, setReleasePlans] = React.useState<ReleasePlan[]>([])
  const [analyticsRecords, setAnalyticsRecords] = React.useState<AnalyticsRecord[]>(
    [],
  )
  const [mockupPromptRecords, setMockupPromptRecords] = React.useState<
    MockupPromptRecord[]
  >([])
  const [emailCampaignRecords, setEmailCampaignRecords] = React.useState<
    EmailCampaignRecord[]
  >([])
  const [campaigns, setCampaigns] = React.useState<CampaignRecord[]>([])
  const [artistRecords, setArtistRecords] = React.useState<ArtistRecord[]>([])
  const [youtubeThumbnailRecords, setYoutubeThumbnailRecords] = React.useState<
    YouTubeThumbnailRecord[]
  >([])
  const [hydrated, setHydrated] = React.useState(false)
  const [promptsUseDatabase, setPromptsUseDatabase] = React.useState(true)
  const [workflowsUseDatabase, setWorkflowsUseDatabase] = React.useState(true)
  const [runsUseDatabase, setRunsUseDatabase] = React.useState(true)
  const [workflowRunsUseDatabase, setWorkflowRunsUseDatabase] =
    React.useState(true)
  const [youtubePackagesUseDatabase, setYoutubePackagesUseDatabase] =
    React.useState(true)
  const [youtubeThumbnailRecordsUseDatabase, setYoutubeThumbnailRecordsUseDatabase] =
    React.useState(true)
  const [releasePlansUseDatabase, setReleasePlansUseDatabase] =
    React.useState(true)
  const [artistRecordsUseDatabase, setArtistRecordsUseDatabase] =
    React.useState(true)
  const [merchIdeasUseDatabase, setMerchIdeasUseDatabase] =
    React.useState(true)
  const [productListingsUseDatabase, setProductListingsUseDatabase] =
    React.useState(true)
  const [socialRepurposingRecordsUseDatabase, setSocialRepurposingRecordsUseDatabase] =
    React.useState(true)
  const [analyticsRecordsUseDatabase, setAnalyticsRecordsUseDatabase] =
    React.useState(true)
  const [mockupPromptRecordsUseDatabase, setMockupPromptRecordsUseDatabase] =
    React.useState(true)
  const [emailCampaignRecordsUseDatabase, setEmailCampaignRecordsUseDatabase] =
    React.useState(true)
  const [campaignsUseDatabase, setCampaignsUseDatabase] = React.useState(true)

  const reloadPrompts = React.useCallback(async () => {
    const next = await getPrompts()
    setPrompts(next)
    setPromptsUseDatabase(true)
  }, [])

  const reloadWorkflows = React.useCallback(async () => {
    try {
      const next = await getWorkflows()
      setWorkflows(next)
      setWorkflowsUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload workflows from database; using localStorage.",
        error,
      )
      setWorkflows(loadWorkflows())
      setWorkflowsUseDatabase(false)
      throw error
    }
  }, [])

  const reloadRuns = React.useCallback(async () => {
    try {
      const next = await getPromptRuns()
      setRuns(next)
      setRunsUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload prompt runs from database; using localStorage.",
        error,
      )
      setRuns(loadRuns())
      setRunsUseDatabase(false)
      throw error
    }
  }, [])

  const reloadWorkflowRuns = React.useCallback(async () => {
    try {
      const next = await getWorkflowRuns()
      setWorkflowRuns(next)
      setWorkflowRunsUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload workflow runs from database; using localStorage.",
        error,
      )
      setWorkflowRuns(loadWorkflowRuns())
      setWorkflowRunsUseDatabase(false)
      throw error
    }
  }, [])

  const reloadYouTubePackages = React.useCallback(async () => {
    try {
      const next = await getYouTubePackages()
      setYoutubePackages(next)
      setYoutubePackagesUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload YouTube packages from database; using localStorage.",
        error,
      )
      setYoutubePackages(loadYouTubePackages())
      setYoutubePackagesUseDatabase(false)
      throw error
    }
  }, [])

  const reloadYouTubeThumbnailRecords = React.useCallback(async () => {
    try {
      const next = await getYouTubeThumbnails()
      setYoutubeThumbnailRecords(next)
      setYoutubeThumbnailRecordsUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload YouTube thumbnails from database; using localStorage.",
        error,
      )
      setYoutubeThumbnailRecords(loadYouTubeThumbnailRecords())
      setYoutubeThumbnailRecordsUseDatabase(false)
      throw error
    }
  }, [])

  const reloadReleasePlans = React.useCallback(async () => {
    try {
      const next = await getReleasePlans()
      setReleasePlans(next)
      setReleasePlansUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload release plans from database; using localStorage.",
        error,
      )
      setReleasePlans(loadReleasePlans())
      setReleasePlansUseDatabase(false)
      throw error
    }
  }, [])

  const reloadArtistRecords = React.useCallback(async () => {
    try {
      const next = await getArtists()
      setArtistRecords(next)
      setArtistRecordsUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload artists from database; using localStorage.",
        error,
      )
      setArtistRecords(loadArtistRecords())
      setArtistRecordsUseDatabase(false)
      throw error
    }
  }, [])

  const reloadMerchIdeas = React.useCallback(async () => {
    try {
      const next = await getMerchIdeas()
      setMerchIdeas(next)
      setMerchIdeasUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload merch ideas from database; using localStorage.",
        error,
      )
      setMerchIdeas(loadMerchIdeas())
      setMerchIdeasUseDatabase(false)
      throw error
    }
  }, [])

  const reloadProductListings = React.useCallback(async () => {
    try {
      const next = await getProductListings()
      setProductListings(next)
      setProductListingsUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload product listings from database; using localStorage.",
        error,
      )
      setProductListings(loadProductListings())
      setProductListingsUseDatabase(false)
      throw error
    }
  }, [])

  const reloadSocialRepurposingRecords = React.useCallback(async () => {
    try {
      const next = await getSocialRepurposingRecords()
      setSocialRepurposingRecords(next)
      setSocialRepurposingRecordsUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload social repurposing records from database; using localStorage.",
        error,
      )
      setSocialRepurposingRecords(loadSocialRepurposingRecords())
      setSocialRepurposingRecordsUseDatabase(false)
      throw error
    }
  }, [])

  const reloadAnalyticsRecords = React.useCallback(async () => {
    try {
      const next = await getAnalyticsRecords()
      setAnalyticsRecords(next)
      setAnalyticsRecordsUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload analytics records from database; using localStorage.",
        error,
      )
      setAnalyticsRecords(loadAnalyticsRecords())
      setAnalyticsRecordsUseDatabase(false)
      throw error
    }
  }, [])

  const reloadMockupPromptRecords = React.useCallback(async () => {
    try {
      const next = await getMockupPromptRecords()
      setMockupPromptRecords(next)
      setMockupPromptRecordsUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload mockup prompt records from database; using localStorage.",
        error,
      )
      setMockupPromptRecords(loadMockupPromptRecords())
      setMockupPromptRecordsUseDatabase(false)
      throw error
    }
  }, [])

  const reloadEmailCampaignRecords = React.useCallback(async () => {
    try {
      const next = await getEmailCampaignRecords()
      setEmailCampaignRecords(next)
      setEmailCampaignRecordsUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload email campaign records from database; using localStorage.",
        error,
      )
      setEmailCampaignRecords(loadEmailCampaignRecords())
      setEmailCampaignRecordsUseDatabase(false)
      throw error
    }
  }, [])

  const reloadCampaigns = React.useCallback(async () => {
    try {
      const next = await getCampaigns()
      setCampaigns(next)
      setCampaignsUseDatabase(true)
    } catch (error) {
      console.error(
        "[CreatorOps] Failed to reload campaigns from database; using localStorage.",
        error,
      )
      setCampaigns(loadCampaigns())
      setCampaignsUseDatabase(false)
      throw error
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false

    async function hydrateStore() {
      try {
        const dbPrompts = await getPrompts()
        if (!cancelled) {
          setPrompts(dbPrompts)
          setPromptsUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load prompts from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setPrompts(loadPrompts())
          setPromptsUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbWorkflows = await getWorkflows()
        if (!cancelled) {
          setWorkflows(dbWorkflows)
          setWorkflowsUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load workflows from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setWorkflows(loadWorkflows())
          setWorkflowsUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbRuns = await getPromptRuns()
        if (!cancelled) {
          setRuns(dbRuns)
          setRunsUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load prompt runs from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setRuns(loadRuns())
          setRunsUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbWorkflowRuns = await getWorkflowRuns()
        if (!cancelled) {
          setWorkflowRuns(dbWorkflowRuns)
          setWorkflowRunsUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load workflow runs from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setWorkflowRuns(loadWorkflowRuns())
          setWorkflowRunsUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbYouTubePackages = await getYouTubePackages()
        if (!cancelled) {
          setYoutubePackages(dbYouTubePackages)
          setYoutubePackagesUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load YouTube packages from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setYoutubePackages(loadYouTubePackages())
          setYoutubePackagesUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbMerchIdeas = await getMerchIdeas()
        if (!cancelled) {
          setMerchIdeas(dbMerchIdeas)
          setMerchIdeasUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load merch ideas from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setMerchIdeas(loadMerchIdeas())
          setMerchIdeasUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbProductListings = await getProductListings()
        if (!cancelled) {
          setProductListings(dbProductListings)
          setProductListingsUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load product listings from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setProductListings(loadProductListings())
          setProductListingsUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbSocialRecords = await getSocialRepurposingRecords()
        if (!cancelled) {
          setSocialRepurposingRecords(dbSocialRecords)
          setSocialRepurposingRecordsUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load social repurposing records from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setSocialRepurposingRecords(loadSocialRepurposingRecords())
          setSocialRepurposingRecordsUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbReleasePlans = await getReleasePlans()
        if (!cancelled) {
          setReleasePlans(dbReleasePlans)
          setReleasePlansUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load release plans from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setReleasePlans(loadReleasePlans())
          setReleasePlansUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbAnalytics = await getAnalyticsRecords()
        if (!cancelled) {
          setAnalyticsRecords(dbAnalytics)
          setAnalyticsRecordsUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load analytics records from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setAnalyticsRecords(loadAnalyticsRecords())
          setAnalyticsRecordsUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbMockupPrompts = await getMockupPromptRecords()
        if (!cancelled) {
          setMockupPromptRecords(dbMockupPrompts)
          setMockupPromptRecordsUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load mockup prompt records from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setMockupPromptRecords(loadMockupPromptRecords())
          setMockupPromptRecordsUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbEmailCampaigns = await getEmailCampaignRecords()
        if (!cancelled) {
          setEmailCampaignRecords(dbEmailCampaigns)
          setEmailCampaignRecordsUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load email campaign records from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setEmailCampaignRecords(loadEmailCampaignRecords())
          setEmailCampaignRecordsUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbCampaigns = await getCampaigns()
        if (!cancelled) {
          setCampaigns(dbCampaigns)
          setCampaignsUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load campaigns from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setCampaigns(loadCampaigns())
          setCampaignsUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbArtists = await getArtists()
        if (!cancelled) {
          setArtistRecords(dbArtists)
          setArtistRecordsUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load artists from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setArtistRecords(loadArtistRecords())
          setArtistRecordsUseDatabase(false)
        }
      }

      if (cancelled) return

      try {
        const dbThumbnails = await getYouTubeThumbnails()
        if (!cancelled) {
          setYoutubeThumbnailRecords(dbThumbnails)
          setYoutubeThumbnailRecordsUseDatabase(true)
        }
      } catch (error) {
        console.error(
          "[CreatorOps] Failed to load YouTube thumbnails from database; using localStorage.",
          error,
        )
        if (!cancelled) {
          setYoutubeThumbnailRecords(loadYouTubeThumbnailRecords())
          setYoutubeThumbnailRecordsUseDatabase(false)
        }
      }

      setHydrated(true)
    }

    hydrateStore()

    return () => {
      cancelled = true
    }
  }, [])

  // All current modules persist in SQLite — see lib/actions/*
  // lib/storage.ts localStorage helpers kept for rollback and one-time migration only.

  const addPrompt = React.useCallback(async (p: Prompt) => {
    const saved = await upsertPrompt(p)
    setPrompts((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)])
    setPromptsUseDatabase(true)
  }, [])

  const updatePrompt = React.useCallback(async (p: Prompt) => {
    const saved = await upsertPrompt(p)
    setPrompts((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))
    setPromptsUseDatabase(true)
  }, [])

  const deletePrompt = React.useCallback(async (id: string) => {
    await deletePromptById(id)
    setPrompts((prev) => prev.filter((x) => x.id !== id))
    setPromptsUseDatabase(true)
  }, [])

  const importPrompts = React.useCallback(async (items: Prompt[]) => {
    const merged = await importPromptsToDb(items)
    setPrompts(merged)
    setPromptsUseDatabase(true)
  }, [])

  const importWorkflows = React.useCallback(async (items: Workflow[]) => {
    const merged = await importWorkflowsToDb(items)
    setWorkflows(merged)
    setWorkflowsUseDatabase(true)
  }, [])

  const addWorkflow = React.useCallback(async (w: Workflow) => {
    const saved = await upsertWorkflow(w)
    setWorkflows((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)])
    setWorkflowsUseDatabase(true)
  }, [])

  const updateWorkflow = React.useCallback(async (w: Workflow) => {
    const saved = await upsertWorkflow(w)
    setWorkflows((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))
    setWorkflowsUseDatabase(true)
  }, [])

  const deleteWorkflow = React.useCallback(async (id: string) => {
    await deleteWorkflowById(id)
    setWorkflows((prev) => prev.filter((x) => x.id !== id))
    setWorkflowsUseDatabase(true)
  }, [])

  const getPrompt = React.useCallback(
    (id: string | null) => (id ? prompts.find((p) => p.id === id) : undefined),
    [prompts],
  )

  const addRun = React.useCallback(async (run: PromptRun) => {
    const saved = await upsertPromptRun(run)
    setRuns((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)])
    setRunsUseDatabase(true)
  }, [])

  const updateRun = React.useCallback(async (run: PromptRun) => {
    const saved = await upsertPromptRun(run)
    setRuns((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))
    setRunsUseDatabase(true)
  }, [])

  const deleteRun = React.useCallback(async (id: string) => {
    await deletePromptRunById(id)
    setRuns((prev) => prev.filter((x) => x.id !== id))
    setRunsUseDatabase(true)
  }, [])

  const importRuns = React.useCallback(async (items: PromptRun[]) => {
    const merged = await importPromptRunsToDb(items)
    setRuns(merged)
    setRunsUseDatabase(true)
  }, [])

  const addWorkflowRun = React.useCallback(async (run: WorkflowRun) => {
    const saved = await upsertWorkflowRun(run)
    setWorkflowRuns((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)])
    setWorkflowRunsUseDatabase(true)
  }, [])

  const updateWorkflowRun = React.useCallback(async (run: WorkflowRun) => {
    const saved = await upsertWorkflowRun(run)
    setWorkflowRuns((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))
    setWorkflowRunsUseDatabase(true)
  }, [])

  const deleteWorkflowRun = React.useCallback(async (id: string) => {
    await deleteWorkflowRunById(id)
    setWorkflowRuns((prev) => prev.filter((x) => x.id !== id))
    setWorkflowRunsUseDatabase(true)
  }, [])

  const importWorkflowRuns = React.useCallback(async (items: WorkflowRun[]) => {
    const merged = await importWorkflowRunsToDb(items)
    setWorkflowRuns(merged)
    setWorkflowRunsUseDatabase(true)
  }, [])

  const addYouTubePackage = React.useCallback(async (pkg: YouTubePackage) => {
    const saved = await upsertYouTubePackage(pkg)
    setYoutubePackages((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)])
    setYoutubePackagesUseDatabase(true)
  }, [])

  const updateYouTubePackage = React.useCallback(async (pkg: YouTubePackage) => {
    const saved = await upsertYouTubePackage(pkg)
    setYoutubePackages((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))
    setYoutubePackagesUseDatabase(true)
  }, [])

  const deleteYouTubePackage = React.useCallback(async (id: string) => {
    await deleteYouTubePackageById(id)
    setYoutubePackages((prev) => prev.filter((x) => x.id !== id))
    setYoutubePackagesUseDatabase(true)
  }, [])

  const importYouTubePackages = React.useCallback(
    async (items: YouTubePackage[]) => {
      const merged = await importYouTubePackagesToDb(items)
      setYoutubePackages(merged)
      setYoutubePackagesUseDatabase(true)
    },
    [],
  )

  const addMerchIdea = React.useCallback(async (idea: MerchIdea) => {
    const saved = await upsertMerchIdea(idea)
    setMerchIdeas((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)])
    setMerchIdeasUseDatabase(true)
  }, [])

  const updateMerchIdea = React.useCallback(async (idea: MerchIdea) => {
    const saved = await upsertMerchIdea(idea)
    setMerchIdeas((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))
    setMerchIdeasUseDatabase(true)
  }, [])

  const deleteMerchIdea = React.useCallback(async (id: string) => {
    await deleteMerchIdeaById(id)
    setMerchIdeas((prev) => prev.filter((x) => x.id !== id))
    setMerchIdeasUseDatabase(true)
  }, [])

  const importMerchIdeas = React.useCallback(async (items: MerchIdea[]) => {
    const merged = await importMerchIdeasToDb(items)
    setMerchIdeas(merged)
    setMerchIdeasUseDatabase(true)
  }, [])

  const addProductListing = React.useCallback(async (listing: ProductListing) => {
    const saved = await upsertProductListing(listing)
    setProductListings((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)])
    setProductListingsUseDatabase(true)
  }, [])

  const updateProductListing = React.useCallback(async (listing: ProductListing) => {
    const saved = await upsertProductListing(listing)
    setProductListings((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))
    setProductListingsUseDatabase(true)
  }, [])

  const deleteProductListing = React.useCallback(async (id: string) => {
    await deleteProductListingById(id)
    setProductListings((prev) => prev.filter((x) => x.id !== id))
    setProductListingsUseDatabase(true)
  }, [])

  const importProductListings = React.useCallback(
    async (items: ProductListing[]) => {
      const merged = await importProductListingsToDb(items)
      setProductListings(merged)
      setProductListingsUseDatabase(true)
    },
    [],
  )

  const addSocialRepurposingRecord = React.useCallback(
    async (record: SocialRepurposingRecord) => {
      const saved = await upsertSocialRepurposingRecord(record)
      setSocialRepurposingRecords((prev) => [
        saved,
        ...prev.filter((x) => x.id !== saved.id),
      ])
      setSocialRepurposingRecordsUseDatabase(true)
    },
    [],
  )

  const updateSocialRepurposingRecord = React.useCallback(
    async (record: SocialRepurposingRecord) => {
      const saved = await upsertSocialRepurposingRecord(record)
      setSocialRepurposingRecords((prev) =>
        prev.map((x) => (x.id === saved.id ? saved : x)),
      )
      setSocialRepurposingRecordsUseDatabase(true)
    },
    [],
  )

  const deleteSocialRepurposingRecord = React.useCallback(async (id: string) => {
    await deleteSocialRepurposingRecordById(id)
    setSocialRepurposingRecords((prev) => prev.filter((x) => x.id !== id))
    setSocialRepurposingRecordsUseDatabase(true)
  }, [])

  const importSocialRepurposingRecords = React.useCallback(
    async (items: SocialRepurposingRecord[]) => {
      const merged = await importSocialRepurposingRecordsToDb(items)
      setSocialRepurposingRecords(merged)
      setSocialRepurposingRecordsUseDatabase(true)
    },
    [],
  )

  const addReleasePlan = React.useCallback(async (plan: ReleasePlan) => {
    const saved = await upsertReleasePlan(plan)
    setReleasePlans((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)])
    setReleasePlansUseDatabase(true)
  }, [])

  const updateReleasePlan = React.useCallback(async (plan: ReleasePlan) => {
    const saved = await upsertReleasePlan(plan)
    setReleasePlans((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))
    setReleasePlansUseDatabase(true)
  }, [])

  const deleteReleasePlan = React.useCallback(async (id: string) => {
    await deleteReleasePlanById(id)
    setReleasePlans((prev) => prev.filter((x) => x.id !== id))
    setReleasePlansUseDatabase(true)
  }, [])

  const importReleasePlans = React.useCallback(async (items: ReleasePlan[]) => {
    const merged = await importReleasePlansToDb(items)
    setReleasePlans(merged)
    setReleasePlansUseDatabase(true)
  }, [])

  const addAnalyticsRecord = React.useCallback(async (record: AnalyticsRecord) => {
    const saved = await upsertAnalyticsRecord(record)
    setAnalyticsRecords((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)])
    setAnalyticsRecordsUseDatabase(true)
  }, [])

  const updateAnalyticsRecord = React.useCallback(async (record: AnalyticsRecord) => {
    const saved = await upsertAnalyticsRecord(record)
    setAnalyticsRecords((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))
    setAnalyticsRecordsUseDatabase(true)
  }, [])

  const deleteAnalyticsRecord = React.useCallback(async (id: string) => {
    await deleteAnalyticsRecordById(id)
    setAnalyticsRecords((prev) => prev.filter((x) => x.id !== id))
    setAnalyticsRecordsUseDatabase(true)
  }, [])

  const importAnalyticsRecords = React.useCallback(
    async (items: AnalyticsRecord[]) => {
      const merged = await importAnalyticsRecordsToDb(items)
      setAnalyticsRecords(merged)
      setAnalyticsRecordsUseDatabase(true)
    },
    [],
  )

  const addMockupPromptRecord = React.useCallback(
    async (record: MockupPromptRecord) => {
      const saved = await upsertMockupPromptRecord(record)
      setMockupPromptRecords((prev) => [
        saved,
        ...prev.filter((x) => x.id !== saved.id),
      ])
      setMockupPromptRecordsUseDatabase(true)
    },
    [],
  )

  const updateMockupPromptRecord = React.useCallback(
    async (record: MockupPromptRecord) => {
      const saved = await upsertMockupPromptRecord(record)
      setMockupPromptRecords((prev) =>
        prev.map((x) => (x.id === saved.id ? saved : x)),
      )
      setMockupPromptRecordsUseDatabase(true)
    },
    [],
  )

  const deleteMockupPromptRecord = React.useCallback(async (id: string) => {
    await deleteMockupPromptRecordById(id)
    setMockupPromptRecords((prev) => prev.filter((x) => x.id !== id))
    setMockupPromptRecordsUseDatabase(true)
  }, [])

  const importMockupPromptRecords = React.useCallback(
    async (items: MockupPromptRecord[]) => {
      const merged = await importMockupPromptRecordsToDb(items)
      setMockupPromptRecords(merged)
      setMockupPromptRecordsUseDatabase(true)
    },
    [],
  )

  const addEmailCampaignRecord = React.useCallback(
    async (record: EmailCampaignRecord) => {
      const saved = await upsertEmailCampaignRecord(record)
      setEmailCampaignRecords((prev) => [
        saved,
        ...prev.filter((x) => x.id !== saved.id),
      ])
      setEmailCampaignRecordsUseDatabase(true)
    },
    [],
  )

  const updateEmailCampaignRecord = React.useCallback(
    async (record: EmailCampaignRecord) => {
      const saved = await upsertEmailCampaignRecord(record)
      setEmailCampaignRecords((prev) =>
        prev.map((x) => (x.id === saved.id ? saved : x)),
      )
      setEmailCampaignRecordsUseDatabase(true)
    },
    [],
  )

  const deleteEmailCampaignRecord = React.useCallback(async (id: string) => {
    await deleteEmailCampaignRecordById(id)
    setEmailCampaignRecords((prev) => prev.filter((x) => x.id !== id))
    setEmailCampaignRecordsUseDatabase(true)
  }, [])

  const importEmailCampaignRecords = React.useCallback(
    async (items: EmailCampaignRecord[]) => {
      const merged = await importEmailCampaignRecordsToDb(items)
      setEmailCampaignRecords(merged)
      setEmailCampaignRecordsUseDatabase(true)
    },
    [],
  )

  const addCampaign = React.useCallback(async (record: CampaignRecord) => {
    const saved = await upsertCampaign(record)
    setCampaigns((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)])
    setCampaignsUseDatabase(true)
  }, [])

  const updateCampaign = React.useCallback(async (record: CampaignRecord) => {
    const saved = await upsertCampaign(record)
    setCampaigns((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))
    setCampaignsUseDatabase(true)
  }, [])

  const deleteCampaign = React.useCallback(async (id: string) => {
    await deleteCampaignById(id)
    setCampaigns((prev) => prev.filter((x) => x.id !== id))
    setCampaignsUseDatabase(true)
  }, [])

  const importCampaigns = React.useCallback(async (items: CampaignRecord[]) => {
    const merged = await importCampaignsToDb(items)
    setCampaigns(merged)
    setCampaignsUseDatabase(true)
  }, [])

  const addArtistRecord = React.useCallback(async (record: ArtistRecord) => {
    const saved = await upsertArtist(record)
    setArtistRecords((prev) => [saved, ...prev.filter((x) => x.id !== saved.id)])
    setArtistRecordsUseDatabase(true)
  }, [])

  const updateArtistRecord = React.useCallback(async (record: ArtistRecord) => {
    const saved = await upsertArtist(record)
    setArtistRecords((prev) => prev.map((x) => (x.id === saved.id ? saved : x)))
    setArtistRecordsUseDatabase(true)
  }, [])

  const deleteArtistRecord = React.useCallback(async (id: string) => {
    await deleteArtistById(id)
    setArtistRecords((prev) => prev.filter((x) => x.id !== id))
    setArtistRecordsUseDatabase(true)
  }, [])

  const importArtistRecords = React.useCallback(async (items: ArtistRecord[]) => {
    const merged = await importArtistsToDb(items)
    setArtistRecords(merged)
    setArtistRecordsUseDatabase(true)
  }, [])

  const addYouTubeThumbnailRecord = React.useCallback(
    async (record: YouTubeThumbnailRecord) => {
      const saved = await upsertYouTubeThumbnail(record)
      setYoutubeThumbnailRecords((prev) => [
        saved,
        ...prev.filter((x) => x.id !== saved.id),
      ])
      setYoutubeThumbnailRecordsUseDatabase(true)
    },
    [],
  )

  const updateYouTubeThumbnailRecord = React.useCallback(
    async (record: YouTubeThumbnailRecord) => {
      const saved = await upsertYouTubeThumbnail(record)
      setYoutubeThumbnailRecords((prev) =>
        prev.map((x) => (x.id === saved.id ? saved : x)),
      )
      setYoutubeThumbnailRecordsUseDatabase(true)
    },
    [],
  )

  const deleteYouTubeThumbnailRecord = React.useCallback(async (id: string) => {
    await deleteYouTubeThumbnailById(id)
    setYoutubeThumbnailRecords((prev) => prev.filter((x) => x.id !== id))
    setYoutubeThumbnailRecordsUseDatabase(true)
  }, [])

  const importYouTubeThumbnailRecords = React.useCallback(
    async (items: YouTubeThumbnailRecord[]) => {
      const merged = await importYouTubeThumbnailsToDb(items)
      setYoutubeThumbnailRecords(merged)
      setYoutubeThumbnailRecordsUseDatabase(true)
    },
    [],
  )

  const value: StoreContextValue = {
    prompts,
    workflows,
    runs,
    workflowRuns,
    youtubePackages,
    merchIdeas,
    productListings,
    socialRepurposingRecords,
    releasePlans,
    analyticsRecords,
    mockupPromptRecords,
    emailCampaignRecords,
    campaigns,
    artistRecords,
    youtubeThumbnailRecords,
    hydrated,
    promptsUseDatabase,
    workflowsUseDatabase,
    runsUseDatabase,
    workflowRunsUseDatabase,
    youtubePackagesUseDatabase,
    youtubeThumbnailRecordsUseDatabase,
    releasePlansUseDatabase,
    artistRecordsUseDatabase,
    merchIdeasUseDatabase,
    productListingsUseDatabase,
    socialRepurposingRecordsUseDatabase,
    analyticsRecordsUseDatabase,
    mockupPromptRecordsUseDatabase,
    emailCampaignRecordsUseDatabase,
    campaignsUseDatabase,
    addPrompt,
    updatePrompt,
    deletePrompt,
    importPrompts,
    reloadPrompts,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
    importWorkflows,
    reloadWorkflows,
    getPrompt,
    addRun,
    updateRun,
    deleteRun,
    importRuns,
    reloadRuns,
    addWorkflowRun,
    updateWorkflowRun,
    deleteWorkflowRun,
    importWorkflowRuns,
    reloadWorkflowRuns,
    addYouTubePackage,
    updateYouTubePackage,
    deleteYouTubePackage,
    importYouTubePackages,
    reloadYouTubePackages,
    addMerchIdea,
    updateMerchIdea,
    deleteMerchIdea,
    importMerchIdeas,
    reloadMerchIdeas,
    addProductListing,
    updateProductListing,
    deleteProductListing,
    importProductListings,
    reloadProductListings,
    addSocialRepurposingRecord,
    updateSocialRepurposingRecord,
    deleteSocialRepurposingRecord,
    importSocialRepurposingRecords,
    reloadSocialRepurposingRecords,
    addReleasePlan,
    updateReleasePlan,
    deleteReleasePlan,
    importReleasePlans,
    reloadReleasePlans,
    addAnalyticsRecord,
    updateAnalyticsRecord,
    deleteAnalyticsRecord,
    importAnalyticsRecords,
    reloadAnalyticsRecords,
    addMockupPromptRecord,
    updateMockupPromptRecord,
    deleteMockupPromptRecord,
    importMockupPromptRecords,
    reloadMockupPromptRecords,
    addEmailCampaignRecord,
    updateEmailCampaignRecord,
    deleteEmailCampaignRecord,
    importEmailCampaignRecords,
    reloadEmailCampaignRecords,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    importCampaigns,
    reloadCampaigns,
    addArtistRecord,
    updateArtistRecord,
    deleteArtistRecord,
    importArtistRecords,
    reloadArtistRecords,
    addYouTubeThumbnailRecord,
    updateYouTubeThumbnailRecord,
    deleteYouTubeThumbnailRecord,
    importYouTubeThumbnailRecords,
    reloadYouTubeThumbnailRecords,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
