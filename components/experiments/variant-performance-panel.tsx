"use client"

import { applyWinnerChoice } from "@/lib/experiments"
import type { ExperimentRecord } from "@/lib/types"
import { EXPERIMENT_WINNER_OPTIONS } from "@/lib/types"
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
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RECENT_RECORDS_CARD_CLASS } from "@/components/module/form-layout"
import { TrendingUp } from "lucide-react"

type VariantFormSlice = Pick<
  ExperimentRecord,
  | "variantAMetric"
  | "variantBMetric"
  | "variantCMetric"
  | "winner"
  | "confidenceNotes"
  | "learningSummary"
  | "nextTestIdea"
  | "status"
>

export function VariantPerformancePanel({
  form,
  onChange,
}: {
  form: VariantFormSlice
  onChange: (patch: Partial<VariantFormSlice>) => void
}) {
  function handleWinnerChange(winner: string) {
    const patch: Partial<VariantFormSlice> = { winner }
    if (winner && winner !== "Inconclusive" && form.status !== "Archived") {
      patch.status = "Winner Chosen"
    }
    onChange(patch)
  }

  return (
    <Card className={RECENT_RECORDS_CARD_CLASS}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4" />
          Variant Performance
        </CardTitle>
        <CardDescription>
          Enter manual metrics, choose a winner, and capture learnings for the next test.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="variantAMetric">Variant A metric</Label>
            <Input
              id="variantAMetric"
              value={form.variantAMetric}
              onChange={(e) => onChange({ variantAMetric: e.target.value })}
              placeholder="e.g. CTR 4.1%"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="variantBMetric">Variant B metric</Label>
            <Input
              id="variantBMetric"
              value={form.variantBMetric}
              onChange={(e) => onChange({ variantBMetric: e.target.value })}
              placeholder="e.g. CTR 5.8%"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="variantCMetric">Variant C metric</Label>
            <Input
              id="variantCMetric"
              value={form.variantCMetric}
              onChange={(e) => onChange({ variantCMetric: e.target.value })}
              placeholder="e.g. CTR 3.9%"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Choose winner</Label>
          <Select value={form.winner || ""} onValueChange={handleWinnerChange}>
            <SelectTrigger>
              <span>{form.winner || "Select winning variant"}</span>
            </SelectTrigger>
            <SelectContent>
              {EXPERIMENT_WINNER_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confidenceNotes">Confidence notes</Label>
          <Textarea
            id="confidenceNotes"
            value={form.confidenceNotes}
            onChange={(e) => onChange({ confidenceNotes: e.target.value })}
            placeholder="Sample size, duration, or confidence level…"
            rows={2}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="learningSummary">Learning summary</Label>
          <Textarea
            id="learningSummary"
            value={form.learningSummary}
            onChange={(e) => onChange({ learningSummary: e.target.value })}
            placeholder="What did you learn from this test?"
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="nextTestIdea">Next experiment idea</Label>
          <Textarea
            id="nextTestIdea"
            value={form.nextTestIdea}
            onChange={(e) => onChange({ nextTestIdea: e.target.value })}
            placeholder="What should you test next?"
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export { applyWinnerChoice }
