"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Copy,
  Download,
  Lightbulb,
  Loader2,
  Plus,
  ScanSearch,
  Scale,
  Repeat,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import { formatFieldLabel } from "@/lib/ui/labels"
import { formLabelClassName } from "@/components/ui/form-field"

import {
  createLearning,
  deleteLearning,
  duplicateLearning,
  getLearnings,
  importLearnings,
  updateLearning,
} from "@/lib/actions/learnings"
import {
  campaignPrefillToastMessage,
  parseCampaignPrefillContext,
  shouldSkipCampaignUrlPrefill,
} from "@/lib/campaign-prefill"
import { buildRecordHref } from "@/lib/data/related-records"
import {
  applyCampaignPrefillToLearningForm,
  newLearningFormFromParams,
} from "@/lib/learning-prefill"
import {
  emptyLearningForm,
  LEARNING_CATEGORIES,
  LEARNING_CONFIDENCE_LEVELS,
  LEARNING_IMPACT_LEVELS,
  LEARNING_PATTERN_GROUPS,
  LEARNING_STATUSES,
  LEARNING_TYPES,
  learningFormFromRecord,
  recordFromLearningForm,
} from "@/lib/learnings"
import { parseImportJsonText } from "@/lib/safe-json"
import { downloadJson } from "@/lib/storage"
import { createId, useStore } from "@/lib/store"
import type { LearningFormValues, LearningRecord } from "@/lib/types"
import { ModulePageHeader } from "@/components/app-shell"
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
import { Button, buttonVariants } from "@/components/ui/button"
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

const LEARNING_TABS = [
  { value: "details", label: "Learning Details" },
  { value: "evidence", label: "Evidence" },
  { value: "recommendations", label: "Recommendations" },
  { value: "related", label: "Related" },
  { value: "saved", label: "Saved Learnings" },
  { value: "patterns", label: "Patterns" },
] as const

const DETAIL_FIELDS: (keyof LearningFormValues)[] = [
  "title",
  "learningType",
  "category",
  "confidence",
  "impact",
  "status",
  "campaignName",
  "artistName",
  "songTitle",
  "productName",
  "platform",
  "tags",
  "notes",
]

const EVIDENCE_FIELDS: (keyof LearningFormValues)[] = [
  "insight",
  "evidence",
  "sourceType",
  "sourceId",
  "analyticsRecordId",
  "experimentId",
  "qualityReviewId",
  "assetId",
  "promptRunId",
  "playbookId",
]

const RECOMMENDATION_FIELDS: (keyof LearningFormValues)[] = [
  "recommendation",
  "repeatWhen",
  "avoidWhen",
]

const FIELD_LABELS: Record<keyof LearningFormValues, string> = {
  title: "Title",
  learningType: "Learning type",
  category: "Category",
  confidence: "Confidence",
  impact: "Impact",
  status: "Status",
  campaignId: "Campaign ID",
  campaignName: "Campaign name",
  artistName: "Artist name",
  songTitle: "Song title",
  productName: "Product name",
  platform: "Platform",
  sourceType: "Source type",
  sourceId: "Source ID",
  analyticsRecordId: "Analytics record",
  experimentId: "Experiment",
  qualityReviewId: "Quality review",
  assetId: "Asset",
  promptRunId: "Prompt run",
  playbookId: "Playbook",
  insight: "Insight",
  evidence: "Evidence",
  recommendation: "Recommendation",
  repeatWhen: "Repeat when",
  avoidWhen: "Avoid when",
  tags: "Tags",
  notes: "Notes",
}

