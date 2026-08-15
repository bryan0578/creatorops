import Image from "next/image"
import { AppShell, PageHeader } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <AppShell breadcrumb="About">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="About CreatorOps"
          description="A local-first productivity dashboard for a solo creator running AI music channels, a label, artist platform, and merch + digital product stores."
        />

        <Card size="sm" className="max-w-md">
          <CardHeader>
            <CardTitle>Dorsyth</CardTitle>
            <CardDescription>A Dorsyth Digital product.</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="https://dorsyth.com/digital"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center opacity-70 transition-opacity hover:opacity-100"
            >
              <Image
                src="/brand/dorsyth-digital-horizontal-gold.svg"
                alt="Dorsyth Digital"
                width={1204}
                height={180}
                className="h-4 w-auto"
              />
            </a>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
