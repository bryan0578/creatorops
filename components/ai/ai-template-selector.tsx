"use client"

import * as React from "react"
import { Eye, Sparkles } from "lucide-react"

import { useStore } from "@/lib/store"
import type { Prompt } from "@/lib/types"
import {
  DEFAULT_TEMPLATE_NAME_BY_SLUG,
  type AITemplateModuleSlug,
} from "@/lib/ai-templates/constants"
import {
  filterTemplatesForModule,
  findDefaultTemplate,
  getTemplateModeTags,
  getTemplateModuleSlug,
} from "@/lib/ai-templates/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PromptPreviewBlock } from "@/components/module/form-layout"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type AITemplateSelectorProps = {
  moduleSlug: AITemplateModuleSlug | string
  selectedTemplate: Prompt | null
  onSelect: (template: Prompt | null) => void
  className?: string
  compact?: boolean
}

export function AITemplateSelector({
  moduleSlug,
  selectedTemplate,
  onSelect,
  className,
  compact = false,
}: AITemplateSelectorProps) {
  const { prompts, hydrated } = useStore()
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const defaultedRef = React.useRef(false)

  const templates = React.useMemo(
    () => filterTemplatesForModule(prompts, moduleSlug),
    [prompts, moduleSlug],
  )

  React.useEffect(() => {
    defaultedRef.current = false
  }, [moduleSlug])

  React.useEffect(() => {
    if (!hydrated || selectedTemplate || templates.length === 0 || defaultedRef.current) {
      return
    }
    const defaultName =
      DEFAULT_TEMPLATE_NAME_BY_SLUG[moduleSlug as AITemplateModuleSlug]
    const fallback = findDefaultTemplate(prompts, moduleSlug, defaultName)
    if (fallback) {
      defaultedRef.current = true
      onSelect(fallback)
    }
  }, [hydrated, moduleSlug, onSelect, prompts, selectedTemplate, templates.length])

  const moduleLabel = getTemplateModuleSlug(selectedTemplate ?? { tags: [] })
  const modeTags = selectedTemplate ? getTemplateModeTags(selectedTemplate) : []

  return (
    <>
      <Card className={className ?? "border-border/80"}>
        <CardHeader className={compact ? "pb-2" : undefined}>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            AI Generation Mode
          </CardTitle>
          <CardDescription>
            Optional template to guide style and output goal. Manual generation still works
            without a template.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`ai-template-${moduleSlug}`}>Template</Label>
            <Select
              value={selectedTemplate?.id ?? "none"}
              onValueChange={(value) => {
                if (value === "none") {
                  onSelect(null)
                  return
                }
                const next = templates.find((item) => item.id === value) ?? null
                onSelect(next)
              }}
            >
              <SelectTrigger id={`ai-template-${moduleSlug}`}>
                <SelectValue placeholder="No template (manual)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No template (manual)</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {templates.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No AI templates found for this module. Seed starter templates from Settings →
              AI Providers or Prompt Library.
            </p>
          ) : null}

          {selectedTemplate ? (
            <div className="space-y-2 rounded-lg border border-border/80 bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{selectedTemplate.name}</p>
                {moduleLabel ? (
                  <Badge variant="secondary" className="text-xs">
                    {moduleLabel}
                  </Badge>
                ) : null}
                {modeTags.map((mode) => (
                  <Badge key={mode} variant="outline" className="text-xs">
                    {mode}
                  </Badge>
                ))}
              </div>
              {selectedTemplate.description ? (
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.description}
                </p>
              ) : null}
              {selectedTemplate.outputFormat.trim() ? (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  Output: {selectedTemplate.outputFormat.split("\n")[0]}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="size-4" />
                  Preview Template
                </Button>
                <Button type="button" size="sm" onClick={() => onSelect(selectedTemplate)}>
                  Use Template
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name ?? "Template preview"}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description ?? "AI generation template instructions"}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Instructions</Label>
                <PromptPreviewBlock value={selectedTemplate.promptText} emptyMessage="—" />
              </div>
              {selectedTemplate.outputFormat.trim() ? (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Output format</Label>
                  <PromptPreviewBlock
                    value={selectedTemplate.outputFormat}
                    emptyMessage="—"
                  />
                </div>
              ) : null}
              {selectedTemplate.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedTemplate.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function useAITemplateSelection(moduleSlug: string) {
  const [selectedTemplate, setSelectedTemplate] = React.useState<Prompt | null>(null)
  return { selectedTemplate, setSelectedTemplate, moduleSlug }
}
