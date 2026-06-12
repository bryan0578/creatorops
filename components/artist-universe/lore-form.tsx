"use client"

import * as React from "react"

import { CANON_STATUSES, LORE_STATUSES, LORE_TYPES } from "@/lib/artist-universe/types"
import {
  joinLoreTypes,
  loreTypesForForm,
  parseLoreTypes,
} from "@/lib/artist-universe/lore-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormTextarea, FORM_HINTS } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

export type LoreFormState = {
  title: string
  artistName: string
  loreType: string
  status: string
  canonStatus: string
  summary: string
  details: string
  characters: string
  locations: string
  symbols: string
  themes: string
  relatedSongs: string
  relatedCampaignIds: string
  relatedAssetIds: string
  tags: string
  notes: string
}

function optionsWithCurrent(standard: readonly string[], current: string): string[] {
  const trimmed = current.trim()
  if (!trimmed) return [...standard]
  if (standard.some((option) => option.toLowerCase() === trimmed.toLowerCase())) {
    return [...standard]
  }
  return [...standard, trimmed]
}

function LoreTypeMultiSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (loreType: string) => void
}) {
  const [customInput, setCustomInput] = React.useState("")
  const parsed = React.useMemo(() => parseLoreTypes(value), [value])
  const { custom } = React.useMemo(() => loreTypesForForm(value, LORE_TYPES), [value])

  function toggle(type: string) {
    const key = type.toLowerCase()
    const next = parsed.some((t) => t.toLowerCase() === key)
      ? parsed.filter((t) => t.toLowerCase() !== key)
      : [...parsed, type]
    onChange(joinLoreTypes(next))
  }

  function addCustom() {
    const trimmed = customInput.trim()
    if (!trimmed) return
    onChange(joinLoreTypes([...parsed, trimmed]))
    setCustomInput("")
  }

  function removeCustom(type: string) {
    onChange(joinLoreTypes(parsed.filter((t) => t.toLowerCase() !== type.toLowerCase())))
  }

  const standardSelected = new Set(
    parsed.filter((t) => LORE_TYPES.some((s) => s.toLowerCase() === t.toLowerCase())).map((t) => t.toLowerCase()),
  )

  return (
    <FormField
      fieldKey="loreType"
      required
      hint='Select one or more. Multiple types will be saved as Character / Theme.'
      className="md:col-span-2"
    >
      <div className="space-y-3 rounded-md border border-border/80 bg-muted/20 p-3">
        <div className="flex flex-wrap gap-1.5">
          {LORE_TYPES.map((type) => {
            const selected = standardSelected.has(type.toLowerCase())
            return (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                className="h-7 px-2.5 text-xs"
                onClick={() => toggle(type)}
              >
                {type}
              </Button>
            )
          })}
        </div>
        {custom.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {custom.map((type) => (
              <Badge key={type} variant="secondary" className="gap-1 pr-1">
                {type}
                <button
                  type="button"
                  className="ml-0.5 rounded-sm px-1 text-muted-foreground hover:text-foreground"
                  onClick={() => removeCustom(type)}
                  aria-label={`Remove ${type}`}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
        <div className="flex gap-2">
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Custom type"
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addCustom()
              }
            }}
          />
          <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={addCustom}>
            Add
          </Button>
        </div>
        {parsed.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Saved as: <span className="font-medium text-foreground">{joinLoreTypes(parsed)}</span>
          </p>
        ) : null}
      </div>
    </FormField>
  )
}

