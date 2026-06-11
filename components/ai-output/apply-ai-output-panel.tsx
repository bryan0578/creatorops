"use client"

import * as React from "react"
import { Copy, FileInput, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  computeApplyPlan,
  getModuleFieldDefinitions,
  parseAIOutput,
  type AIOutputModuleType,
  type ParseAIOutputResult,
} from "@/lib/ai-output/module-parsers"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { QualityReviewActionLink } from "@/components/quality/quality-review-action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type ApplyAIOutputPanelProps = {
  moduleType: AIOutputModuleType
  aiResponse: string
  existingValues: Record<string, string>
  onApply: (fields: Record<string, string>) => void
  onApplied?: () => void
  finalTabLabel?: string
  supportedFields?: string[]
  disabled?: boolean
  className?: string
  compact?: boolean
  qualityReview?: {
    reviewType: string
    campaignId?: string
    campaignName?: string
    sourceRecordType?: string
    recordId?: string | null
  }
}

function confidenceLabel(confidence: ParseAIOutputResult["confidence"]): string {
  switch (confidence) {
    case "high":
      return "High confidence"
    case "medium":
      return "Medium confidence"
    default:
      return "Low confidence"
  }
}

export function ApplyAIOutputPanel({
  moduleType,
  aiResponse,
  existingValues,
  onApply,
  onApplied,
  finalTabLabel = "Final",
  supportedFields,
  disabled = false,
  className,
  compact = false,
  qualityReview,
}: ApplyAIOutputPanelProps) {
  const [parsing, setParsing] = React.useState(false)
  const [parseResult, setParseResult] = React.useState<ParseAIOutputResult | null>(null)
  const [onlyFillEmpty, setOnlyFillEmpty] = React.useState(true)
  const [allowOverwrite, setAllowOverwrite] = React.useState(false)
  const [showQualityLink, setShowQualityLink] = React.useState(false)
  const [selectedKeys, setSelectedKeys] = React.useState<Set<string>>(new Set())

  const fieldLabels = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const field of getModuleFieldDefinitions(moduleType)) {
      map.set(field.key, field.label)
    }
    return map
  }, [moduleType])

  const filteredParsedFields = React.useMemo(() => {
    if (!parseResult?.parsedFields) return {}
    if (!supportedFields?.length) return parseResult.parsedFields
    const allowed = new Set(supportedFields)
    return Object.fromEntries(
      Object.entries(parseResult.parsedFields).filter(([key]) => allowed.has(key)),
    )
  }, [parseResult, supportedFields])

  const canParse = Boolean(aiResponse.trim()) && !disabled

  const applyPlan = React.useMemo(() => {
    if (!parseResult?.success) return { readyKeys: [] as string[], skippedKeys: [] as string[] }
    return computeApplyPlan(filteredParsedFields, existingValues, {
      onlyFillEmpty,
      allowOverwrite: allowOverwrite && !onlyFillEmpty,
    })
  }, [parseResult, filteredParsedFields, existingValues, onlyFillEmpty, allowOverwrite])

  React.useEffect(() => {
    if (!parseResult?.success) return
    const plan = computeApplyPlan(filteredParsedFields, existingValues, {
      onlyFillEmpty,
      allowOverwrite: allowOverwrite && !onlyFillEmpty,
    })
    setSelectedKeys(new Set(plan.readyKeys))
  }, [parseResult, filteredParsedFields, existingValues, onlyFillEmpty, allowOverwrite])

  function handleParse() {
    if (!canParse) {
      toast.error("Paste or generate an AI response first.")
      return
    }

    setParsing(true)
    try {
      const result = parseAIOutput({
        moduleType,
        aiResponse,
        existingValues,
      })

      if (supportedFields?.length && result.success) {
        const allowed = new Set(supportedFields)
        result.parsedFields = Object.fromEntries(
          Object.entries(result.parsedFields).filter(([key]) => allowed.has(key)),
        )
        if (Object.keys(result.parsedFields).length === 0) {
          result.success = false
          result.error = "No supported fields were detected in the AI response."
        }
      }

      setParseResult(result)
      setShowQualityLink(false)

      if (!result.success) {
        toast.error(result.error ?? "Could not parse AI response.")
        return
      }

      toast.success(`Detected ${Object.keys(result.parsedFields).length} fields`)
    } finally {
      setParsing(false)
    }
  }

  function handleApply() {
    if (!parseResult?.success) {
      toast.error("Parse the AI response first.")
      return
    }

    const fields: Record<string, string> = {}
    for (const key of selectedKeys) {
      const value = filteredParsedFields[key]
      if (value?.trim()) fields[key] = value
    }

    if (Object.keys(fields).length === 0) {
      toast.error("No fields selected to apply.")
      return
    }

    onApply(fields)
    onApplied?.()
    setShowQualityLink(true)
    toast.success(
      `Applied ${Object.keys(fields).length} field${Object.keys(fields).length === 1 ? "" : "s"} from AI response.`,
    )
  }

  async function handleCopyParsedJson() {
    if (!parseResult?.success) return
    try {
      await copyToClipboard(JSON.stringify(filteredParsedFields, null, 2))
      toast.success("Copied parsed JSON")
    } catch {
      toast.error("Could not copy parsed JSON")
    }
  }

  function toggleKey(key: string, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  const readyCount = applyPlan.readyKeys.filter((key) => selectedKeys.has(key)).length
  const skippedCount = applyPlan.skippedKeys.length

  return (
    <Card className={className ?? "border-border/80"}>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className="text-base flex items-center gap-2">
          <FileInput className="size-4 text-primary" />
          Apply to Final Fields
        </CardTitle>
        <CardDescription>
          Parse AI response text locally into {finalTabLabel.toLowerCase()} fields. Nothing is saved
          until you click Save on the record.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canParse || parsing}
            onClick={handleParse}
          >
            {parsing ? <Loader2 className="size-4 animate-spin" /> : <FileInput className="size-4" />}
            Parse AI Response
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!parseResult?.success || selectedKeys.size === 0}
            onClick={handleApply}
          >
            Apply to Final Fields
          </Button>
          {parseResult?.success ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => void handleCopyParsedJson()}>
              <Copy className="size-4" />
              Copy Parsed JSON
            </Button>
          ) : null}
        </div>

        {!canParse ? (
          <p className="text-sm text-muted-foreground">
            Paste or generate an AI response first.
          </p>
        ) : null}

        {parseResult?.success ? (
          <div className="space-y-3 rounded-md border border-border/70 bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{confidenceLabel(parseResult.confidence)}</Badge>
              <span className="text-sm text-muted-foreground">
                {readyCount} field{readyCount === 1 ? "" : "s"} ready to apply
                {skippedCount > 0
                  ? `, ${skippedCount} skipped because they already have content`
                  : ""}
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border border-input"
                  checked={onlyFillEmpty}
                  onChange={(e) => {
                    setOnlyFillEmpty(e.target.checked)
                    if (e.target.checked) setAllowOverwrite(false)
                  }}
                />
                Only fill empty fields
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 rounded border border-input"
                  checked={allowOverwrite}
                  disabled={onlyFillEmpty}
                  onChange={(e) => setAllowOverwrite(e.target.checked)}
                />
                Overwrite existing fields
              </label>
            </div>

            {parseResult.warnings.length > 0 ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {parseResult.warnings[0]}
              </p>
            ) : null}

            {parseResult.unmatchedSections.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Unmatched sections: {parseResult.unmatchedSections.slice(0, 4).join(", ")}
                {parseResult.unmatchedSections.length > 4 ? "…" : ""}
              </p>
            ) : null}

            <div className="max-h-64 space-y-2 overflow-y-auto">
              {Object.entries(filteredParsedFields).map(([key, value]) => {
                const isSkipped = applyPlan.skippedKeys.includes(key)
                return (
                  <label
                    key={key}
                    className="flex items-start gap-2 rounded-md border border-border/60 bg-background/80 p-2"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 rounded border border-input"
                      checked={selectedKeys.has(key)}
                      disabled={isSkipped && onlyFillEmpty && !allowOverwrite}
                      onChange={(e) => toggleKey(key, e.target.checked)}
                    />
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {fieldLabels.get(key) ?? key}
                        {isSkipped ? (
                          <Badge variant="outline" className="text-[10px]">
                            has content
                          </Badge>
                        ) : null}
                      </span>
                      <span className="block whitespace-pre-wrap text-xs text-muted-foreground">
                        {value.length > 240 ? `${value.slice(0, 240)}…` : value}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ) : parseResult?.error ? (
          <p className="text-sm text-muted-foreground">{parseResult.error}</p>
        ) : null}

        {showQualityLink && qualityReview ? (
          <QualityReviewActionLink
            reviewType={qualityReview.reviewType}
            campaignId={qualityReview.campaignId}
            campaignName={qualityReview.campaignName}
            sourceRecordType={qualityReview.sourceRecordType}
            recordId={qualityReview.recordId}
            label="Review / Score this output"
            requireSavedRecord
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
