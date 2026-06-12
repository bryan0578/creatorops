"use client"

import * as React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField, FormTextarea, FORM_HINTS } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"

export type VisualIdentityFormState = {
  artistName: string
  profileName: string
  status: string
  visualStyle: string
  colorPalette: string
  typographyRules: string
  characterRules: string
  environmentRules: string
  imagePromptRules: string
  thumbnailRules: string
  merchDesignRules: string
  forbiddenElements: string
  referenceAssetIds: string
  referenceDriveFileIds: string
  tags: string
  notes: string
}

export const EMPTY_VISUAL_IDENTITY_FORM: VisualIdentityFormState = {
  artistName: "",
  profileName: "",
  status: "Active",
  visualStyle: "",
  colorPalette: "",
  typographyRules: "",
  characterRules: "",
  environmentRules: "",
  imagePromptRules: "",
  thumbnailRules: "",
  merchDesignRules: "",
  forbiddenElements: "",
  referenceAssetIds: "",
  referenceDriveFileIds: "",
  tags: "",
  notes: "",
}

export function VisualIdentityForm({
  values,
  onChange,
  mode,
}: {
  values: VisualIdentityFormState
  onChange: (patch: Partial<VisualIdentityFormState>) => void
  mode: "create" | "edit"
}) {
  const set =
    (key: keyof VisualIdentityFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [key]: e.target.value })
    }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profile Basics</CardTitle>
          <CardDescription>
            {mode === "create" ? "Create a visual identity profile for this artist." : "Update profile details."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField fieldKey="artistName" required>
            <Input value={values.artistName} onChange={set("artistName")} />
          </FormField>
          <FormField fieldKey="profileName" required>
            <Input value={values.profileName} onChange={set("profileName")} />
          </FormField>
          <FormField fieldKey="status">
            <Input value={values.status} onChange={set("status")} placeholder="Active" />
          </FormField>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Style Rules</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField fieldKey="visualStyle">
            <FormTextarea value={values.visualStyle} onChange={set("visualStyle")} rows={5} size="lg" />
          </FormField>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField fieldKey="typographyRules">
              <FormTextarea value={values.typographyRules} onChange={set("typographyRules")} rows={4} />
            </FormField>
            <FormField fieldKey="environmentRules">
              <FormTextarea value={values.environmentRules} onChange={set("environmentRules")} rows={4} />
            </FormField>
          </div>
          <FormField fieldKey="imagePromptRules">
            <FormTextarea value={values.imagePromptRules} onChange={set("imagePromptRules")} rows={5} size="lg" />
          </FormField>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Color Palette</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField fieldKey="colorPalette" hint={FORM_HINTS.colors}>
            <FormTextarea
              value={values.colorPalette}
              onChange={set("colorPalette")}
              rows={5}
              size="lg"
              className="font-mono text-sm"
            />
          </FormField>
          <FormField fieldKey="characterRules">
            <FormTextarea value={values.characterRules} onChange={set("characterRules")} rows={5} size="lg" />
          </FormField>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Thumbnail & Merch Rules</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField fieldKey="thumbnailRules">
            <FormTextarea value={values.thumbnailRules} onChange={set("thumbnailRules")} rows={5} size="lg" />
          </FormField>
          <FormField fieldKey="merchDesignRules">
            <FormTextarea value={values.merchDesignRules} onChange={set("merchDesignRules")} rows={5} size="lg" />
          </FormField>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reference Assets</CardTitle>
          <CardDescription>Creative boundaries and linked reference files.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <FormField fieldKey="forbiddenElements" hint={FORM_HINTS.arrayPerLine}>
            <FormTextarea value={values.forbiddenElements} onChange={set("forbiddenElements")} rows={6} size="lg" />
          </FormField>
          <FormField fieldKey="tags" hint={FORM_HINTS.commaSeparated}>
            <FormTextarea value={values.tags} onChange={set("tags")} rows={3} />
          </FormField>
          <FormField fieldKey="referenceAssetIds" hint={FORM_HINTS.assetIds}>
            <FormTextarea
              value={values.referenceAssetIds}
              onChange={set("referenceAssetIds")}
              rows={4}
              className="font-mono text-xs"
            />
          </FormField>
          <FormField fieldKey="referenceDriveFileIds" hint={FORM_HINTS.assetIds}>
            <FormTextarea
              value={values.referenceDriveFileIds}
              onChange={set("referenceDriveFileIds")}
              rows={4}
              className="font-mono text-xs"
            />
          </FormField>
          <div className="md:col-span-2">
            <FormField fieldKey="notes">
              <FormTextarea value={values.notes} onChange={set("notes")} rows={4} />
            </FormField>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
