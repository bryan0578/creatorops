"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

import {
  getCampaignDefaultTab,
  getDefaultTab,
  getPlaybookDefaultTab,
  getPresetDefaultTab,
  hasUrlCreateContext,
  resolveExplicitTab,
} from "@/lib/default-tabs"

export type SmartDefaultTabMode = "record" | "campaign" | "playbook" | "preset"

export type UseSmartDefaultTabOptions = {
  validTabs: readonly string[]
  detailsTab: string
  savedTab: string
  recordsLoaded: boolean
  hasRecords: boolean
  mode?: SmartDefaultTabMode
  launchTab?: string
  overviewTab?: string
  startersTab?: string
  hasStarters?: boolean
  /** Open details when extra prefill query params are present (module-specific). */
  forceDetails?: boolean
  /** When true, campaignId opens the saved/list tab instead of details (runners). */
  campaignOpensSaved?: boolean
}

export function useSmartDefaultTab(options: UseSmartDefaultTabOptions) {
  const searchParams = useSearchParams()

  const explicitTab = searchParams.get("tab")
  const recordId =
    searchParams.get("recordId") ??
    searchParams.get("presetId") ??
    searchParams.get("promptId")
  const campaignId = searchParams.get("campaignId")
  const sourceRecordType = searchParams.get("sourceRecordType")
  const sourceRecordId = searchParams.get("sourceRecordId")

  const hasRecordContext = Boolean(recordId?.trim())
  const hasCampaignContext = Boolean(campaignId?.trim())
  const hasSourceContext = Boolean(
    sourceRecordType?.trim() && sourceRecordId?.trim(),
  )

  const urlOpensDetails =
    hasRecordContext ||
    hasSourceContext ||
    Boolean(options.forceDetails) ||
    (hasCampaignContext && !options.campaignOpensSaved)

  const urlOpensSaved = Boolean(
    options.campaignOpensSaved && hasCampaignContext && !hasRecordContext,
  )

  const computeTab = React.useCallback(
    (hasRecords: boolean) => {
      const mode = options.mode ?? "record"
      if (mode === "campaign") {
        return getCampaignDefaultTab({
          explicitTab,
          recordId,
          campaignId,
          hasRecords,
          validTabs: options.validTabs,
          launchTab: options.launchTab,
          savedTab: options.savedTab,
          overviewTab: options.overviewTab,
        })
      }
      if (mode === "playbook") {
        return getPlaybookDefaultTab({
          explicitTab,
          recordId,
          hasRecords,
          hasStarters: options.hasStarters ?? false,
          validTabs: options.validTabs,
          detailsTab: options.detailsTab,
          savedTab: options.savedTab,
          startersTab: options.startersTab,
        })
      }
      if (mode === "preset") {
        return getPresetDefaultTab({
          explicitTab,
          presetId: recordId,
          hasRecords,
          hasStarters: options.hasStarters,
        })
      }
      return getDefaultTab({
        explicitTab,
        recordId,
        campaignId,
        sourceRecordType,
        sourceRecordId,
        hasRecords,
        detailsTab: options.detailsTab,
        savedTab: options.savedTab,
        validTabs: options.validTabs,
      })
    },
    [
      explicitTab,
      recordId,
      campaignId,
      sourceRecordType,
      sourceRecordId,
      options.mode,
      options.validTabs,
      options.detailsTab,
      options.savedTab,
      options.launchTab,
      options.overviewTab,
      options.startersTab,
      options.hasStarters,
    ],
  )

  const [activeTab, setActiveTabState] = React.useState(() => {
    const explicit = resolveExplicitTab(explicitTab, options.validTabs)
    if (explicit) return explicit
    if (urlOpensDetails) return options.detailsTab
    if (urlOpensSaved) return options.savedTab
    if (options.mode === "campaign") return options.overviewTab ?? "overview"
    return options.detailsTab
  })

  const userChangedTab = React.useRef(false)
  const autoApplied = React.useRef(false)

  const setActiveTab = React.useCallback((value: string) => {
    userChangedTab.current = true
    setActiveTabState(value)
  }, [])

  const setActiveTabSilent = React.useCallback((value: string) => {
    setActiveTabState(value)
  }, [])

  React.useEffect(() => {
    if (!options.recordsLoaded) return
    if (userChangedTab.current || autoApplied.current) return

    if (resolveExplicitTab(explicitTab, options.validTabs)) {
      autoApplied.current = true
      return
    }
    if (urlOpensDetails || urlOpensSaved) {
      autoApplied.current = true
      return
    }

    setActiveTabState(computeTab(options.hasRecords))
    autoApplied.current = true
  }, [
    options.recordsLoaded,
    options.hasRecords,
    explicitTab,
    urlOpensDetails,
    urlOpensSaved,
    computeTab,
    options.validTabs,
  ])

  React.useEffect(() => {
    if (!options.recordsLoaded) return
    if (userChangedTab.current) return
    const rec = searchParams.get("recordId")?.trim()
    if (rec) {
      setActiveTabState(options.detailsTab)
    }
  }, [searchParams, options.recordsLoaded, options.detailsTab])

  return {
    activeTab,
    setActiveTab,
    setActiveTabSilent,
  }
}

/** Generator modules with standard Details + Saved Records tabs. */
export function useGeneratorDefaultTab(
  recordCount: number,
  recordsLoaded: boolean,
  forceDetails = false,
) {
  return useSmartDefaultTab({
    validTabs: ["details", "prompt", "ai-response", "final", "related", "saved"],
    detailsTab: "details",
    savedTab: "saved",
    recordsLoaded,
    hasRecords: recordCount > 0,
    forceDetails,
  })
}
