"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Copy,
  Download,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"

import {
  createQualityReview,
  deleteQualityReview,
  duplicateQualityReview,
  generateQualityReviewDraft,
  getQualityReviews,
  importQualityReviews,
  updateQualityReview,
} from "@/lib/actions/quality-reviews"
import {
  campaignPrefillToastMessage,
  parseCampaignPrefillContext,
  shouldSkipCampaignUrlPrefill,
} from "@/lib/campaign-prefill"
import {
  buildRecordHref,
  RELATED_TYPE_LABELS,
  type RelatedRecordType,
} from "@/lib/data/related-records"
import {
  applyCampaignPrefillToQualityForm,
  newQualityReviewFormFromParams,
} from "@/lib/quality-prefill"
import {
  calculateOverallScore,
  emptyQualityReviewForm,
  filterQualityReviewsForCampaign,
  filterQualityReviewsForSource,
  formatQualityReviewTags,
  QUALITY_READINESS_LABELS,
  QUALITY_REVIEW_STATUSES,
  QUALITY_REVIEW_TYPES,
  qualityReviewFormFromRecord,
  readinessLabelFromScore,
  recordFromQualityReviewForm,
  scoreColorClass,
} from "@/lib/quality-reviews"
import { parseImportJsonText } from "@/lib/safe-json"
import { downloadJson } from "@/lib/storage"
import { createId, useStore } from "@/lib/store"
import type { QualityCriterionScore, QualityReviewFormValues, QualityReviewRecord } from "@/lib/types"
import { ModulePageHeader } from "@/components/app-shell"
import { CreateLearningButton } from "@/components/learnings/learning-action-link"
import { CampaignPrefillBanner } from "@/components/campaigns/campaign-prefill-banner"
import { EmptyState } from "@/components/empty-state"
import {
  FormGrid,
  FormSection,
  ModuleShell,
  ModuleTabPanel,
  ModuleWorkflowTabs,
  RECENT_RECORDS_CARD_CLASS,
} from "@/components/module/form-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSmartDefaultTab } from "@/hooks/use-smart-default-tab"

const QUALITY_TABS = [
  { value: "setup", label: "Review Setup" },
  { value: "scorecard", label: "Scorecard" },
  { value: "recommendations", label: "Recommendations" },
  { value: "related", label: "Related" },
  { value: "saved", label: "Saved Reviews" },
] as const

const SETUP_FIELDS: (keyof QualityReviewFormValues)[] = [
  "reviewName",
  "reviewType",
  "status",
  "campaignName",
  "artistName",
  "songTitle",
  "productName",
  "platform",
  "sourceRecordType",
  "sourceRecordId",
  "sourcePromptRunId",
  "sourceExperimentId",
  "tags",
  "reviewerNotes",
]

const RECOMMENDATION_FIELDS: (keyof QualityReviewFormValues)[] = [
  "strengths",
  "weaknesses",
  "improvementIdeas",
  "recommendedActions",
]

const FIELD_LABELS: Record<keyof QualityReviewFormValues, string> = {
  reviewName: "Review name",
  reviewType: "Review type",
  status: "Status",
  campaignId: "Campaign ID",
  campaignName: "Campaign name",
  artistName: "Artist name",
  songTitle: "Song title",
  productName: "Product name",
  platform: "Platform",
  sourceRecordType: "Source record type",
  sourceRecordId: "Source record ID",
  sourcePromptRunId: "Source prompt run",
  sourceExperimentId: "Source experiment",
  rubricVersion: "Rubric version",
  overallScore: "Overall score",
  scoreBreakdown: "Score breakdown",
  strengths: "Strengths",
  weaknesses: "Weaknesses",
  improvementIdeas: "Improvement ideas",
  recommendedActions: "Recommended actions",
  readinessLabel: "Readiness label",
  reviewerNotes: "Reviewer notes",
  tags: "Tags",
}

function formatUpdatedAt(ts: number) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function OverallScoreDisplay({ score, readinessLabel }: { score: number; readinessLabel: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border/80 bg-muted/20 px-6 py-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Overall score</p>
      <p className={`text-5xl font-semibold tabular-nums ${scoreColorClass(score)}`}>{score}</p>
      {readinessLabel ? (
        <Badge variant="outline" className="mt-1">
          {readinessLabel}
        </Badge>
      ) : null}
    </div>
  )
}

