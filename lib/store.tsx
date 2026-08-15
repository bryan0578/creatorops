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
  createPersistedListStore,
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
import { SEED_PROMPTS, SEED_WORKFLOWS } from "@/lib/seed-data"
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

// One persisted store per data slice. Each is a module-level singleton (the
// app only ever mounts a single StoreProvider) backed by localStorage and
// read through React's useSyncExternalStore, which is the supported way to
// read a client-only, mutable data source without causing SSR hydration
// mismatches or the cascading re-renders of a useEffect + setState hydration
// pattern.
const promptsStore = createPersistedListStore(SEED_PROMPTS, loadPrompts, savePrompts)
const workflowsStore = createPersistedListStore(SEED_WORKFLOWS, loadWorkflows, saveWorkflows)
const runsStore = createPersistedListStore<PromptRun>([], loadRuns, saveRuns)
const workflowRunsStore = createPersistedListStore<WorkflowRun>(
  [],
  loadWorkflowRuns,
  saveWorkflowRuns,
)
const youtubePackagesStore = createPersistedListStore<YouTubePackage>(
  [],
  loadYouTubePackages,
  saveYouTubePackages,
)
const merchIdeasStore = createPersistedListStore<MerchIdea>(
  [],
  loadMerchIdeas,
  saveMerchIdeas,
)
const productListingsStore = createPersistedListStore<ProductListing>(
  [],
  loadProductListings,
  saveProductListings,
)
const socialRepurposingStore = createPersistedListStore<SocialRepurposingRecord>(
  [],
  loadSocialRepurposingRecords,
  saveSocialRepurposingRecords,
)
const releasePlansStore = createPersistedListStore<ReleasePlan>(
  [],
  loadReleasePlans,
  saveReleasePlans,
)
const analyticsStore = createPersistedListStore<AnalyticsRecord>(
  [],
  loadAnalyticsRecords,
  saveAnalyticsRecords,
)
const mockupPromptsStore = createPersistedListStore<MockupPromptRecord>(
  [],
  loadMockupPromptRecords,
  saveMockupPromptRecords,
)
const emailCampaignsStore = createPersistedListStore<EmailCampaignRecord>(
  [],
  loadEmailCampaignRecords,
  saveEmailCampaignRecords,
)
const artistRecordsStore = createPersistedListStore<ArtistRecord>(
  [],
  loadArtistRecords,
  saveArtistRecords,
)
const youtubeThumbnailsStore = createPersistedListStore<YouTubeThumbnailRecord>(
  [],
  loadYouTubeThumbnailRecords,
  saveYouTubeThumbnailRecords,
)

