"use client"

import * as React from "react"
import {
  Copy,
  Database,
  Download,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { useStore, createId } from "@/lib/store"
import type { ProductListing, ProductListingFormValues } from "@/lib/types"
import { PRODUCT_LISTING_TYPES } from "@/lib/types"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { migrateLocalProductListingsToDatabase } from "@/lib/actions/product-listings"
import { downloadJson, loadProductListings } from "@/lib/storage"
import {
  buildFinalListingText,
  buildProductListingCompletedPrompt,
  emptyFinalListingFields,
  emptyProductListingForm,
  finalFieldsFromProductListing,
  getProductListingTemplate,
  normalizeProductListing,
  type ProductListingFinalFields,
} from "@/lib/product-listings"

import { ModulePageHeader } from "@/components/app-shell"
import {
  FormSection,
  GENERATOR_WORKFLOW_TABS,
  ModuleTabPanel,
  ModuleWorkflowTabs,
  OutputSection,
  PromptPreviewBlock,
  RECENT_RECORDS_CARD_CLASS,
} from "@/components/module/form-layout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function formatDate(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const TEXTAREA_FIELDS = new Set([
  "audience",
  "designConcept",
  "tone",
  "secondaryKeywords",
  "productBenefits",
  "pricingNotes",
  "notes",
])

const FIELD_LABELS: Record<keyof ProductListingFormValues, string> = {
  productType: "Product type",
  niche: "Niche",
  audience: "Audience",
  designConcept: "Design concept",
  tone: "Tone",
  primaryKeyword: "Primary keyword",
  secondaryKeywords: "Secondary keywords",
  storeName: "Store name",
  productBenefits: "Product benefits",
  pricingNotes: "Pricing notes",
  notes: "Notes",
}

const FORM_FIELD_ORDER: (keyof ProductListingFormValues)[] = [
  "productType",
  "niche",
  "audience",
  "designConcept",
  "tone",
  "primaryKeyword",
  "secondaryKeywords",
  "storeName",
  "productBenefits",
  "pricingNotes",
  "notes",
]

const FINAL_LISTING_FIELDS: {
  key: keyof ProductListingFinalFields
  label: string
  multiline: boolean
  copyLabel: string
}[] = [
  {
    key: "finalTitle",
    label: "Final title",
    multiline: false,
    copyLabel: "title",
  },
  {
    key: "finalShortDescription",
    label: "Final short description",
    multiline: true,
    copyLabel: "short description",
  },
  {
    key: "finalLongDescription",
    label: "Final long description",
    multiline: true,
    copyLabel: "long description",
  },
  {
    key: "finalBulletPoints",
    label: "Final bullet points",
    multiline: true,
    copyLabel: "bullet points",
  },
  {
    key: "finalTags",
    label: "Final tags",
    multiline: true,
    copyLabel: "tags",
  },
  {
    key: "finalCollection",
    label: "Final collection/category",
    multiline: false,
    copyLabel: "collection",
  },
  {
    key: "finalCTA",
    label: "Final CTA",
    multiline: false,
    copyLabel: "CTA",
  },
  {
    key: "finalSocialCaption",
    label: "Final social caption",
    multiline: true,
    copyLabel: "social caption",
  },
  {
    key: "finalEmailSubject",
    label: "Final email subject",
    multiline: false,
    copyLabel: "email subject",
  },
]