function CriterionRow({
  criterion,
  onScoreChange,
  onNotesChange,
}: {
  criterion: QualityCriterionScore
  onScoreChange: (key: string, score: number) => void
  onNotesChange: (key: string, notes: string) => void
}) {
  return (
    <div className="rounded-md border border-border/80 p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{criterion.label}</p>
          {criterion.description ? (
            <p className="text-xs text-muted-foreground">{criterion.description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={criterion.maxScore}
            value={criterion.score}
            onChange={(event) =>
              onScoreChange(criterion.key, Number(event.target.value) || 0)
            }
            className="h-8 w-16 tabular-nums"
          />
          <span className="text-xs text-muted-foreground">/ {criterion.maxScore}</span>
        </div>
      </div>
      {criterion.guidance ? (
        <p className="text-xs text-muted-foreground">{criterion.guidance}</p>
      ) : null}
      {criterion.whyNotes ? (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Why this score? {criterion.whyNotes}
        </p>
      ) : null}
      <Textarea
        value={criterion.notes ?? ""}
        onChange={(event) => onNotesChange(criterion.key, event.target.value)}
        placeholder="Criterion notes (optional)"
        rows={2}
        className="text-sm"
      />
    </div>
  )
}

export function QualityReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const store = useStore()

  const [reviews, setReviews] = React.useState<QualityReviewRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [generating, setGenerating] = React.useState(false)
  const [recordId, setRecordId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<QualityReviewFormValues>(() => emptyQualityReviewForm())

  const { activeTab, setActiveTab } = useSmartDefaultTab({
    validTabs: QUALITY_TABS.map((tab) => tab.value),
    detailsTab: "setup",
    savedTab: "saved",
    recordsLoaded: !loading,
    hasRecords: reviews.length > 0,
  })
  const [savedSearch, setSavedSearch] = React.useState("")
  const importRef = React.useRef<HTMLInputElement>(null)

  const campaignPrefill = React.useMemo(
    () => parseCampaignPrefillContext(searchParams, store.campaigns),
    [searchParams, store.campaigns],
  )

  const isEditingSaved = recordId ? reviews.some((item) => item.id === recordId) : false

  const loadReviews = React.useCallback(async () => {
    setLoading(true)
    try {
      const rows = await getQualityReviews()
      setReviews(rows)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load quality reviews.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadReviews()
  }, [loadReviews])

  React.useEffect(() => {
    const paramRecordId = searchParams.get("recordId")
    if (paramRecordId && reviews.length) {
      const record = reviews.find((item) => item.id === paramRecordId)
      if (record) {
        setRecordId(record.id)
        setForm(qualityReviewFormFromRecord(record))
      }
      return
    }

    if (paramRecordId) return

    const nextForm = newQualityReviewFormFromParams({
      reviewType: searchParams.get("reviewType"),
      campaignId: searchParams.get("campaignId"),
      campaignName: searchParams.get("campaignName"),
      contextTitle: searchParams.get("contextTitle"),
      sourceRecordType: searchParams.get("sourceRecordType"),
      sourceRecordId: searchParams.get("sourceRecordId"),
      sourcePromptRunId: searchParams.get("sourcePromptRunId"),
      sourceExperimentId: searchParams.get("sourceExperimentId"),
    })

    if (campaignPrefill.campaign && !shouldSkipCampaignUrlPrefill(searchParams)) {
      const prefilled = applyCampaignPrefillToQualityForm(nextForm, campaignPrefill.campaign)
      setForm(prefilled)
      setRecordId(null)
      toast.message(campaignPrefillToastMessage(campaignPrefill.campaign))
      return
    }

    setForm(nextForm)
    setRecordId(null)
  }, [searchParams, reviews, campaignPrefill.campaign])

  const relatedReviews = React.useMemo(() => {
    if (form.sourceRecordType && form.sourceRecordId) {
      return filterQualityReviewsForSource(reviews, form.sourceRecordType, form.sourceRecordId)
    }
    if (form.campaignId) {
      return filterQualityReviewsForCampaign(reviews, form.campaignId, form.campaignName)
    }
    return []
  }, [reviews, form])

  const filteredSaved = React.useMemo(() => {
    const q = savedSearch.trim().toLowerCase()
    return [...reviews]
      .filter((item) => {
        if (!q) return true
        return [
          item.reviewName,
          item.reviewType,
          item.campaignName,
          item.sourceRecordType,
          item.readinessLabel,
          item.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [reviews, savedSearch])

  function patchForm(patch: Partial<QualityReviewFormValues>) {
    setForm((prev) => {
      const next = { ...prev, ...patch }
      if (patch.reviewType && patch.reviewType !== prev.reviewType) {
        const empty = emptyQualityReviewForm(patch.reviewType)
        next.scoreBreakdown = empty.scoreBreakdown
        next.rubricVersion = empty.rubricVersion
      }
      if (patch.scoreBreakdown) {
        const overallScore = calculateOverallScore(next.scoreBreakdown)
        next.overallScore = overallScore
        next.readinessLabel = readinessLabelFromScore(overallScore, next.reviewType)
      }
      return next
    })
  }

  function handleCriterionScoreChange(key: string, score: number) {
    setForm((prev) => {
      const criteria = prev.scoreBreakdown.criteria.map((item) =>
        item.key === key ? { ...item, score } : item,
      )
      const scoreBreakdown = { ...prev.scoreBreakdown, criteria }
      const overallScore = calculateOverallScore(scoreBreakdown)
      return {
        ...prev,
        scoreBreakdown,
        overallScore,
        readinessLabel: readinessLabelFromScore(overallScore, prev.reviewType),
      }
    })
  }

  function handleCriterionNotesChange(key: string, notes: string) {
    setForm((prev) => ({
      ...prev,
      scoreBreakdown: {
        ...prev.scoreBreakdown,
        criteria: prev.scoreBreakdown.criteria.map((item) =>
          item.key === key ? { ...item, notes } : item,
        ),
      },
    }))
  }

  function handleNewReview() {
    setRecordId(null)
    setForm(emptyQualityReviewForm())
    setActiveTab("setup")
    router.replace("/quality")
  }

  function openReview(record: QualityReviewRecord) {
    setRecordId(record.id)
    setForm(qualityReviewFormFromRecord(record))
    setActiveTab("setup")
    router.replace(`/quality?recordId=${encodeURIComponent(record.id)}`)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const id = recordId ?? createId("quality")
      const existing = reviews.find((item) => item.id === id)
      const record = recordFromQualityReviewForm(form, id, {
        createdAt: existing?.createdAt,
      })
      const saved = existing
        ? await updateQualityReview(record)
        : await createQualityReview(record)
      setRecordId(saved.id)
      setForm(qualityReviewFormFromRecord(saved))
      await loadReviews()
      toast.success("Quality review saved.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save review.")
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateDraft() {
    setGenerating(true)
    try {
      const result = await generateQualityReviewDraft({
        reviewType: form.reviewType,
        reviewName: form.reviewName,
        campaignId: form.campaignId || campaignPrefill.campaign?.id,
        campaignName: form.campaignName || campaignPrefill.campaign?.campaignName,
        artistName: form.artistName || campaignPrefill.campaign?.artistName,
        songTitle: form.songTitle || campaignPrefill.campaign?.songTitle,
        productName: form.productName || campaignPrefill.campaign?.productName,
        sourceRecordType: form.sourceRecordType,
        sourceRecordId: form.sourceRecordId,
        sourcePromptRunId: form.sourcePromptRunId,
        sourceExperimentId: form.sourceExperimentId,
        platform: form.platform,
      })

      if (result.record) {
        patchForm({
          ...result.record,
          reviewName: result.record.reviewName ?? form.reviewName,
        })
        setActiveTab("scorecard")
      }

      if (result.warnings?.length) {
        result.warnings.forEach((warning) => toast.warning(warning))
      }

      toast.message(result.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate draft.")
    } finally {
      setGenerating(false)
    }
  }

  async function handleDuplicate() {
    if (!recordId) return
    try {
      const copy = await duplicateQualityReview(recordId)
      if (!copy) {
        toast.error("Review not found.")
        return
      }
      await loadReviews()
      openReview(copy)
      toast.success("Review duplicated.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not duplicate review.")
    }
  }

  async function handleDelete(id: string) {
    try {
      const result = await deleteQualityReview(id)
      if (!result.ok) {
        toast.error(result.message ?? "Could not delete review.")
        return
      }
      if (recordId === id) handleNewReview()
      await loadReviews()
      toast.success("Review deleted.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete review.")
    }
  }

  function handleExportJson() {
    const exportRows = recordId
      ? reviews.filter((item) => item.id === recordId)
      : reviews
    downloadJson("creatorops-quality-reviews.json", exportRows)
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text()
      const parsed = parseImportJsonText(text)
      if (!parsed.ok) {
        toast.error(parsed.message)
        return
      }
      const rows = Array.isArray(parsed.value) ? parsed.value : [parsed.value]
      const result = await importQualityReviews(rows as QualityReviewRecord[])
      await loadReviews()
      toast.success(
        `Imported ${result.imported} new, updated ${result.updated}, skipped ${result.skipped}.`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.")
    }
  }

  const relatedLinks = React.useMemo(() => {
    const links: { label: string; href: string }[] = []
    if (form.campaignId) {
      links.push({
        label: form.campaignName || "Campaign",
        href: `/campaigns?recordId=${encodeURIComponent(form.campaignId)}`,
      })
    }
    if (form.sourceRecordType && form.sourceRecordId) {
      const type = form.sourceRecordType as RelatedRecordType
      links.push({
        label: RELATED_TYPE_LABELS[type] ?? form.sourceRecordType,
        href: buildRecordHref(type, form.sourceRecordId, form.campaignId),
      })
    }
    if (form.sourcePromptRunId) {
      links.push({
        label: "Prompt run",
        href: `/prompt-runner?recordId=${encodeURIComponent(form.sourcePromptRunId)}`,
      })
    }
    if (form.sourceExperimentId) {
      links.push({
        label: "Experiment",
        href: `/experiments?recordId=${encodeURIComponent(form.sourceExperimentId)}`,
      })
    }
    return links
  }, [form])

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Quality Review"
        description="Score creative outputs, campaign readiness, prompts, and launch assets before publishing."
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={handleNewReview}>
              <Plus className="size-4" />
              New Review
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generating}
              onClick={() => void handleGenerateDraft()}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              Generate Review Draft
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleExportJson}>
              <Download className="size-4" />
              Export JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => importRef.current?.click()}
            >
              <Upload className="size-4" />
              Import JSON
            </Button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleImportFile(file)
                event.target.value = ""
              }}
            />
            {isEditingSaved ? (
              <>
                <CreateLearningButton
                  source="quality-review"
                  sourceId={recordId}
                  campaignId={form.campaignId}
                  campaignName={form.campaignName}
                  label="Create Learning from Quality Review"
                  requireSavedRecord={false}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => void handleDuplicate()}>
                  <Copy className="size-4" />
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleDelete(recordId!)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </>
            ) : null}
            <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Save
            </Button>
          </>
        }
      />

      {campaignPrefill.campaign ? (
        <CampaignPrefillBanner campaign={campaignPrefill.campaign} />
      ) : null}

      <ModuleWorkflowTabs tabs={QUALITY_TABS} value={activeTab} onValueChange={setActiveTab}>

      <ModuleTabPanel value="setup">
        <FormSection title="Review setup" description="Link a campaign or source record, then generate draft scores.">
          <FormGrid>
            {SETUP_FIELDS.map((fieldKey) => {
              if (fieldKey === "reviewType") {
                return (
                  <div key={fieldKey} className="space-y-2">
                    <Label htmlFor={fieldKey}>{FIELD_LABELS[fieldKey]}</Label>
                    <Select
                      value={form.reviewType}
                      onValueChange={(value) => patchForm({ reviewType: value })}
                    >
                      <SelectTrigger id={fieldKey}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALITY_REVIEW_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }
              if (fieldKey === "status") {
                return (
                  <div key={fieldKey} className="space-y-2">
                    <Label htmlFor={fieldKey}>{FIELD_LABELS[fieldKey]}</Label>
                    <Select value={form.status} onValueChange={(value) => patchForm({ status: value })}>
                      <SelectTrigger id={fieldKey}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUALITY_REVIEW_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }
              const isLong = fieldKey === "reviewerNotes"
              return (
                <div key={fieldKey} className={isLong ? "sm:col-span-2 space-y-2" : "space-y-2"}>
                  <Label htmlFor={fieldKey}>{FIELD_LABELS[fieldKey]}</Label>
                  {isLong ? (
                    <Textarea
                      id={fieldKey}
                      value={form[fieldKey] as string}
                      onChange={(event) => patchForm({ [fieldKey]: event.target.value })}
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={fieldKey}
                      value={form[fieldKey] as string}
                      onChange={(event) => patchForm({ [fieldKey]: event.target.value })}
                    />
                  )}
                </div>
              )
            })}
            {form.campaignId ? (
              <div className="sm:col-span-2">
                <Badge variant="secondary">
                  Linked to campaign: {form.campaignName || form.campaignId}
                </Badge>
              </div>
            ) : null}
          </FormGrid>
        </FormSection>
      </ModuleTabPanel>

      <ModuleTabPanel value="scorecard">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,220px)_1fr]">
          <OverallScoreDisplay score={form.overallScore} readinessLabel={form.readinessLabel} />
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Rubric scorecard</CardTitle>
              <CardDescription>
                Edit criterion scores manually. Overall score recalculates automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.scoreBreakdown.criteria.map((criterion) => (
                <CriterionRow
                  key={criterion.key}
                  criterion={criterion}
                  onScoreChange={handleCriterionScoreChange}
                  onNotesChange={handleCriterionNotesChange}
                />
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="readinessLabel">Readiness label</Label>
          <Select
            value={form.readinessLabel || QUALITY_READINESS_LABELS[0]}
            onValueChange={(value) => patchForm({ readinessLabel: value })}
          >
            <SelectTrigger id="readinessLabel" className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUALITY_READINESS_LABELS.map((label) => (
                <SelectItem key={label} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ModuleTabPanel>

      <ModuleTabPanel value="recommendations">
        <FormSection
          title="Recommendations"
          description="Auto-generated from heuristics — edit freely before saving."
        >
          <FormGrid>
            {RECOMMENDATION_FIELDS.map((fieldKey) => (
              <div key={fieldKey} className="sm:col-span-2 space-y-2">
                <Label htmlFor={fieldKey}>{FIELD_LABELS[fieldKey]}</Label>
                <Textarea
                  id={fieldKey}
                  value={form[fieldKey] as string}
                  onChange={(event) => patchForm({ [fieldKey]: event.target.value })}
                  rows={4}
                />
              </div>
            ))}
          </FormGrid>
        </FormSection>
      </ModuleTabPanel>

      <ModuleTabPanel value="related">
        <Card className={RECENT_RECORDS_CARD_CLASS}>
          <CardHeader>
            <CardTitle className="text-base">Related records</CardTitle>
            <CardDescription>Campaign, source record, prompt run, and experiment links</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {relatedLinks.length ? (
              <ul className="space-y-2">
                {relatedLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm font-medium text-primary hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No linked records in review setup.</p>
            )}
            <div>
              <p className="mb-2 text-sm font-medium">Related quality reviews</p>
              {relatedReviews.length ? (
                <ul className="space-y-2">
                  {relatedReviews.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="text-left text-sm hover:underline"
                        onClick={() => openReview(item)}
                      >
                        {item.reviewName || item.reviewType} — {item.overallScore}/100
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="No related quality reviews"
                  description="Create a review for this campaign, source record, prompt run, experiment, or asset."
                  action={
                    <Button type="button" size="sm" onClick={handleNewReview}>
                      New Review
                    </Button>
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>
      </ModuleTabPanel>

      <ModuleTabPanel value="saved">
        <Card className={RECENT_RECORDS_CARD_CLASS}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Saved reviews</CardTitle>
                <CardDescription>
                  {loading ? "Loading…" : `${reviews.length} saved review${reviews.length === 1 ? "" : "s"}`}
                </CardDescription>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={savedSearch}
                  onChange={(event) => setSavedSearch(event.target.value)}
                  placeholder="Search reviews…"
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading quality reviews…
              </div>
            ) : filteredSaved.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredSaved.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-border/80 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="text-left text-sm font-medium hover:underline"
                        onClick={() => openReview(item)}
                      >
                        {item.reviewName || "Untitled review"}
                      </button>
                      <span className={`text-sm font-semibold tabular-nums ${scoreColorClass(item.overallScore)}`}>
                        {item.overallScore}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">{item.reviewType}</Badge>
                      {item.readinessLabel ? <Badge variant="outline">{item.readinessLabel}</Badge> : null}
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                    {item.campaignName ? (
                      <p className="text-xs text-muted-foreground">{item.campaignName}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">{formatUpdatedAt(item.updatedAt)}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => openReview(item)}>
                        Open
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void duplicateQualityReview(item.id).then(() => loadReviews())}
                      >
                        Duplicate
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleDelete(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No quality reviews yet"
                description="Score titles, thumbnails, email copy, product listings, prompts, and campaign readiness before publishing."
                action={
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" onClick={handleNewReview}>
                      New Review
                    </Button>
                    <Link href="/campaigns" className="inline-flex">
                      <Button type="button" size="sm" variant="outline">
                        Open Campaigns
                      </Button>
                    </Link>
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>
      </ModuleTabPanel>
      </ModuleWorkflowTabs>
    </ModuleShell>
  )
}