// Standard useSyncExternalStore trick for "has the client taken over from
// the server-rendered markup yet" — false on the server and on the first
// client render (so they match), true from the next render onward.
function subscribeHydrated() {
  return () => {}
}
function getHydratedSnapshot() {
  return true
}
function getHydratedServerSnapshot() {
  return false
}

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
  const prompts = React.useSyncExternalStore(
    promptsStore.subscribe,
    promptsStore.getSnapshot,
    promptsStore.getServerSnapshot,
  )
  const workflows = React.useSyncExternalStore(
    workflowsStore.subscribe,
    workflowsStore.getSnapshot,
    workflowsStore.getServerSnapshot,
  )
  const runs = React.useSyncExternalStore(
    runsStore.subscribe,
    runsStore.getSnapshot,
    runsStore.getServerSnapshot,
  )
  const workflowRuns = React.useSyncExternalStore(
    workflowRunsStore.subscribe,
    workflowRunsStore.getSnapshot,
    workflowRunsStore.getServerSnapshot,
  )
  const youtubePackages = React.useSyncExternalStore(
    youtubePackagesStore.subscribe,
    youtubePackagesStore.getSnapshot,
    youtubePackagesStore.getServerSnapshot,
  )
  const merchIdeas = React.useSyncExternalStore(
    merchIdeasStore.subscribe,
    merchIdeasStore.getSnapshot,
    merchIdeasStore.getServerSnapshot,
  )
  const productListings = React.useSyncExternalStore(
    productListingsStore.subscribe,
    productListingsStore.getSnapshot,
    productListingsStore.getServerSnapshot,
  )
  const socialRepurposingRecords = React.useSyncExternalStore(
    socialRepurposingStore.subscribe,
    socialRepurposingStore.getSnapshot,
    socialRepurposingStore.getServerSnapshot,
  )
  const releasePlans = React.useSyncExternalStore(
    releasePlansStore.subscribe,
    releasePlansStore.getSnapshot,
    releasePlansStore.getServerSnapshot,
  )
  const analyticsRecords = React.useSyncExternalStore(
    analyticsStore.subscribe,
    analyticsStore.getSnapshot,
    analyticsStore.getServerSnapshot,
  )
  const mockupPromptRecords = React.useSyncExternalStore(
    mockupPromptsStore.subscribe,
    mockupPromptsStore.getSnapshot,
    mockupPromptsStore.getServerSnapshot,
  )
  const emailCampaignRecords = React.useSyncExternalStore(
    emailCampaignsStore.subscribe,
    emailCampaignsStore.getSnapshot,
    emailCampaignsStore.getServerSnapshot,
  )
  const artistRecords = React.useSyncExternalStore(
    artistRecordsStore.subscribe,
    artistRecordsStore.getSnapshot,
    artistRecordsStore.getServerSnapshot,
  )
  const youtubeThumbnailRecords = React.useSyncExternalStore(
    youtubeThumbnailsStore.subscribe,
    youtubeThumbnailsStore.getSnapshot,
    youtubeThumbnailsStore.getServerSnapshot,
  )
  const hydrated = React.useSyncExternalStore(
    subscribeHydrated,
    getHydratedSnapshot,
    getHydratedServerSnapshot,
  )

  const addPrompt = React.useCallback((p: Prompt) => {
    promptsStore.set((prev) => [p, ...prev])
  }, [])

  const updatePrompt = React.useCallback((p: Prompt) => {
    promptsStore.set((prev) => prev.map((x) => (x.id === p.id ? p : x)))
  }, [])

  const deletePrompt = React.useCallback((id: string) => {
    promptsStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importPrompts = React.useCallback((items: Prompt[]) => {
    promptsStore.set((prev) => mergeById(prev, items))
  }, [])

  const importWorkflows = React.useCallback((items: Workflow[]) => {
    workflowsStore.set((prev) => mergeById(prev, items))
  }, [])

  const addWorkflow = React.useCallback((w: Workflow) => {
    workflowsStore.set((prev) => [w, ...prev])
  }, [])

  const updateWorkflow = React.useCallback((w: Workflow) => {
    workflowsStore.set((prev) => prev.map((x) => (x.id === w.id ? w : x)))
  }, [])

  const deleteWorkflow = React.useCallback((id: string) => {
    workflowsStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const getPrompt = React.useCallback(
    (id: string | null) => (id ? prompts.find((p) => p.id === id) : undefined),
    [prompts],
  )

  const addRun = React.useCallback((run: PromptRun) => {
    runsStore.set((prev) => [run, ...prev])
  }, [])

  const updateRun = React.useCallback((run: PromptRun) => {
    runsStore.set((prev) => prev.map((x) => (x.id === run.id ? run : x)))
  }, [])

  const deleteRun = React.useCallback((id: string) => {
    runsStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importRuns = React.useCallback((items: PromptRun[]) => {
    runsStore.set((prev) => mergeById(prev, items))
  }, [])

  const addWorkflowRun = React.useCallback((run: WorkflowRun) => {
    workflowRunsStore.set((prev) => [run, ...prev])
  }, [])

  const updateWorkflowRun = React.useCallback((run: WorkflowRun) => {
    workflowRunsStore.set((prev) => prev.map((x) => (x.id === run.id ? run : x)))
  }, [])

  const deleteWorkflowRun = React.useCallback((id: string) => {
    workflowRunsStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importWorkflowRuns = React.useCallback((items: WorkflowRun[]) => {
    workflowRunsStore.set((prev) => mergeById(prev, items))
  }, [])

  const addYouTubePackage = React.useCallback((pkg: YouTubePackage) => {
    youtubePackagesStore.set((prev) => [pkg, ...prev])
  }, [])

  const updateYouTubePackage = React.useCallback((pkg: YouTubePackage) => {
    youtubePackagesStore.set((prev) => prev.map((x) => (x.id === pkg.id ? pkg : x)))
  }, [])

  const deleteYouTubePackage = React.useCallback((id: string) => {
    youtubePackagesStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importYouTubePackages = React.useCallback((items: YouTubePackage[]) => {
    youtubePackagesStore.set((prev) =>
      mergeById(
        prev,
        items.map((item) => normalizeYouTubePackage(item)),
      ),
    )
  }, [])

  const addMerchIdea = React.useCallback((idea: MerchIdea) => {
    merchIdeasStore.set((prev) => [idea, ...prev])
  }, [])

  const updateMerchIdea = React.useCallback((idea: MerchIdea) => {
    merchIdeasStore.set((prev) => prev.map((x) => (x.id === idea.id ? idea : x)))
  }, [])

  const deleteMerchIdea = React.useCallback((id: string) => {
    merchIdeasStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importMerchIdeas = React.useCallback((items: MerchIdea[]) => {
    merchIdeasStore.set((prev) =>
      mergeById(
        prev,
        items.map((item) => normalizeMerchIdea(item)),
      ),
    )
  }, [])

  const addProductListing = React.useCallback((listing: ProductListing) => {
    productListingsStore.set((prev) => [listing, ...prev])
  }, [])

  const updateProductListing = React.useCallback((listing: ProductListing) => {
    productListingsStore.set((prev) =>
      prev.map((x) => (x.id === listing.id ? listing : x)),
    )
  }, [])

  const deleteProductListing = React.useCallback((id: string) => {
    productListingsStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importProductListings = React.useCallback((items: ProductListing[]) => {
    productListingsStore.set((prev) =>
      mergeById(
        prev,
        items.map((item) => normalizeProductListing(item)),
      ),
    )
  }, [])

  const addSocialRepurposingRecord = React.useCallback(
    (record: SocialRepurposingRecord) => {
      socialRepurposingStore.set((prev) => [record, ...prev])
    },
    [],
  )

  const updateSocialRepurposingRecord = React.useCallback(
    (record: SocialRepurposingRecord) => {
      socialRepurposingStore.set((prev) =>
        prev.map((x) => (x.id === record.id ? record : x)),
      )
    },
    [],
  )

  const deleteSocialRepurposingRecord = React.useCallback((id: string) => {
    socialRepurposingStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importSocialRepurposingRecords = React.useCallback(
    (items: SocialRepurposingRecord[]) => {
      socialRepurposingStore.set((prev) =>
        mergeById(
          prev,
          items.map((item) => normalizeSocialRepurposingRecord(item)),
        ),
      )
    },
    [],
  )

  const addReleasePlan = React.useCallback((plan: ReleasePlan) => {
    releasePlansStore.set((prev) => [plan, ...prev])
  }, [])

  const updateReleasePlan = React.useCallback((plan: ReleasePlan) => {
    releasePlansStore.set((prev) => prev.map((x) => (x.id === plan.id ? plan : x)))
  }, [])

  const deleteReleasePlan = React.useCallback((id: string) => {
    releasePlansStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importReleasePlans = React.useCallback((items: ReleasePlan[]) => {
    releasePlansStore.set((prev) =>
      mergeById(
        prev,
        items.map((item) => normalizeReleasePlan(item)),
      ),
    )
  }, [])

  const addAnalyticsRecord = React.useCallback((record: AnalyticsRecord) => {
    analyticsStore.set((prev) => [record, ...prev])
  }, [])

  const updateAnalyticsRecord = React.useCallback((record: AnalyticsRecord) => {
    analyticsStore.set((prev) =>
      prev.map((x) => (x.id === record.id ? record : x)),
    )
  }, [])

  const deleteAnalyticsRecord = React.useCallback((id: string) => {
    analyticsStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importAnalyticsRecords = React.useCallback(
    (items: AnalyticsRecord[]) => {
      analyticsStore.set((prev) =>
        mergeById(
          prev,
          items.map((item) => normalizeAnalyticsRecord(item)),
        ),
      )
    },
    [],
  )

  const addMockupPromptRecord = React.useCallback((record: MockupPromptRecord) => {
    mockupPromptsStore.set((prev) => [record, ...prev])
  }, [])

  const updateMockupPromptRecord = React.useCallback(
    (record: MockupPromptRecord) => {
      mockupPromptsStore.set((prev) =>
        prev.map((x) => (x.id === record.id ? record : x)),
      )
    },
    [],
  )

  const deleteMockupPromptRecord = React.useCallback((id: string) => {
    mockupPromptsStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importMockupPromptRecords = React.useCallback(
    (items: MockupPromptRecord[]) => {
      mockupPromptsStore.set((prev) =>
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
      emailCampaignsStore.set((prev) => [record, ...prev])
    },
    [],
  )

  const updateEmailCampaignRecord = React.useCallback(
    (record: EmailCampaignRecord) => {
      emailCampaignsStore.set((prev) =>
        prev.map((x) => (x.id === record.id ? record : x)),
      )
    },
    [],
  )

  const deleteEmailCampaignRecord = React.useCallback((id: string) => {
    emailCampaignsStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importEmailCampaignRecords = React.useCallback(
    (items: EmailCampaignRecord[]) => {
      emailCampaignsStore.set((prev) =>
        mergeById(
          prev,
          items.map((item) => normalizeEmailCampaignRecord(item)),
        ),
      )
    },
    [],
  )

  const addArtistRecord = React.useCallback((record: ArtistRecord) => {
    artistRecordsStore.set((prev) => [record, ...prev])
  }, [])

  const updateArtistRecord = React.useCallback((record: ArtistRecord) => {
    artistRecordsStore.set((prev) =>
      prev.map((x) => (x.id === record.id ? record : x)),
    )
  }, [])

  const deleteArtistRecord = React.useCallback((id: string) => {
    artistRecordsStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importArtistRecords = React.useCallback((items: ArtistRecord[]) => {
    artistRecordsStore.set((prev) =>
      mergeById(prev, items.map((item) => normalizeArtistRecord(item))),
    )
  }, [])

  const addYouTubeThumbnailRecord = React.useCallback(
    (record: YouTubeThumbnailRecord) => {
      youtubeThumbnailsStore.set((prev) => [record, ...prev])
    },
    [],
  )

  const updateYouTubeThumbnailRecord = React.useCallback(
    (record: YouTubeThumbnailRecord) => {
      youtubeThumbnailsStore.set((prev) =>
        prev.map((x) => (x.id === record.id ? record : x)),
      )
    },
    [],
  )

  const deleteYouTubeThumbnailRecord = React.useCallback((id: string) => {
    youtubeThumbnailsStore.set((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const importYouTubeThumbnailRecords = React.useCallback(
    (items: YouTubeThumbnailRecord[]) => {
      youtubeThumbnailsStore.set((prev) =>
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