function LoreSelectField({
  fieldKey,
  required,
  value,
  options,
  placeholder,
  onChange,
}: {
  fieldKey: string
  required?: boolean
  value: string
  options: readonly string[]
  placeholder: string
  onChange: (value: string) => void
}) {
  const items = optionsWithCurrent(options, value)
  const display = value.trim() || placeholder

  return (
    <FormField fieldKey={fieldKey} required={required}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <span>{display}</span>
        </SelectTrigger>
        <SelectContent>
          {items.map((option) => {
            const isCustom = !options.some((standard) => standard === option)
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

export function LoreForm({
  values,
  onChange,
  mode,
  artistOptions = [],
  onArtistChange,
  onUseArtistContext,
  hasArtistContext = false,
}: {
  values: LoreFormState
  onChange: (patch: Partial<LoreFormState>) => void
  mode: "create" | "edit"
  artistOptions?: string[]
  onArtistChange?: (artistName: string) => void
  onUseArtistContext?: () => void
  hasArtistContext?: boolean
}) {
  const set =
    (key: keyof LoreFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [key]: e.target.value })
    }

  const artistInOptions = artistOptions.some(
    (name) => name.toLowerCase() === values.artistName.trim().toLowerCase(),
  )
  const showManualArtist = mode === "create" && (artistOptions.length === 0 || !artistInOptions)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lore Basics</CardTitle>
          <CardDescription className="max-w-2xl text-pretty">
            {mode === "edit"
              ? "Update core identity and classification for this lore piece."
              : values.artistName.trim()
                ? `New Lore Entry for ${values.artistName.trim()}`
                : "Start with a symbol, character, location, theme, or story event that can connect songs, visuals, campaigns, and products."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {mode === "create" && artistOptions.length > 0 ? (
            <div className="space-y-3 md:col-span-2">
              <FormField
                fieldKey="artistName"
                required
                hint="Select an artist to prefill context from Artist Bible and Visual Identity."
              >
                <Select
                  value={artistInOptions ? values.artistName : undefined}
                  onValueChange={(artistName) => onArtistChange?.(artistName)}
                >
                  <SelectTrigger className="w-full">
                    <span>{values.artistName.trim() || "Select artist"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {artistOptions.map((artist) => (
                      <SelectItem key={artist} value={artist}>
                        {artist}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              {showManualArtist ? (
                <FormField label="Or Enter Artist Manually">
                  <Input
                    value={values.artistName}
                    onChange={(e) => onArtistChange?.(e.target.value)}
                    placeholder="Artist name"
                  />
                </FormField>
              ) : null}
              {hasArtistContext && onUseArtistContext ? (
                <Button type="button" size="sm" variant="outline" onClick={onUseArtistContext}>
                  Use artist context
                </Button>
              ) : null}
            </div>
          ) : (
            <FormField fieldKey="artistName" required>
              <Input
                value={values.artistName}
                onChange={set("artistName")}
                disabled={mode === "edit"}
              />
            </FormField>
          )}

          <FormField fieldKey="title" required>
            <Input value={values.title} onChange={set("title")} />
          </FormField>

          <LoreTypeMultiSelect
            value={values.loreType}
            onChange={(loreType) => onChange({ loreType })}
          />

          <LoreSelectField
            fieldKey="status"
            required
            value={values.status}
            options={LORE_STATUSES}
            placeholder="Draft"
            onChange={(status) => onChange({ status })}
          />

          <LoreSelectField
            fieldKey="canonStatus"
            required
            value={values.canonStatus}
            options={CANON_STATUSES}
            placeholder="Flexible"
            onChange={(canonStatus) => onChange({ canonStatus })}
          />

          <div className="md:col-span-2">
            <FormField fieldKey="summary" required>
              <FormTextarea value={values.summary} onChange={set("summary")} rows={3} />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField fieldKey="details">
              <FormTextarea value={values.details} onChange={set("details")} rows={5} size="lg" />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Symbols & Themes</CardTitle>
          <CardDescription>Optional worldbuilding elements. {FORM_HINTS.arrayPerLine}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField fieldKey="characters" hint={FORM_HINTS.arrayPerLine}>
            <FormTextarea value={values.characters} onChange={set("characters")} rows={4} />
          </FormField>
          <FormField fieldKey="locations" hint={FORM_HINTS.arrayPerLine}>
            <FormTextarea value={values.locations} onChange={set("locations")} rows={4} />
          </FormField>
          <FormField fieldKey="symbols" hint={FORM_HINTS.arrayPerLine}>
            <FormTextarea value={values.symbols} onChange={set("symbols")} rows={4} />
          </FormField>
          <FormField fieldKey="themes" hint={FORM_HINTS.arrayPerLine}>
            <FormTextarea value={values.themes} onChange={set("themes")} rows={4} />
          </FormField>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Related Records</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField fieldKey="relatedSongs" hint={FORM_HINTS.arrayPerLine}>
            <FormTextarea value={values.relatedSongs} onChange={set("relatedSongs")} rows={3} />
          </FormField>
          <FormField fieldKey="relatedCampaignIds" hint={FORM_HINTS.assetIds}>
            <FormTextarea value={values.relatedCampaignIds} onChange={set("relatedCampaignIds")} rows={3} />
          </FormField>
          <FormField fieldKey="relatedAssetIds" hint={FORM_HINTS.assetIds}>
            <FormTextarea value={values.relatedAssetIds} onChange={set("relatedAssetIds")} rows={3} />
          </FormField>
          <FormField fieldKey="tags" hint={FORM_HINTS.tags}>
            <FormTextarea value={values.tags} onChange={set("tags")} rows={3} />
          </FormField>
          <div className="md:col-span-2">
            <FormField fieldKey="notes">
              <FormTextarea value={values.notes} onChange={set("notes")} rows={3} />
            </FormField>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
