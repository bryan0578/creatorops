"use client"

import * as React from "react"
import type {
  AnalyticsRecord,
  ArtistRecord,
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
  mergeById,
  saveAnalyticsRecords,
  saveArtistRecords,
  saveEmailCampaignRecords,
  saveMerchIdeas,
  saveMockupPromptRecords,
  saveProductListings,
  saveReleasePlans,
  saveSocialRepurposingRecords,
  saveYouTubeThumbnailRecords,
} from "@/lib/storage"
import { normalizeAnalyticsRecord } from "@/lib/analytics-tracker"
import { normalizeArtistRecord } from "@/lib/artist-crm"
import { normalizeEmailCampaignRecord } from "@/lib/email-campaigns"
import { normalizeMockupPromptRecord } from "@/lib/mockup-prompts"
import { normalizeMerchIdea } from "@/lib/merch-ideas"
import { normalizeProductListing } from "@/lib/product-listings"
import { normalizeReleasePlan } from "@/lib/release-planner"
import { normalizeSocialRepurposingRecord } from "@/lib/social-repurposing"
import { normalizeYouTubeThumbnailRecord } from "@/lib/youtube-thumbnails"
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
  artistRecords: ArtistRecord[]
  youtubeThumbnailRecords: YouTubeThumbnailRecord[]
  hydrated: boolean
  promptsUseDatabase: boolean
  workflowsUseDatabase: boolean
  runsUseDatabase: boolean
  workflowRunsUseDatabase: boolean
  youtubePackagesUseDatabase: boolean
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
  addMerchIdea: (idea: MerchIdea) => void
  updateMerchIdea: (idea: MerchIdea) => void
  deleteMerchIdea: (id: string) => void
  importMerchIdeas: (items: MerchIdea[]) => void
  addProductListing: (listing: ProductListing) => void
  updateProductListing: (listing: ProductListing) => void
  deleteProductListing: (id: string) => void
  importProductListings: (items: ProductListing[]) => void
  addSocialRepurposingRecord: (record: SocialRepurposingRecord) => void
  updateSocialRepurposingRecord: (record: SocialRepurposingRecord) => void
  deleteSocialRepurposingRecord: (id: string) => void
  importSocialRepurposingRecords: (items: SocialRepurposingRecord[]) => void
  addReleasePlan: (plan: ReleasePlan) => void
  updateReleasePlan: (plan: ReleasePlan) => void
  deleteReleasePlan: (id: string) => void
  importReleasePlans: (items: ReleasePlan[]) => void
  addAnalyticsRecord: (record: AnalyticsRecord) => void
  updateAnalyticsRecord: (record: AnalyticsRecord) => void
  deleteAnalyticsRecord: (id: string) => void
  importAnalyticsRecords: (items: AnalyticsRecord[]) => void
  addMockupPromptRecord: (record: MockupPromptRecord) => void
  updateMockupPromptRecord: (record: MockupPromptRecord) => void
  deleteMockupPromptRecord: (id: string) => void
  importMockupPromptRecords: (items: MockupPromptRecord[]) => void
  addEmailCampaignRecord: (record: EmailCampaignRecord) => void
  updateEmailCampaignRecord: (record: EmailCampaignRecord) => void
  deleteEmailCampaignRecord: (id: string) => void
  importEmailCampaignRecords: (items: EmailCampaignRecord[]) => void
  addArtistRecord: (record: ArtistRecord) => void
  updateArtistRecord: (record: ArtistRecord) => void
  deleteArtistRecord: (id: string) => void
  importArtistRecords: (items: ArtistRecord[]) => void
  addYouTubeThumbnailRecord: (record: YouTubeThumbnailRecord) => void
  updateYouTubeThumbnailRecord: (record: YouTubeThumbnailRecord) => void
  deleteYouTubeThumbnailRecord: (id: string) => void
  importYouTubeThumbnailRecords: (items: YouTubeThumbnailRecord[]) => void
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

      setMerchIdeas(loadMerchIdeas())
      setProductListings(loadProductListings())
      setSocialRepurposingRecords(loadSocialRepurposingRecords())
      setReleasePlans(loadReleasePlans())
      setAnalyticsRecords(loadAnalyticsRecords())
      setMockupPromptRecords(loadMockupPromptRecords())
      setEmailCampaignRecords(loadEmailCampaignRecords())
      setArtistRecords(loadArtistRecords())
      setYoutubeThumbnailRecords(loadYouTubeThumbnailRecords())
      setHydrated(true)
    }

    hydrateStore()

    return () => {
      cancelled = true
    }
  }, [])

  // Core modules persist in SQLite — see lib/actions/*
  // TODO: Remove localStorage save effects as each module migrates to Prisma.

  React.useEffect(() => {
    if (!hydrated) return
    saveMerchIdeas(merchIdeas)
  }, [merchIdeas, hydrated])

  React.useEffect(() => {
    if (!hydrated) return
    saveProductListings(productListings)
  }, [productListings, hydrated])

  React.useEffect(() => {
    if (!hydrated) return
    saveSocialRepurposingRecords(socialRepurposingRecords)
  }, [socialRepurposingRecords, hydrated])

  React.useEffect(() => {
    if (!hydrated) return
    saveReleasePlans(releasePlans)
  }, [releasePlans, hydrated])

  React.useEffect(() => {
    if (!hydrated) return
    saveAnalyticsRecords(analyticsRecords)
  }, [analyticsRecords, hydrated])

  React.useEffect(() => {
    if (!hydrated) return
    saveMockupPromptRecords(mockupPromptRecords)
  }, [mockupPromptRecords, hydrated])

  React.useEffect(() => {
    if (!hydrated) return
    saveEmailCampaignRecords(emailCampaignRecords)
  }, [emailCampaignRecords, hydrated])

  React.useEffect(() => {
    if (!hydrated) return
    saveArtistRecords(artistRecords)
  }, [artistRecords, hydrated])

  React.useEffect(() => {
    if (!hydrated) return
    saveYouTubeThumbnailRecords(youtubeThumbnailRecords)
  }, [youtubeThumbnailRecords, hydrated])

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

  const addMerchIdea = React.useCallback((idea: MerchIdea) => {
    setMerchIdeas((prev) => [idea, ...prev])
  }, [])

  const updateMerchIdea = React.useCallback((idea: MerchIdea) => {
    setMerchIdeas((prev) => prev.map((x) => (x.id === idea.id ? idea : x)))
  }, [])

  const deleteMerchIdea = React.useCallback((id: string) => {
    setMerchIdeas((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importMerchIdeas = React.useCallback((items: MerchIdea[]) => {
    setMerchIdeas((prev) =>
      mergeById(
        prev,
        items.map((item) => normalizeMerchIdea(item)),
      ),
    )
  }, [])

  const addProductListing = React.useCallback((listing: ProductListing) => {
    setProductListings((prev) => [listing, ...prev])
  }, [])

  const updateProductListing = React.useCallback((listing: ProductListing) => {
    setProductListings((prev) =>
      prev.map((x) => (x.id === listing.id ? listing : x)),
    )
  }, [])

  const deleteProductListing = React.useCallback((id: string) => {
    setProductListings((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importProductListings = React.useCallback((items: ProductListing[]) => {
    setProductListings((prev) =>
      mergeById(
        prev,
        items.map((item) => normalizeProductListing(item)),
      ),
    )
  }, [])

  const addSocialRepurposingRecord = React.useCallback(
    (record: SocialRepurposingRecord) => {
      setSocialRepurposingRecords((prev) => [record, ...prev])
    },
    [],
  )

  const updateSocialRepurposingRecord = React.useCallback(
    (record: SocialRepurposingRecord) => {
      setSocialRepurposingRecords((prev) =>
        prev.map((x) => (x.id === record.id ? record : x)),
      )
    },
    [],
  )

  const deleteSocialRepurposingRecord = React.useCallback((id: string) => {
    setSocialRepurposingRecords((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importSocialRepurposingRecords = React.useCallback(
    (items: SocialRepurposingRecord[]) => {
      setSocialRepurposingRecords((prev) =>
        mergeById(
          prev,
          items.map((item) => normalizeSocialRepurposingRecord(item)),
        ),
      )
    },
    [],
  )

  const addReleasePlan = React.useCallback((plan: ReleasePlan) => {
    setReleasePlans((prev) => [plan, ...prev])
  }, [])

  const updateReleasePlan = React.useCallback((plan: ReleasePlan) => {
    setReleasePlans((prev) => prev.map((x) => (x.id === plan.id ? plan : x)))
  }, [])

  const deleteReleasePlan = React.useCallback((id: string) => {
    setReleasePlans((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importReleasePlans = React.useCallback((items: ReleasePlan[]) => {
    setReleasePlans((prev) =>
      mergeById(
        prev,
        items.map((item) => normalizeReleasePlan(item)),
      ),
    )
  }, [])

  const addAnalyticsRecord = React.useCallback((record: AnalyticsRecord) => {
    setAnalyticsRecords((prev) => [record, ...prev])
  }, [])

  const updateAnalyticsRecord = React.useCallback((record: AnalyticsRecord) => {
    setAnalyticsRecords((prev) =>
      prev.map((x) => (x.id === record.id ? record : x)),
    )
  }, [])

  const deleteAnalyticsRecord = React.useCallback((id: string) => {
    setAnalyticsRecords((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importAnalyticsRecords = React.useCallback(
    (items: AnalyticsRecord[]) => {
      setAnalyticsRecords((prev) =>
        mergeById(
          prev,
          items.map((item) => normalizeAnalyticsRecord(item)),
        ),
      )
    },
    [],
  )

  const addMockupPromptRecord = React.useCallback((record: MockupPromptRecord) => {
    setMockupPromptRecords((prev) => [record, ...prev])
  }, [])

  const updateMockupPromptRecord = React.useCallback(
    (record: MockupPromptRecord) => {
      setMockupPromptRecords((prev) =>
        prev.map((x) => (x.id === record.id ? record : x)),
      )
    },
    [],
  )

  const deleteMockupPromptRecord = React.useCallback((id: string) => {
    setMockupPromptRecords((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importMockupPromptRecords = React.useCallback(
    (items: MockupPromptRecord[]) => {
      setMockupPromptRecords((prev) =>
        mergeById(
          prev,
          items.map((item) => normalizeMockupPromptRecord(item)),
        ),
      )
    },
    [],
  )

  const addEmailCampaignRecord = React.useCallback(
    (record: EmailCampaignRecord) => {
      setEmailCampaignRecords((prev) => [record, ...prev])
    },
    [],
  )

  const updateEmailCampaignRecord = React.useCallback(
    (record: EmailCampaignRecord) => {
      setEmailCampaignRecords((prev) =>
        prev.map((x) => (x.id === record.id ? record : x)),
      )
    },
    [],
  )

  const deleteEmailCampaignRecord = React.useCallback((id: string) => {
    setEmailCampaignRecords((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importEmailCampaignRecords = React.useCallback(
    (items: EmailCampaignRecord[]) => {
      setEmailCampaignRecords((prev) =>
        mergeById(
          prev,
          items.map((item) => normalizeEmailCampaignRecord(item)),
        ),
      )
    },
    [],
  )

  const addArtistRecord = React.useCallback((record: ArtistRecord) => {
    setArtistRecords((prev) => [record, ...prev])
  }, [])

  const updateArtistRecord = React.useCallback((record: ArtistRecord) => {
    setArtistRecords((prev) =>
      prev.map((x) => (x.id === record.id ? record : x)),
    )
  }, [])

  const deleteArtistRecord = React.useCallback((id: string) => {
    setArtistRecords((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importArtistRecords = React.useCallback((items: ArtistRecord[]) => {
    setArtistRecords((prev) =>
      mergeById(prev, items.map((item) => normalizeArtistRecord(item))),
    )
  }, [])

  const addYouTubeThumbnailRecord = React.useCallback(
    (record: YouTubeThumbnailRecord) => {
      setYoutubeThumbnailRecords((prev) => [record, ...prev])
    },
    [],
  )

  const updateYouTubeThumbnailRecord = React.useCallback(
    (record: YouTubeThumbnailRecord) => {
      setYoutubeThumbnailRecords((prev) =>
        prev.map((x) => (x.id === record.id ? record : x)),
      )
    },
    [],
  )

  const deleteYouTubeThumbnailRecord = React.useCallback((id: string) => {
    setYoutubeThumbnailRecords((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importYouTubeThumbnailRecords = React.useCallback(
    (items: YouTubeThumbnailRecord[]) => {
      setYoutubeThumbnailRecords((prev) =>
        mergeById(
          prev,
          items.map((item) => normalizeYouTubeThumbnailRecord(item)),
        ),
      )
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
    artistRecords,
    youtubeThumbnailRecords,
    hydrated,
    promptsUseDatabase,
    workflowsUseDatabase,
    runsUseDatabase,
    workflowRunsUseDatabase,
    youtubePackagesUseDatabase,
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
    addProductListing,
    updateProductListing,
    deleteProductListing,
    importProductListings,
    addSocialRepurposingRecord,
    updateSocialRepurposingRecord,
    deleteSocialRepurposingRecord,
    importSocialRepurposingRecords,
    addReleasePlan,
    updateReleasePlan,
    deleteReleasePlan,
    importReleasePlans,
    addAnalyticsRecord,
    updateAnalyticsRecord,
    deleteAnalyticsRecord,
    importAnalyticsRecords,
    addMockupPromptRecord,
    updateMockupPromptRecord,
    deleteMockupPromptRecord,
    importMockupPromptRecords,
    addEmailCampaignRecord,
    updateEmailCampaignRecord,
    deleteEmailCampaignRecord,
    importEmailCampaignRecords,
    addArtistRecord,
    updateArtistRecord,
    deleteArtistRecord,
    importArtistRecords,
    addYouTubeThumbnailRecord,
    updateYouTubeThumbnailRecord,
    deleteYouTubeThumbnailRecord,
    importYouTubeThumbnailRecords,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
