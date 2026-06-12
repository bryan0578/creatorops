"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormTextarea, FORM_HINTS } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"

export type ArtistBibleFormState = {
  artistName: string
  projectName: string
  labelName: string
  status: string
  genre: string
  subgenre: string
  mood: string
  aesthetic: string
  targetAudience: string
  brandPromise: string
  shortBio: string
  longBio: string
  voiceRules: string
  lyricalThemes: string
  visualRules: string
  sonicRules: string
  doList: string
  dontList: string
  referenceArtists: string
  referenceMedia: string
  colorPalette: string
  keywords: string
  tags: string
  notes: string
}

export type ArtistBibleFormSection =
  | "identity"
  | "bio"
  | "voice"
  | "sonic"
  | "visual"
  | "references"
  | "boundaries"

const SECTION_IDS: Record<ArtistBibleFormSection, string> = {
  identity: "artist-bible-section-identity",
  bio: "artist-bible-section-bio",
  voice: "artist-bible-section-voice",
  sonic: "artist-bible-section-sonic",
  visual: "artist-bible-section-visual",
  references: "artist-bible-section-references",
  boundaries: "artist-bible-section-boundaries",
}

function SectionCard({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card id={id} className="scroll-mt-20 border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function ArtistBibleForm({
  values,
  onChange,
  scrollToSection,
}: {
  values: ArtistBibleFormState
  onChange: (patch: Partial<ArtistBibleFormState>) => void
  scrollToSection?: ArtistBibleFormSection | null
}) {
  const set =
    (key: keyof ArtistBibleFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [key]: e.target.value })
    }

  React.useEffect(() => {
    if (!scrollToSection) return
    const id = SECTION_IDS[scrollToSection]
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [scrollToSection])

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <SectionCard
        id={SECTION_IDS.identity}
        title="Identity"
        description="Core artist and project identity for campaigns, packaging, and AI context."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField fieldKey="artistName" required>
            <Input value={values.artistName} onChange={set("artistName")} />
          </FormField>
          <FormField fieldKey="projectName">
            <Input value={values.projectName} onChange={set("projectName")} />
          </FormField>
          <FormField fieldKey="labelName">
            <Input value={values.labelName} onChange={set("labelName")} />
          </FormField>
          <FormField fieldKey="status">
            <Input value={values.status} onChange={set("status")} placeholder="Active" />
          </FormField>
          <FormField fieldKey="genre">
            <Input value={values.genre} onChange={set("genre")} />
          </FormField>
          <FormField fieldKey="subgenre">
            <Input value={values.subgenre} onChange={set("subgenre")} />
          </FormField>
          <div className="md:col-span-2">
            <FormField fieldKey="mood">
              <FormTextarea value={values.mood} onChange={set("mood")} rows={3} />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField fieldKey="aesthetic">
              <FormTextarea value={values.aesthetic} onChange={set("aesthetic")} rows={3} />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField fieldKey="targetAudience">
              <FormTextarea value={values.targetAudience} onChange={set("targetAudience")} rows={3} />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField fieldKey="brandPromise">
              <FormTextarea value={values.brandPromise} onChange={set("brandPromise")} rows={4} size="lg" />
            </FormField>
          </div>
        </div>
      </SectionCard>

      <SectionCard id={SECTION_IDS.bio} title="Bio" description="Short and long-form positioning for releases and profiles.">
        <div className="grid gap-4">
          <FormField fieldKey="shortBio" hint="One paragraph for overview cards and quick context.">
            <FormTextarea value={values.shortBio} onChange={set("shortBio")} rows={5} size="lg" />
          </FormField>
          <FormField fieldKey="longBio" hint="Extended artist story, positioning, and background.">
            <FormTextarea value={values.longBio} onChange={set("longBio")} rows={10} size="xl" />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard
        id={SECTION_IDS.voice}
        title="Voice & Lyrics"
        description="Personality, vocal presentation, and lyrical territory."
      >
        <div className="grid gap-4">
          <FormField fieldKey="voiceRules" hint="How the artist speaks, performs, and presents personality.">
            <FormTextarea value={values.voiceRules} onChange={set("voiceRules")} rows={6} size="lg" />
          </FormField>
          <FormField fieldKey="lyricalThemes" hint="Recurring lyrical ideas, motifs, and emotional territory.">
            <FormTextarea value={values.lyricalThemes} onChange={set("lyricalThemes")} rows={6} size="lg" />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard
        id={SECTION_IDS.sonic}
        title="Sonic Rules"
        description="Production, tempo, instrumentation, and sound design boundaries."
      >
        <FormField fieldKey="sonicRules">
          <FormTextarea value={values.sonicRules} onChange={set("sonicRules")} rows={10} size="xl" />
        </FormField>
      </SectionCard>

      <SectionCard
        id={SECTION_IDS.visual}
        title="Visual Rules"
        description="Thumbnail, video, cover, merch, and brand visual constraints."
      >
        <div className="grid gap-4">
          <FormField fieldKey="visualRules">
            <FormTextarea value={values.visualRules} onChange={set("visualRules")} rows={8} size="xl" />
          </FormField>
          <FormField fieldKey="colorPalette" hint={FORM_HINTS.colors}>
            <FormTextarea
              value={values.colorPalette}
              onChange={set("colorPalette")}
              rows={5}
              size="lg"
              className="font-mono text-sm"
            />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard
        id={SECTION_IDS.references}
        title="References"
        description="Artists, media, keywords, and tags that shape the IP."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField fieldKey="referenceArtists" hint={FORM_HINTS.arrayPerLine}>
            <FormTextarea value={values.referenceArtists} onChange={set("referenceArtists")} rows={6} size="lg" />
          </FormField>
          <FormField fieldKey="referenceMedia" hint="Films, games, aesthetics, playlists — one per line.">
            <FormTextarea value={values.referenceMedia} onChange={set("referenceMedia")} rows={6} size="lg" />
          </FormField>
          <FormField fieldKey="keywords" hint={FORM_HINTS.commaSeparated}>
            <FormTextarea value={values.keywords} onChange={set("keywords")} rows={4} />
          </FormField>
          <FormField fieldKey="tags" hint={FORM_HINTS.commaSeparated}>
            <FormTextarea value={values.tags} onChange={set("tags")} rows={4} />
          </FormField>
        </div>
      </SectionCard>

      <SectionCard
        id={SECTION_IDS.boundaries}
        title="Creative Boundaries"
        description="Do/don't rules and internal notes for consistent creative decisions."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField fieldKey="doList" hint="Creative boundaries to embrace — one per line.">
            <FormTextarea value={values.doList} onChange={set("doList")} rows={8} size="xl" />
          </FormField>
          <FormField fieldKey="dontList" hint="Things to avoid — one per line.">
            <FormTextarea value={values.dontList} onChange={set("dontList")} rows={8} size="xl" />
          </FormField>
          <div className="md:col-span-2">
            <FormField fieldKey="notes" hint="Internal notes, canon reminders, or operating context.">
              <FormTextarea value={values.notes} onChange={set("notes")} rows={6} size="lg" />
            </FormField>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function EditorActions({
  mode,
  saving,
  onSave,
  onCancel,
}: {
  mode: "create" | "edit"
  saving: boolean
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" disabled={saving} onClick={onSave}>
        {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Save Artist Bible"}
      </Button>
    </div>
  )
}

export function ArtistBibleEditor({
  mode,
  values,
  onChange,
  onSave,
  onCancel,
  onSaved,
  saving,
  completenessScore,
  scrollToSection,
  onPrettyWiseStarter,
}: {
  mode: "create" | "edit"
  values: ArtistBibleFormState
  onChange: (patch: Partial<ArtistBibleFormState>) => void
  onSave: () => void | Promise<void>
  onCancel: () => void
  onSaved?: () => void
  saving: boolean
  completenessScore?: number
  scrollToSection?: ArtistBibleFormSection | null
  onPrettyWiseStarter?: () => void | Promise<void>
}) {
  async function handleSave() {
    await onSave()
    onSaved?.()
  }

  const title =
    mode === "edit"
      ? `Edit Artist Bible — ${values.artistName || "Untitled"}`
      : "New Artist Bible"

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl">{title}</CardTitle>
              <CardDescription className="max-w-3xl text-pretty">
                {mode === "create"
                  ? "Create a new artist identity, creative rules, sound, visuals, references, and AI context."
                  : "Complete all sections to improve AI context, campaign consistency, visuals, lyrics, products, and prompts."}
              </CardDescription>
              {mode === "edit" && typeof completenessScore === "number" ? (
                <div className="max-w-md space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Completion progress</span>
                    <span className="tabular-nums">{completenessScore}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${completenessScore}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <EditorActions mode={mode} saving={saving} onSave={() => void handleSave()} onCancel={onCancel} />
          </div>
          {mode === "create" && onPrettyWiseStarter ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => void onPrettyWiseStarter()}
            >
              <Sparkles className="mr-1 size-4" />
              Create PrettyWise Starter instead
            </Button>
          ) : null}
        </CardHeader>
      </Card>

      <nav className="flex flex-wrap gap-2 text-sm">
        {(Object.entries(SECTION_IDS) as [ArtistBibleFormSection, string][]).map(([key, id]) => (
          <a
            key={key}
            href={`#${id}`}
            className="rounded-md border border-border/80 bg-card px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            {key === "voice"
              ? "Voice & Lyrics"
              : key === "boundaries"
                ? "Creative Boundaries"
                : key.charAt(0).toUpperCase() + key.slice(1)}
          </a>
        ))}
      </nav>

      <ArtistBibleForm values={values} onChange={onChange} scrollToSection={scrollToSection} />

      <Card className="border-border/80">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Save when you are done editing this section or the full bible.</p>
          <EditorActions mode={mode} saving={saving} onSave={() => void handleSave()} onCancel={onCancel} />
        </CardContent>
      </Card>
    </div>
  )
}
