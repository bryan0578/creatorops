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
  savePrompts,
  saveReleasePlans,
  saveRuns,
  saveSocialRepurposingRecords,
  saveWorkflowRuns,
  saveWorkflows,
  saveYouTubePackages,
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
import { normalizeYouTubePackage } from "@/lib/youtube-packaging"
import { normalizeYouTubeThumbnailRecord } from "@/lib/youtube-thumbnails"

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
  addPrompt: (p: Prompt) => void
  updatePrompt: (p: Prompt) => void
  deletePrompt: (id: string) => void
  importPrompts: (items: Prompt[]) => void
  addWorkflow: (w: Workflow) => void
  updateWorkflow: (w: Workflow) => void
  deleteWorkflow: (id: string) => void
  importWorkflows: (items: Workflow[]) => void
  getPrompt: (id: string | null) => Prompt | undefined
  addRun: (run: PromptRun) => void
  updateRun: (run: PromptRun) => void
  deleteRun: (id: string) => void
  importRuns: (items: PromptRun[]) => void
  addWorkflowRun: (run: WorkflowRun) => void
  updateWorkflowRun: (run: WorkflowRun) => void
  deleteWorkflowRun: (id: string) => void
  importWorkflowRuns: (items: WorkflowRun[]) => void
  addYouTubePackage: (pkg: YouTubePackage) => void
  updateYouTubePackage: (pkg: YouTubePackage) => void
  deleteYouTubePackage: (id: string) => void
  importYouTubePackages: (items: YouTubePackage[]) => void
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

  React.useEffect(() => {
    setPrompts(loadPrompts())
    setWorkflows(loadWorkflows())
    setRuns(loadRuns())
    setWorkflowRuns(loadWorkflowRuns())
    setYoutubePackages(loadYouTubePackages())
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
  }, [])

  React.useEffect(() => {
    if (!hydrated) return
    savePrompts(prompts)
  }, [prompts, hydrated])

  React.useEffect(() => {
    if (!hydrated) return
    saveWorkflows(workflows)
  }, [workflows, hydrated])

  React.useEffect(() => {
    if (!hydrated) return
    saveRuns(runs)
  }, [runs, hydrated])

  React.useEffect(() => {
    if (!hydrated) return
    saveWorkflowRuns(workflowRuns)
  }, [workflowRuns, hydrated])

  React.useEffect(() => {
    if (!hydrated) return
    saveYouTubePackages(youtubePackages)
  }, [youtubePackages, hydrated])

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

  const addPrompt = React.useCallback((p: Prompt) => {
    setPrompts((prev) => [p, ...prev])
  }, [])

  const updatePrompt = React.useCallback((p: Prompt) => {
    setPrompts((prev) => prev.map((x) => (x.id === p.id ? p : x)))
  }, [])

  const deletePrompt = React.useCallback((id: string) => {
    setPrompts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importPrompts = React.useCallback((items: Prompt[]) => {
    setPrompts((prev) => mergeById(prev, items))
  }, [])

  const importWorkflows = React.useCallback((items: Workflow[]) => {
    setWorkflows((prev) => mergeById(prev, items))
  }, [])

  const addWorkflow = React.useCallback((w: Workflow) => {
    setWorkflows((prev) => [w, ...prev])
  }, [])

  const updateWorkflow = React.useCallback((w: Workflow) => {
    setWorkflows((prev) => prev.map((x) => (x.id === w.id ? w : x)))
  }, [])

  const deleteWorkflow = React.useCallback((id: string) => {
    setWorkflows((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const getPrompt = React.useCallback(
    (id: string | null) => (id ? prompts.find((p) => p.id === id) : undefined),
    [prompts],
  )

  const addRun = React.useCallback((run: PromptRun) => {
    setRuns((prev) => [run, ...prev])
  }, [])

  const updateRun = React.useCallback((run: PromptRun) => {
    setRuns((prev) => prev.map((x) => (x.id === run.id ? run : x)))
  }, [])

  const deleteRun = React.useCallback((id: string) => {
    setRuns((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importRuns = React.useCallback((items: PromptRun[]) => {
    setRuns((prev) => mergeById(prev, items))
  }, [])

  const addWorkflowRun = React.useCallback((run: WorkflowRun) => {
    setWorkflowRuns((prev) => [run, ...prev])
  }, [])

  const updateWorkflowRun = React.useCallback((run: WorkflowRun) => {
    setWorkflowRuns((prev) => prev.map((x) => (x.id === run.id ? run : x)))
  }, [])

  const deleteWorkflowRun = React.useCallback((id: string) => {
    setWorkflowRuns((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importWorkflowRuns = React.useCallback((items: WorkflowRun[]) => {
    setWorkflowRuns((prev) => mergeById(prev, items))
  }, [])

  const addYouTubePackage = React.useCallback((pkg: YouTubePackage) => {
    setYoutubePackages((prev) => [pkg, ...prev])
  }, [])

  const updateYouTubePackage = React.useCallback((pkg: YouTubePackage) => {
    setYoutubePackages((prev) => prev.map((x) => (x.id === pkg.id ? pkg : x)))
  }, [])

  const deleteYouTubePackage = React.useCallback((id: string) => {
    setYoutubePackages((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importYouTubePackages = React.useCallback((items: YouTubePackage[]) => {
    setYoutubePackages((prev) =>
      mergeById(
        prev,
        items.map((item) => normalizeYouTubePackage(item)),
      ),
    )
  }, [])

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
    addPrompt,
    updatePrompt,
    deletePrompt,
    importPrompts,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
    importWorkflows,
    getPrompt,
    addRun,
    updateRun,
    deleteRun,
    importRuns,
    addWorkflowRun,
    updateWorkflowRun,
    deleteWorkflowRun,
    importWorkflowRuns,
    addYouTubePackage,
    updateYouTubePackage,
    deleteYouTubePackage,
    importYouTubePackages,
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
