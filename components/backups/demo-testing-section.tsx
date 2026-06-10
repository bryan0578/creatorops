"use client"

import * as React from "react"
import { FlaskConical, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  deleteDemoData,
  getDemoDataStatus,
  seedDemoData,
  type DemoDataStatus,
} from "@/lib/actions/demo-data"
import { EmptyState } from "@/components/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function formatDate(ts: number | null) {
  if (!ts) return "—"
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function DemoTestingSection({
  onDataChanged,
}: {
  onDataChanged: () => Promise<void>
}) {
  const [status, setStatus] = React.useState<DemoDataStatus | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [seeding, setSeeding] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const refreshStatus = React.useCallback(async () => {
    setLoading(true)
    try {
      const next = await getDemoDataStatus()
      setStatus(next)
    } catch {
      toast.error("Could not load demo data status")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  async function handleSeed() {
    setSeeding(true)
    try {
      const result = await seedDemoData()
      if (result.success) {
        toast.success("Demo data seeded")
        await onDataChanged()
        await refreshStatus()
      } else {
        toast.error(result.message || "Error seeding demo data")
      }
    } catch {
      toast.error("Error seeding demo data")
    } finally {
      setSeeding(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const result = await deleteDemoData()
      if (result.success) {
        toast.success("Demo data deleted")
        await onDataChanged()
        await refreshStatus()
      } else {
        toast.error(result.message || "Error deleting demo data")
      }
    } catch {
      toast.error("Error deleting demo data")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className="border-border/80">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Demo & Testing</CardTitle>
            <CardDescription>
              Seed a full PrettyWise demo launch to test relationships, search, backups,
              dashboard activity, and campaign workflows.
            </CardDescription>
          </div>
          <Badge variant={status?.installed ? "default" : "secondary"}>
            {loading
              ? "Checking…"
              : status?.installed
                ? "Demo installed"
                : "Not installed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          <p className="font-medium">Demo data is for testing.</p>
          <p className="mt-1 text-pretty opacity-90">
            Deleting demo data only removes records marked{" "}
            <code className="text-xs">DEMO_DATA_CREATOROPS</code>. Real records are not
            deleted.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading demo status…
          </div>
        ) : status?.installed ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border/80 px-3 py-2">
              <p className="text-xs text-muted-foreground">Demo records</p>
              <p className="text-lg font-semibold tabular-nums">{status.totalRecords}</p>
            </div>
            <div className="rounded-lg border border-border/80 px-3 py-2">
              <p className="text-xs text-muted-foreground">Campaign</p>
              <p className="text-lg font-semibold tabular-nums">
                {status.recordCounts.campaign}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 px-3 py-2">
              <p className="text-xs text-muted-foreground">Linked assets</p>
              <p className="text-lg font-semibold tabular-nums">
                {status.recordCounts.releasePlan +
                  status.recordCounts.youtubePackage +
                  status.recordCounts.youtubeThumbnail +
                  status.recordCounts.social +
                  status.recordCounts.email +
                  status.recordCounts.merch +
                  status.recordCounts.productListing +
                  status.recordCounts.mockup +
                  status.recordCounts.analytics +
                  status.recordCounts.experiment}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 px-3 py-2">
              <p className="text-xs text-muted-foreground">Last seeded</p>
              <p className="text-sm font-medium">{formatDate(status.lastSeededAt)}</p>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={FlaskConical}
            title="PrettyWise demo not installed"
            description="Seed a complete Cotton Candy Skies launch with linked campaign, artist CRM, YouTube assets, merch, email, social, and analytics records."
            primaryActionLabel="Seed PrettyWise demo data"
            primaryActionOnClick={() => void handleSeed()}
          />
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSeed} disabled={seeding || deleting}>
            {seeding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FlaskConical className="size-4" />
            )}
            Seed PrettyWise demo data
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={seeding || deleting || !status?.installed}
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Delete demo data
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
