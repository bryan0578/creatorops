"use client"

import * as React from "react"

import { getCampaignContext } from "@/lib/actions/campaign-context"
import {
  resolveCampaignIdForContext,
  shouldShowCampaignContextButton,
} from "@/lib/data/campaign-context"
import {
  buildModulePromptContext,
  mergePromptWithCampaignContext,
  promptContainsCampaignContext,
  type ModulePromptContextType,
} from "@/lib/prompt-context-builder"
import type { CampaignRecord } from "@/lib/types"

export function useCampaignContextPrompt(input: {
  moduleType: ModulePromptContextType
  basePrompt: string
  campaigns: CampaignRecord[]
  urlCampaignId?: string | null
  urlCampaignName?: string | null
  formCampaignName?: string | null
  relatedCampaignName?: string | null
  artistName?: string | null
  songTitle?: string | null
  productName?: string | null
  niche?: string | null
}) {
  const [contextPrefix, setContextPrefix] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [pendingReplace, setPendingReplace] = React.useState(false)

  const resolvedCampaignId = React.useMemo(
    () =>
      resolveCampaignIdForContext({
        urlCampaignId: input.urlCampaignId,
        urlCampaignName: input.urlCampaignName,
        formCampaignName: input.formCampaignName,
        relatedCampaignName: input.relatedCampaignName,
        artistName: input.artistName,
        songTitle: input.songTitle,
        productName: input.productName,
        niche: input.niche,
        campaigns: input.campaigns,
      }),
    [
      input.urlCampaignId,
      input.urlCampaignName,
      input.formCampaignName,
      input.relatedCampaignName,
      input.artistName,
      input.songTitle,
      input.productName,
      input.niche,
      input.campaigns,
    ],
  )

  const showButton = React.useMemo(
    () =>
      shouldShowCampaignContextButton({
        urlCampaignId: input.urlCampaignId,
        formCampaignName: input.formCampaignName,
        relatedCampaignName: input.relatedCampaignName,
        artistName: input.artistName,
        songTitle: input.songTitle,
        productName: input.productName,
        niche: input.niche,
        campaigns: input.campaigns,
      }),
    [
      input.urlCampaignId,
      input.formCampaignName,
      input.relatedCampaignName,
      input.artistName,
      input.songTitle,
      input.productName,
      input.niche,
      input.campaigns,
    ],
  )

  const displayPrompt = React.useMemo(
    () => mergePromptWithCampaignContext(contextPrefix, input.basePrompt),
    [contextPrefix, input.basePrompt],
  )

  const hasContext = contextPrefix.trim().length > 0

  const applyContext = React.useCallback(
    async (replaceExisting = false) => {
      const campaignId = resolvedCampaignId
      if (!campaignId) {
        throw new Error("No campaign context found. Link this record to a campaign first.")
      }

      if (hasContext && !replaceExisting) {
        setPendingReplace(true)
        return { status: "confirm-replace" as const }
      }

      setLoading(true)
      try {
        const context = await getCampaignContext(campaignId)
        const block = buildModulePromptContext(context, input.moduleType)
        setContextPrefix(block)
        setPendingReplace(false)
        return { status: "success" as const, block }
      } finally {
        setLoading(false)
      }
    },
    [resolvedCampaignId, hasContext, input.moduleType],
  )

  const clearContext = React.useCallback(() => {
    setContextPrefix("")
    setPendingReplace(false)
  }, [])

  return {
    displayPrompt,
    contextPrefix,
    hasContext,
    showButton,
    resolvedCampaignId,
    loading,
    pendingReplace,
    setPendingReplace,
    applyContext,
    clearContext,
    containsContextMarker: promptContainsCampaignContext(contextPrefix),
  }
}