function formatUpdatedAt(ts: number) {
  return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function previewText(value: string, max = 120) {
  const text = value.trim()
  if (!text) return "—"
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function LearningCard({
  learning,
  onOpen,
  onDuplicate,
  onDelete,
  onExport,
}: {
  learning: LearningRecord
  onOpen: () => void
  onDuplicate: () => void
  onDelete: () => void
  onExport: () => void
}) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base text-pretty">{learning.title || "Untitled learning"}</CardTitle>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">{learning.learningType}</Badge>
            {learning.category ? <Badge variant="outline">{learning.category}</Badge> : null}
          </div>
        </div>
        <CardDescription className="flex flex-wrap gap-2 text-xs">
          <span>{learning.confidence} confidence</span>
          <span>·</span>
          <span>{learning.impact} impact</span>
          {learning.campaignName ? (
            <>
              <span>·</span>
              <span>{learning.campaignName}</span>
            </>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="text-sm text-muted-foreground text-pretty">{previewText(learning.insight)}</p>
        <p className="text-sm text-pretty">{previewText(learning.recommendation)}</p>
        <p className="text-xs text-muted-foreground">Updated {formatUpdatedAt(learning.updatedAt)}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onOpen}>
            Open
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDuplicate}>
            <Copy className="size-4" />
            Duplicate
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onExport}>
            <Download className="size-4" />
            Export
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function LearningLibraryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const store = useStore()

  const [learnings, setLearnings] = React.useState<LearningRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [recordId, setRecordId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<LearningFormValues>(() => emptyLearningForm())

  const learningPrefillParams = React.useMemo(
    () =>
      Boolean(
        searchParams.get("analyticsRecordId") ||
          searchParams.get("experimentId") ||
          searchParams.get("qualityReviewId") ||
          searchParams.get("learningType") ||
          searchParams.get("title"),
      ),
    [searchParams],
  )

  const { activeTab, setActiveTab } = useSmartDefaultTab({
    validTabs: LEARNING_TABS.map((tab) => tab.value),
    detailsTab: "details",
    savedTab: "saved",
    recordsLoaded: !loading,
    hasRecords: learnings.length > 0,
    forceDetails: learningPrefillParams,
  })
  const [savedSearch, setSavedSearch] = React.useState("")
  const [filterType, setFilterType] = React.useState("all")
  const [filterCategory, setFilterCategory] = React.useState("all")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const importRef = React.useRef<HTMLInputElement>(null)

  const campaignPrefill = React.useMemo(
    () => parseCampaignPrefillContext(searchParams, store.campaigns),
    [searchParams, store.campaigns],
  )

  const isEditingSaved = recordId ? learnings.some((item) => item.id === recordId) : false

  const loadLearnings = React.useCallback(async () => {
    setLoading(true)
    try {
      setLearnings(await getLearnings())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load learnings.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadLearnings()
  }, [loadLearnings])

  React.useEffect(() => {
    const paramRecordId = searchParams.get("recordId")?.trim()
    if (paramRecordId && learnings.length > 0) {
      const match = learnings.find((item) => item.id === paramRecordId)
      if (match) {
        setRecordId(match.id)
        setForm(learningFormFromRecord(match))
        return
      }
    }

    if (paramRecordId) return

    const nextForm = newLearningFormFromParams({
      title: searchParams.get("title"),
      learningType: searchParams.get("learningType"),
      category: searchParams.get("category"),
      campaignId: searchParams.get("campaignId"),
      campaignName: searchParams.get("campaignName"),
      analyticsRecordId: searchParams.get("analyticsRecordId"),
      experimentId: searchParams.get("experimentId"),
      qualityReviewId: searchParams.get("qualityReviewId"),
      assetId: searchParams.get("assetId"),
      promptRunId: searchParams.get("promptRunId"),
      playbookId: searchParams.get("playbookId"),
      sourceType: searchParams.get("sourceType"),
      sourceId: searchParams.get("sourceId"),
      insight: searchParams.get("insight"),
      evidence: searchParams.get("evidence"),
      recommendation: searchParams.get("recommendation"),
      platform: searchParams.get("platform"),
    })

    if (campaignPrefill.campaign && !shouldSkipCampaignUrlPrefill(searchParams)) {
      setForm(applyCampaignPrefillToLearningForm(nextForm, campaignPrefill.campaign))
      setRecordId(null)
      toast.message(campaignPrefillToastMessage(campaignPrefill.campaign))
      return
    }

    setForm(nextForm)
    setRecordId(null)
  }, [searchParams, learnings, campaignPrefill.campaign])

  function patchForm(patch: Partial<LearningFormValues>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function handleNew() {
    setRecordId(null)
    setForm(
      campaignPrefill.campaign
        ? applyCampaignPrefillToLearningForm(emptyLearningForm(), campaignPrefill.campaign)
        : emptyLearningForm(),
    )
    setActiveTab("details")
    router.replace("/learnings")
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required")
      return
    }
    if (!form.insight.trim()) {
      toast.error("Insight is required")
      return
    }
    setSaving(true)
    try {
      const id = recordId ?? createId("learning")
      const existing = recordId ? learnings.find((item) => item.id === recordId) : null
      const record = recordFromLearningForm(form, id, {
        createdAt: existing?.createdAt,
        updatedAt: Date.now(),
      })
      const saved = recordId
        ? await updateLearning(record)
        : await createLearning(record)
      setRecordId(saved.id)
      setForm(learningFormFromRecord(saved))
      await loadLearnings()
      toast.success("Learning saved")
      router.replace(`/learnings?recordId=${encodeURIComponent(saved.id)}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save learning.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteLearning(id)
    if (!result.ok) {
      toast.error(result.message ?? "Could not delete learning.")
      return
    }
    toast.success("Learning deleted")
    if (recordId === id) handleNew()
    await loadLearnings()
  }

  async function handleDuplicate(id: string) {
    const copy = await duplicateLearning(id)
    if (!copy) {
      toast.error("Could not duplicate learning.")
      return
    }
    toast.success("Learning duplicated")
    await loadLearnings()
    router.push(`/learnings?recordId=${encodeURIComponent(copy.id)}`)
  }

  function handleExportJson() {
    const payload = recordId
      ? learnings.filter((item) => item.id === recordId)
      : learnings
    downloadJson("creatorops-learnings.json", payload)
    toast.success("Learnings exported")
  }

  async function handleImportFile(file: File) {
    const text = await file.text()
    const parsed = parseImportJsonText(text)
    if (!parsed.ok) {
      toast.error(parsed.message)
      return
    }
    const items = Array.isArray(parsed.value) ? parsed.value : [parsed.value]
    const result = await importLearnings(items)
    toast.success(result.message)
    await loadLearnings()
  }

  const filteredSaved = React.useMemo(() => {
    const q = savedSearch.trim().toLowerCase()
    const sourceTypeFilter = searchParams.get("sourceType")?.trim()
    return learnings.filter((item) => {
      if (sourceTypeFilter && item.sourceType !== sourceTypeFilter) return false
      if (filterType !== "all" && item.learningType !== filterType) return false
      if (filterCategory !== "all" && item.category !== filterCategory) return false
      if (filterStatus !== "all" && item.status !== filterStatus) return false
      if (!q) return true
      return [
        item.title,
        item.learningType,
        item.category,
        item.campaignName,
        item.artistName,
        item.insight,
        item.recommendation,
        item.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    })
  }, [learnings, savedSearch, filterType, filterCategory, filterStatus, searchParams])

  function renderSelectField(
    fieldKey: keyof LearningFormValues,
    options: readonly string[],
    allowEmpty = false,
  ) {
    return (
      <div key={fieldKey} className="space-y-2">
        <Label htmlFor={fieldKey}>{formatFieldLabel(fieldKey)}</Label>
        <Select
          value={(form[fieldKey] as string) || (allowEmpty ? "__empty__" : options[0])}
          onValueChange={(value) =>
            patchForm({ [fieldKey]: value === "__empty__" ? "" : value })
          }
        >
          <SelectTrigger id={fieldKey}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allowEmpty ? (
              <SelectItem value="__empty__">Not set</SelectItem>
            ) : null}
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  function renderTextField(fieldKey: keyof LearningFormValues, multiline = false) {
    return (
      <div key={fieldKey} className={multiline ? "sm:col-span-2 space-y-2" : "space-y-2"}>
        <Label htmlFor={fieldKey}>{formatFieldLabel(fieldKey)}</Label>
        {multiline ? (
          <Textarea
            id={fieldKey}
            value={form[fieldKey] as string}
            onChange={(event) => patchForm({ [fieldKey]: event.target.value })}
            rows={4}
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
  }

  const relatedLinks = [
    form.campaignId
      ? { label: "Campaign", href: `/campaigns?campaignId=${encodeURIComponent(form.campaignId)}` }
      : null,
    form.analyticsRecordId
      ? { label: "Analytics", href: `/analytics?recordId=${encodeURIComponent(form.analyticsRecordId)}` }
      : null,
    form.experimentId
      ? { label: "Experiment", href: `/experiments?recordId=${encodeURIComponent(form.experimentId)}` }
      : null,
    form.qualityReviewId
      ? { label: "Quality Review", href: `/quality?recordId=${encodeURIComponent(form.qualityReviewId)}` }
      : null,
    form.assetId
      ? { label: "Asset", href: `/assets?recordId=${encodeURIComponent(form.assetId)}` }
      : null,
    form.promptRunId
      ? { label: "Prompt Run", href: `/runner?recordId=${encodeURIComponent(form.promptRunId)}` }
      : null,
    form.playbookId
      ? { label: "Playbook", href: `/playbooks?recordId=${encodeURIComponent(form.playbookId)}` }
      : null,
  ].filter(Boolean) as { label: string; href: string }[]

  return (
    <ModuleShell>
      <ModulePageHeader
        title="Analytics Learning Library"
        description="Capture what worked, what failed, and what should shape future campaigns, prompts, experiments, and playbooks."
        action={
          <>
            <Button type="button" variant="outline" size="sm" onClick={handleNew}>
              <Plus className="size-4" />
              New Learning
            </Button>
            <Link href="/patterns" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ScanSearch className="size-4" />
              Pattern Detection
            </Link>
            <Link href="/feedback-loop" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Repeat className="size-4" />
              Open Feedback Loop
            </Link>
            <Link href="/quality-performance" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Scale className="size-4" />
              Quality vs Performance
            </Link>
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDuplicate(recordId!)}
                >
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
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Lightbulb className="size-4" />}
              Save
            </Button>
          </>
        }
      />

      {campaignPrefill.campaign ? (
        <CampaignPrefillBanner campaign={campaignPrefill.campaign} />
      ) : null}

      <ModuleWorkflowTabs tabs={LEARNING_TABS} value={activeTab} onValueChange={setActiveTab}>
        <ModuleTabPanel value="details">
          <FormSection title="Learning details" description="Classify and link this learning to campaigns and creators.">
            <FormGrid>
              {renderTextField("title")}
              {renderSelectField("learningType", LEARNING_TYPES)}
              {renderSelectField("category", LEARNING_CATEGORIES, true)}
              {renderSelectField("confidence", LEARNING_CONFIDENCE_LEVELS)}
              {renderSelectField("impact", LEARNING_IMPACT_LEVELS)}
              {renderSelectField("status", LEARNING_STATUSES)}
              {DETAIL_FIELDS.filter(
                (key) =>
                  !["title", "learningType", "category", "confidence", "impact", "status"].includes(
                    key,
                  ),
              ).map((fieldKey) =>
                renderTextField(fieldKey, fieldKey === "notes"),
              )}
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

        <ModuleTabPanel value="evidence">
          <FormSection title="Evidence" description="What happened and what data supports this learning.">
            <FormGrid>
              {EVIDENCE_FIELDS.map((fieldKey) =>
                renderTextField(
                  fieldKey,
                  ["insight", "evidence"].includes(fieldKey),
                ),
              )}
            </FormGrid>
          </FormSection>
        </ModuleTabPanel>

        <ModuleTabPanel value="recommendations">
          <FormSection title="Recommendations" description="What to repeat, avoid, and apply next time.">
            <FormGrid>
              {RECOMMENDATION_FIELDS.map((fieldKey) => renderTextField(fieldKey, true))}
            </FormGrid>
          </FormSection>
        </ModuleTabPanel>

        <ModuleTabPanel value="related">
          <Card className={RECENT_RECORDS_CARD_CLASS}>
            <CardHeader>
              <CardTitle className="text-base">Related records</CardTitle>
              <CardDescription>Jump to linked campaign, analytics, experiments, and more.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {relatedLinks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {relatedLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Lightbulb}
                  title="No related learnings"
                  description="Create a learning from analytics, experiments, quality reviews, or campaign results."
                  primaryActionLabel="Open Analytics"
                  primaryActionHref="/analytics"
                  secondaryActionLabel="Open Experiments"
                  secondaryActionHref="/experiments"
                />
              )}
            </CardContent>
          </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="saved">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading learnings…
            </div>
          ) : learnings.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title="No learnings yet"
              description="Capture what worked, what failed, and what should guide future campaigns."
              primaryActionLabel="New Learning"
              primaryActionOnClick={handleNew}
              secondaryActionLabel="Open Analytics"
              secondaryActionHref="/analytics"
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative min-w-0 flex-1 sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    value={savedSearch}
                    onChange={(event) => setSavedSearch(event.target.value)}
                    placeholder="Search learnings…"
                    className="pl-9"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {LEARNING_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {LEARNING_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {LEARNING_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredSaved.map((learning) => (
                  <LearningCard
                    key={learning.id}
                    learning={learning}
                    onOpen={() => router.push(`/learnings?recordId=${encodeURIComponent(learning.id)}`)}
                    onDuplicate={() => void handleDuplicate(learning.id)}
                    onDelete={() => void handleDelete(learning.id)}
                    onExport={() => downloadJson(`learning-${learning.id}.json`, learning)}
                  />
                ))}
              </div>
            </div>
          )}
        </ModuleTabPanel>

        <ModuleTabPanel value="patterns">
          <div className="grid gap-4 md:grid-cols-2">
            {LEARNING_PATTERN_GROUPS.map((group) => {
              const items = learnings.filter(group.filter).slice(0, 3)
              return (
                <Card key={group.id} className="border-border/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{group.label}</CardTitle>
                    <CardDescription>{learnings.filter(group.filter).length} learnings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No learnings in this group yet.</p>
                    ) : (
                      items.map((learning) => (
                        <div key={learning.id} className="rounded-md border border-border/80 p-3">
                          <p className="text-sm font-medium text-pretty">
                            {learning.title || "Untitled"}
                          </p>
                          <p className="text-xs text-muted-foreground text-pretty">
                            {previewText(learning.insight, 80)}
                          </p>
                        </div>
                      ))
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveTab("saved")
                        if (group.id === "high-impact-wins") {
                          setFilterCategory("Win")
                        } else if (group.id === "repeated-warnings") {
                          setFilterCategory("Warning")
                        } else if (group.id === "thumbnail") {
                          setFilterType("Thumbnail Text")
                        } else if (group.id === "youtube-title") {
                          setFilterType("YouTube Title")
                        } else if (group.id === "social-shorts") {
                          setFilterType("Social Caption")
                        } else if (group.id === "email") {
                          setFilterType("Email Subject")
                        } else if (group.id === "merch-product") {
                          setFilterType("Merch Copy")
                        } else if (group.id === "prompt-pattern") {
                          setFilterType("Prompt Pattern")
                        }
                      }}
                    >
                      View filtered
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ModuleTabPanel>
      </ModuleWorkflowTabs>
    </ModuleShell>
  )
}