export function ProductListingGenerator() {
  const {
    prompts,
    productListings,
    productListingsUseDatabase,
    addProductListing,
    updateProductListing,
    deleteProductListing,
    importProductListings,
    reloadProductListings,
  } = useStore()

  const [form, setForm] = React.useState<ProductListingFormValues>(
    emptyProductListingForm(),
  )
  const [aiResponse, setAiResponse] = React.useState("")
  const [finalListing, setFinalListing] =
    React.useState<ProductListingFinalFields>(emptyFinalListingFields())
  const [editingId, setEditingId] = React.useState<string | null>(null)

  const [listingSearch, setListingSearch] = React.useState("")
  const [pendingDelete, setPendingDelete] =
    React.useState<ProductListing | null>(null)
  const [migrating, setMigrating] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const template = React.useMemo(
    () => getProductListingTemplate(prompts),
    [prompts],
  )

  const completedPrompt = React.useMemo(
    () => buildProductListingCompletedPrompt(template, form),
    [template, form],
  )

  const usingSavedTemplate = React.useMemo(
    () =>
      prompts.some(
        (p) =>
          p.id === "p-product-listing" ||
          p.name === "Product Listing Generator",
      ),
    [prompts],
  )

  const filteredListings = React.useMemo(() => {
    const q = listingSearch.trim().toLowerCase()
    const sorted = [...productListings].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )
    if (!q) return sorted
    return sorted.filter(
      (listing) =>
        listing.finalTitle.toLowerCase().includes(q) ||
        listing.niche.toLowerCase().includes(q) ||
        listing.productType.toLowerCase().includes(q) ||
        listing.primaryKeyword.toLowerCase().includes(q) ||
        listing.storeName.toLowerCase().includes(q) ||
        listing.finalTags.toLowerCase().includes(q),
    )
  }, [productListings, listingSearch])

  function setField<K extends keyof ProductListingFormValues>(
    key: K,
    value: ProductListingFormValues[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setForm(emptyProductListingForm())
    setAiResponse("")
    setFinalListing(emptyFinalListingFields())
    setEditingId(null)
  }

  function clearFinalListing() {
    setFinalListing(emptyFinalListingFields())
    toast.success("Final listing cleared")
  }

  function setFinalField<K extends keyof ProductListingFinalFields>(
    key: K,
    value: ProductListingFinalFields[K],
  ) {
    setFinalListing((prev) => ({ ...prev, [key]: value }))
  }

  async function handleCopy(text: string, label: string) {
    try {
      await copyToClipboard(text)
      toast.success(`Copied ${label}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not copy")
    }
  }

  async function handleSaveListing() {
    const now = Date.now()
    const listing = normalizeProductListing({
      id: editingId ?? createId("listing"),
      ...form,
      completedPrompt,
      aiResponse,
      ...finalListing,
      createdAt: editingId
        ? (productListings.find((l) => l.id === editingId)?.createdAt ?? now)
        : now,
      updatedAt: now,
    })

    try {
      if (editingId) {
        await updateProductListing(listing)
        toast.success("Product listing updated")
      } else {
        await addProductListing(listing)
        setEditingId(listing.id)
        toast.success("Product listing saved")
      }
    } catch {
      toast.error("Could not save product listing to database")
    }
  }

  function openListing(listing: ProductListing) {
    const normalized = normalizeProductListing(listing)
    setForm({
      productType: normalized.productType,
      niche: normalized.niche,
      audience: normalized.audience,
      designConcept: normalized.designConcept,
      tone: normalized.tone,
      primaryKeyword: normalized.primaryKeyword,
      secondaryKeywords: normalized.secondaryKeywords,
      storeName: normalized.storeName,
      productBenefits: normalized.productBenefits,
      pricingNotes: normalized.pricingNotes,
      notes: normalized.notes,
    })
    setAiResponse(normalized.aiResponse)
    setFinalListing(finalFieldsFromProductListing(normalized))
    setEditingId(normalized.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Product listing loaded")
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await deleteProductListing(pendingDelete.id)
      if (editingId === pendingDelete.id) resetForm()
      setPendingDelete(null)
      toast.success("Product listing deleted")
    } catch {
      toast.error("Could not delete product listing from database")
    }
  }

  function handleExport() {
    downloadJson("creatorops-product-listings.json", productListings)
    toast.success("Exported product listings")
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const items = (Array.isArray(parsed) ? parsed : [parsed]).map(
          (item) => normalizeProductListing(item as ProductListing),
        )
        await importProductListings(items)
        toast.success(`Imported ${items.length} product listing(s) to database`)
      } catch {
        toast.error("Invalid JSON file or import failed")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  async function handleMigrateLocal() {
    const local = loadProductListings()
    if (local.length === 0) {
      toast.error("No product listings found in localStorage to migrate")
      return
    }
    setMigrating(true)
    try {
      const { migrated, total } =
        await migrateLocalProductListingsToDatabase(local)
      await reloadProductListings()
      toast.success(
        `Migrated ${migrated} local product listing(s). Database now has ${total} total.`,
      )
    } catch {
      toast.error("Migration to database failed")
    } finally {
      setMigrating(false)
    }
  }

  const finalListingText = buildFinalListingText(finalListing)

  return (
    <div className="flex flex-col gap-8">
      <ModulePageHeader
        title="Product Listing Generator"
        description="Generate, save, and organize ecommerce listings for merch, digital products, templates, and tech resources."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSaveListing}>
              {editingId ? "Update product listing" : "Save product listing"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                New listing
              </Button>
            ) : null}
          </div>
        }
      />

      <ModuleWorkflowTabs defaultTab="details" tabs={GENERATOR_WORKFLOW_TABS}>
        <ModuleTabPanel value="details">
          <Card>
            <CardContent className="pt-6">
              <FormSection
                title="Product details"
                description="Describe the product to build your listing prompt"
              >
            {FORM_FIELD_ORDER.map((field) => {
              const id = `listing-${field}`
              const label = FIELD_LABELS[field]

              if (field === "productType") {
                return (
                  <div key={field} className="space-y-2">
                    <Label htmlFor={id} className="text-sm font-medium">
                      Product type
                    </Label>
                    <Select
                      value={form.productType}
                      onValueChange={(v) => setField("productType", v)}
                    >
                      <SelectTrigger id={id} className="w-full">
                        <span className="truncate">{form.productType}</span>
                      </SelectTrigger>
                      <SelectContent className="min-w-[260px]">
                        {PRODUCT_LISTING_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              }

              const commonProps = {
                id,
                value: form[field],
                onChange: (
                  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                ) => setField(field, e.target.value),
                placeholder: `Enter ${label.toLowerCase()}...`,
                className: "w-full",
              }

              return (
                <div key={field} className="space-y-2">
                  <Label htmlFor={id} className="text-sm font-medium">
                    {label}
                  </Label>
                  {TEXTAREA_FIELDS.has(field) ? (
                    <Textarea
                      {...commonProps}
                      className="min-h-20 w-full"
                    />
                  ) : (
                    <Input {...commonProps} />
                  )}
                </div>
              )
            })}
            </FormSection>
          </CardContent>
        </Card>
        </ModuleTabPanel>

        <ModuleTabPanel value="prompt">
          <OutputSection
            title="Completed prompt"
            description={
              usingSavedTemplate
                ? "Using Product Listing Generator from library"
                : "Using built-in fallback template"
            }
            action={
              <Button
                type="button"
                size="sm"
                disabled={!completedPrompt.trim()}
                onClick={() => handleCopy(completedPrompt, "prompt")}
              >
                <Copy className="size-4" />
                Copy prompt
              </Button>
            }
          >
            <PromptPreviewBlock value={completedPrompt} />
          </OutputSection>
        </ModuleTabPanel>

        <ModuleTabPanel value="ai-response">
          <OutputSection
            title="AI response"
            description="Paste the response from ChatGPT or your AI tool"
          >
            <Textarea
              id="listing-ai-response"
              value={aiResponse}
              onChange={(e) => setAiResponse(e.target.value)}
              placeholder="Paste AI response here..."
              className="min-h-40 w-full font-mono text-xs"
            />
            {aiResponse.trim() ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy(aiResponse, "AI response")}
              >
                <Copy className="size-4" />
                Copy AI response
              </Button>
            ) : null}
          </OutputSection>
        </ModuleTabPanel>

        <ModuleTabPanel value="final">
          <OutputSection
            title="Final Listing"
            description="Paste or edit your chosen product listing copy"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFinalListing}
              >
                Clear final listing
              </Button>
            }
          >
              {FINAL_LISTING_FIELDS.map(({ key, label, multiline, copyLabel }) => {
                const value = finalListing[key]
                const id = `final-${key}`

                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={id} className="text-sm font-medium">
                        {label}
                      </Label>
                      {value.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleCopy(value, copyLabel)}
                        >
                          <Copy className="size-3.5" />
                          Copy
                        </Button>
                      ) : null}
                    </div>
                    {multiline ? (
                      <Textarea
                        id={id}
                        value={value}
                        onChange={(e) => setFinalField(key, e.target.value)}
                        className="min-h-20 w-full"
                      />
                    ) : (
                      <Input
                        id={id}
                        value={value}
                        onChange={(e) => setFinalField(key, e.target.value)}
                        className="w-full"
                      />
                    )}
                  </div>
                )
              })}

              {finalListingText.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleCopy(finalListingText, "final listing")
                  }
                >
                  <Copy className="size-4" />
                  Copy final listing
                </Button>
              ) : null}
          </OutputSection>
        </ModuleTabPanel>

        <ModuleTabPanel value="saved">
      <Card className={RECENT_RECORDS_CARD_CLASS}>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Recent product listings</CardTitle>
            <CardDescription>
              {productListings.length} saved listing
              {productListings.length === 1 ? "" : "s"}
              {productListingsUseDatabase
                ? " · stored in SQLite"
                : " · using localStorage fallback"}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-56">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={listingSearch}
                onChange={(e) => setListingSearch(e.target.value)}
                placeholder="Search listings..."
                className="pl-8"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMigrateLocal}
              disabled={migrating}
            >
              <Database className="size-4" />
              {migrating ? "Migrating…" : "Migrate local"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4" />
              Export
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredListings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {productListings.length === 0
                ? "No product listings saved yet. Fill in the form and save your first listing."
                : "No listings match your search."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredListings.map((listing) => {
                const normalized = normalizeProductListing(listing)
                const listingText = buildFinalListingText(
                  finalFieldsFromProductListing(normalized),
                )

                return (
                  <div
                    key={normalized.id}
                    className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() => openListing(normalized)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {normalized.finalTitle ||
                            normalized.niche ||
                            "Untitled listing"}
                        </p>
                        {normalized.productType ? (
                          <Badge variant="secondary">
                            {normalized.productType}
                          </Badge>
                        ) : null}
                        {normalized.storeName ? (
                          <Badge variant="outline">{normalized.storeName}</Badge>
                        ) : null}
                        {editingId === normalized.id ? (
                          <Badge variant="outline" className="text-xs">
                            Editing
                          </Badge>
                        ) : null}
                      </div>
                      {normalized.primaryKeyword ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Keyword: {normalized.primaryKeyword}
                        </p>
                      ) : null}
                      {normalized.finalShortDescription ? (
                        <p className="mt-1 line-clamp-2 text-sm text-pretty">
                          {normalized.finalShortDescription}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(normalized.updatedAt)}
                      </p>
                    </button>
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            normalized.completedPrompt,
                            "completed prompt",
                          )
                        }
                      >
                        <Copy className="size-4" />
                        Prompt
                      </Button>
                      {normalized.aiResponse.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(normalized.aiResponse, "AI response")
                          }
                        >
                          <Copy className="size-4" />
                          Response
                        </Button>
                      ) : null}
                      {listingText.trim() ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(listingText, "final listing")
                          }
                        >
                          <Copy className="size-4" />
                          Listing
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openListing(normalized)}
                      >
                        Open
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setPendingDelete(normalized)}
                        aria-label="Delete product listing"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
        </ModuleTabPanel>
      </ModuleWorkflowTabs>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete product listing?</DialogTitle>
            <DialogDescription>
              {pendingDelete
                ? `"${pendingDelete.finalTitle || pendingDelete.niche || "Untitled"}" will be permanently removed.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
