"use client"

import * as React from "react"
import Link from "next/link"

import { SONG_CONCEPT_STATUSES } from "@/lib/artist-universe/types"
import { PUBLISHED_SONG_PLATFORMS } from "@/lib/artist-universe/published-songs"
import type { YouTubeVideoRecord } from "@/lib/types"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormTextarea, FORM_HINTS } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { FormGrid } from "@/components/module/form-layout"

export type SongConceptFormState = {
  title: string
  artistName: string
  status: string
  songTitle: string
  conceptSummary: string
  genre: string
  mood: string
  lyricalTheme: string
  storyRole: string
  hookIdea: string
  chorusIdea: string
  sunoPrompt: string
  lyricDraft: string
  visualConcept: string
  youtubeAngle: string
  productTieIn: string
  campaignId: string
  campaignName: string
  releasePlanId: string
  relatedLoreIds: string
  relatedAssetIds: string
  relatedPromptRunIds: string
  qualityReviewId: string
  tags: string
  notes: string
  publishedUrl: string
  publishedPlatform: string
  publishedDate: string
  releaseStatus: string
  performanceNotes: string
  futureMerchIdeas: string
  futureCampaignIdeas: string
  relatedYouTubeVideoId: string
}

function optionsWithCurrent(standard: readonly string[], current: string): string[] {
  const trimmed = current.trim()
  if (!trimmed) return [...standard]
  if (standard.some((option) => option.toLowerCase() === trimmed.toLowerCase())) {
    return [...standard]
  }
  return [...standard, trimmed]
}

const SELECT_NONE = "__none__"

function StatusSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const items = optionsWithCurrent(SONG_CONCEPT_STATUSES, value)
  const display = value.trim() || "Select status"

  return (
    <FormField fieldKey="status" required>
      <Select value={value.trim() || "Idea"} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <span>{display}</span>
        </SelectTrigger>
        <SelectContent>
          {items.map((option) => {
            const isCustom = !SONG_CONCEPT_STATUSES.some((standard) => standard === option)
            return (
              <SelectItem key={option} value={option}>
                {option}
                {isCustom ? " (custom)" : ""}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>
    </FormField>
  )
}

export function SongConceptForm({
  values,
  onChange,
  mode,
  artistOptions = [],
  onArtistChange,
  onUseArtistContext,
  hasArtistContext = false,
  titleHelper,
  youtubeVideos = [],
  suggestedYouTubeVideo = null,
}: {
  values: SongConceptFormState
  onChange: (patch: Partial<SongConceptFormState>) => void
  mode: "create" | "edit"
  artistOptions?: string[]
  onArtistChange?: (artistName: string) => void
  onUseArtistContext?: () => void
  hasArtistContext?: boolean
  titleHelper?: string
  youtubeVideos?: YouTubeVideoRecord[]
  suggestedYouTubeVideo?: YouTubeVideoRecord | null
}) {
  const set =
    (key: keyof SongConceptFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [key]: e.target.value })
    }

  const artistInOptions = artistOptions.some(
    (name) => name.toLowerCase() === values.artistName.trim().toLowerCase(),
  )
  const showManualArtist = mode === "create" && (artistOptions.length === 0 || !artistInOptions)
  const artistSelected = values.artistName.trim().length > 0

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {artistSelected && mode === "create" ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Creating song concept for {values.artistName.trim()}</CardTitle>
            <CardDescription>Quick links to artist universe modules.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href={`/artist-bible?artist=${encodeURIComponent(values.artistName.trim())}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Open Artist Bible
            </Link>
            <Link
              href={`/lore?artist=${encodeURIComponent(values.artistName.trim())}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Open Lore Manager
            </Link>
            <Link
              href={`/visual-identity?artist=${encodeURIComponent(values.artistName.trim())}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Open Visual Identity
            </Link>
            <Link
              href={`/story-arcs?artist=${encodeURIComponent(values.artistName.trim())}`}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              Open Story Arcs
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Concept Basics</CardTitle>
          <CardDescription className="max-w-2xl text-pretty">
            {mode === "edit"
              ? "Update core identity and classification for this song concept."
              : artistSelected
                ? `New song concept for ${values.artistName.trim()}`
                : "Select an artist first, then fill in concept details."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormGrid>
            {mode === "create" && artistOptions.length > 0 ? (
              <div className="space-y-3 sm:col-span-2">
                <FormField fieldKey="artistName" required hint="Choose an artist from your Artist Bible records.">
                  <Select
                    value={artistInOptions ? values.artistName : undefined}
                    onValueChange={(name) => onArtistChange?.(name)}
                  >
                    <SelectTrigger className="w-full">
                      <span>{values.artistName.trim() || "Select artist"}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {artistOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                {showManualArtist ? (
                  <FormField fieldKey="artistName" hint="Or enter artist name manually if not in the list.">
                    <Input
                      value={values.artistName}
                      onChange={set("artistName")}
                      placeholder="Artist name"
                    />
                  </FormField>
                ) : null}
                {hasArtistContext && onUseArtistContext ? (
                  <Button type="button" size="sm" variant="secondary" onClick={onUseArtistContext}>
                    Fill empty fields from artist context
                  </Button>
                ) : null}
              </div>
            ) : (
              <FormField fieldKey="artistName" required>
                <Input value={values.artistName} onChange={set("artistName")} />
              </FormField>
            )}

            <FormField
              fieldKey="title"
              required
              hint={titleHelper ?? "Internal concept title — can differ from the final song title."}
            >
              <Input value={values.title} onChange={set("title")} />
            </FormField>

            <FormField fieldKey="songTitle" hint="Final or working song title if different from concept title.">
              <Input value={values.songTitle} onChange={set("songTitle")} />
            </FormField>

            <StatusSelect value={values.status} onChange={(status) => onChange({ status })} />

            <FormField fieldKey="genre">
              <Input value={values.genre} onChange={set("genre")} />
            </FormField>

            <FormField fieldKey="mood">
              <Input value={values.mood} onChange={set("mood")} />
            </FormField>

            <div className="sm:col-span-2">
              <FormField fieldKey="conceptSummary">
                <FormTextarea value={values.conceptSummary} onChange={set("conceptSummary")} rows={3} />
              </FormField>
            </div>

            <div className="sm:col-span-2">
              <FormField fieldKey="lyricalTheme">
                <FormTextarea value={values.lyricalTheme} onChange={set("lyricalTheme")} rows={2} />
              </FormField>
            </div>

            <div className="sm:col-span-2">
              <FormField fieldKey="storyRole">
                <FormTextarea value={values.storyRole} onChange={set("storyRole")} rows={2} />
              </FormField>
            </div>
          </FormGrid>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Writing & Prompting</CardTitle>
          <CardDescription>Hooks, chorus ideas, Suno prompts, and lyric drafts.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormGrid>
            <FormField fieldKey="hookIdea">
              <FormTextarea value={values.hookIdea} onChange={set("hookIdea")} rows={2} />
            </FormField>
            <FormField fieldKey="chorusIdea">
              <FormTextarea value={values.chorusIdea} onChange={set("chorusIdea")} rows={2} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField fieldKey="sunoPrompt">
                <FormTextarea value={values.sunoPrompt} onChange={set("sunoPrompt")} rows={3} />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField fieldKey="lyricDraft">
                <FormTextarea value={values.lyricDraft} onChange={set("lyricDraft")} rows={5} />
              </FormField>
            </div>
          </FormGrid>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Visual & Release</CardTitle>
          <CardDescription>Visual direction, YouTube angle, and product tie-ins.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormGrid>
            <div className="sm:col-span-2">
              <FormField fieldKey="visualConcept">
                <FormTextarea value={values.visualConcept} onChange={set("visualConcept")} rows={3} />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField fieldKey="youtubeAngle">
                <FormTextarea value={values.youtubeAngle} onChange={set("youtubeAngle")} rows={2} />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField fieldKey="productTieIn">
                <FormTextarea value={values.productTieIn} onChange={set("productTieIn")} rows={2} />
              </FormField>
            </div>
          </FormGrid>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Published / Release Archive</CardTitle>
          <CardDescription>
            Track already-published songs without requiring a campaign. Published = live somewhere
            (e.g. YouTube). Released = official release package completed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormGrid>
            <div className="sm:col-span-2">
              <FormField fieldKey="publishedUrl" hint="YouTube, Spotify, or other live URL.">
                <Input value={values.publishedUrl} onChange={set("publishedUrl")} placeholder="https://youtube.com/..." />
              </FormField>
            </div>
            <FormField fieldKey="publishedPlatform">
              <Select
                value={values.publishedPlatform.trim() || SELECT_NONE}
                onValueChange={(publishedPlatform) =>
                  onChange({ publishedPlatform: publishedPlatform === SELECT_NONE ? "" : publishedPlatform })
                }
              >
                <SelectTrigger className="w-full">
                  <span>{values.publishedPlatform.trim() || "Select platform"}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Select platform</SelectItem>
                  {PUBLISHED_SONG_PLATFORMS.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField fieldKey="publishedDate" hint="ISO date or free text (e.g. 2025-03-15).">
              <Input value={values.publishedDate} onChange={set("publishedDate")} />
            </FormField>
            <FormField fieldKey="releaseStatus" hint="Optional release package status (e.g. Released, Live).">
              <Input value={values.releaseStatus} onChange={set("releaseStatus")} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField fieldKey="performanceNotes">
                <FormTextarea value={values.performanceNotes} onChange={set("performanceNotes")} rows={3} />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField fieldKey="futureMerchIdeas">
                <FormTextarea value={values.futureMerchIdeas} onChange={set("futureMerchIdeas")} rows={2} />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField fieldKey="futureCampaignIdeas">
                <FormTextarea value={values.futureCampaignIdeas} onChange={set("futureCampaignIdeas")} rows={2} />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField fieldKey="relatedYouTubeVideoId" hint="Link a synced YouTube video record (optional).">
                <Select
                  value={values.relatedYouTubeVideoId.trim() || SELECT_NONE}
                  onValueChange={(relatedYouTubeVideoId) => {
                    if (relatedYouTubeVideoId === SELECT_NONE) {
                      onChange({ relatedYouTubeVideoId: "" })
                      return
                    }
                    const video = youtubeVideos.find((v) => v.id === relatedYouTubeVideoId)
                    onChange({
                      relatedYouTubeVideoId,
                      ...(video && !values.publishedUrl.trim()
                        ? { publishedUrl: video.videoUrl, publishedPlatform: "YouTube" }
                        : {}),
                    })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <span>
                      {values.relatedYouTubeVideoId
                        ? youtubeVideos.find((v) => v.id === values.relatedYouTubeVideoId)?.title ??
                          values.relatedYouTubeVideoId
                        : "Select YouTube video (optional)"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>No linked video</SelectItem>
                    {youtubeVideos.map((video) => (
                      <SelectItem key={video.id} value={video.id}>
                        {video.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            {suggestedYouTubeVideo && !values.relatedYouTubeVideoId ? (
              <div className="sm:col-span-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    onChange({
                      relatedYouTubeVideoId: suggestedYouTubeVideo.id,
                      publishedUrl: values.publishedUrl.trim() || suggestedYouTubeVideo.videoUrl,
                      publishedPlatform: values.publishedPlatform.trim() || "YouTube",
                    })
                  }
                >
                  Link suggested video: {suggestedYouTubeVideo.title}
                </Button>
              </div>
            ) : null}
          </FormGrid>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Links & References</CardTitle>
          <CardDescription>Campaigns, release plans, lore, assets, and quality reviews.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormGrid>
            <FormField fieldKey="campaignId">
              <Input value={values.campaignId} onChange={set("campaignId")} />
            </FormField>
            <FormField fieldKey="campaignName">
              <Input value={values.campaignName} onChange={set("campaignName")} />
            </FormField>
            <FormField fieldKey="releasePlanId">
              <Input value={values.releasePlanId} onChange={set("releasePlanId")} />
            </FormField>
            <FormField fieldKey="qualityReviewId">
              <Input value={values.qualityReviewId} onChange={set("qualityReviewId")} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField fieldKey="relatedLoreIds" hint={FORM_HINTS.arrayPerLine}>
                <FormTextarea value={values.relatedLoreIds} onChange={set("relatedLoreIds")} rows={2} />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField fieldKey="relatedAssetIds" hint={FORM_HINTS.arrayPerLine}>
                <FormTextarea value={values.relatedAssetIds} onChange={set("relatedAssetIds")} rows={2} />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField fieldKey="relatedPromptRunIds" hint={FORM_HINTS.arrayPerLine}>
                <FormTextarea value={values.relatedPromptRunIds} onChange={set("relatedPromptRunIds")} rows={2} />
              </FormField>
            </div>
          </FormGrid>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tags & Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <FormGrid>
            <div className="sm:col-span-2">
              <FormField fieldKey="tags" hint={FORM_HINTS.tags}>
                <FormTextarea value={values.tags} onChange={set("tags")} rows={2} />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField fieldKey="notes">
                <FormTextarea value={values.notes} onChange={set("notes")} rows={3} />
              </FormField>
            </div>
          </FormGrid>
        </CardContent>
      </Card>
    </div>
  )
}
