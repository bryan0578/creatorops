"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookOpen, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { createPrettyWiseStarterBible } from "@/lib/actions/artist-bible"
import { agentHref } from "@/lib/agents/routes"
import { ModulePageHeader } from "@/components/app-shell"
import {
  GuideActions,
  GuideBulletList,
  GuideCallout,
  GuideChecklist,
  GuideDoneHint,
  GuideModuleCard,
  GuideSection,
} from "@/components/operating-guide/guide-ui"
import { ModuleShell, ModuleTabPanel, ModuleWorkflowTabs } from "@/components/module/form-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const TABS = [
  { value: "start", label: "Start Here" },
  { value: "prettywise", label: "PrettyWise Setup" },
  { value: "artist-universe", label: "Artist Universe" },
  { value: "assets", label: "Assets & Drive" },
  { value: "release", label: "Release Campaign" },
  { value: "youtube", label: "YouTube Workflow" },
  { value: "product", label: "Product & Commerce" },
  { value: "weekly", label: "Weekly Review" },
  { value: "agents", label: "AI Agents" },
  { value: "troubleshooting", label: "Troubleshooting" },
] as const

type TabValue = (typeof TABS)[number]["value"]

const TAB_ALIASES: Record<string, TabValue> = {
  start: "start",
  "start-here": "start",
  prettywise: "prettywise",
  "prettywise-setup": "prettywise",
  "artist-universe": "artist-universe",
  assets: "assets",
  "assets-drive": "assets",
  release: "release",
  "release-campaign": "release",
  youtube: "youtube",
  "youtube-workflow": "youtube",
  product: "product",
  commerce: "product",
  weekly: "weekly",
  "weekly-review": "weekly",
  agents: "agents",
  "ai-agents": "agents",
  troubleshooting: "troubleshooting",
}

const START_CHECKLIST = [
  { label: "Create or review Artist Bible", href: "/artist-bible" },
  { label: "Create Visual Identity", href: "/visual-identity" },
  { label: "Add 3–5 Lore entries", href: "/lore" },
  { label: "Add 3–5 Song Concepts", href: "/song-vault" },
  { label: "Connect Drive folder", href: "/integrations?tab=google-drive" },
  { label: "Link assets", href: "/assets" },
  { label: "Create first campaign", href: "/campaigns" },
  { label: "Import/sync YouTube videos", href: "/integrations?tab=youtube-api" },
  { label: "Run Campaign QA Agent", href: agentHref("campaign-qa") },
  { label: "Create first Learning", href: "/learnings" },
]

const PRETTYWISE_ACTIONS = [
  { label: "Open Artist Bible", href: "/artist-bible" },
  { label: "Open Visual Identity", href: "/visual-identity" },
  { label: "Open Lore Manager", href: "/lore" },
  { label: "Open Song Vault", href: "/song-vault" },
  { label: "Open Drive Integration", href: "/integrations?tab=google-drive", variant: "outline" as const },
  { label: "Open Campaigns", href: "/campaigns", variant: "outline" as const },
  { label: "Open Product Factory", href: "/product-factory", variant: "outline" as const },
  { label: "Run Release Strategist", href: agentHref("release-strategist", { artistName: "PrettyWise" }), variant: "outline" as const },
]

export function OperatingGuidePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get("tab") ?? "start"
  const tab = TAB_ALIASES[rawTab] ?? "start"
  const [seeding, setSeeding] = React.useState(false)

  function setTab(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.replace(`?${params.toString()}`, { scroll: false })
  }

  async function handlePrettyWiseStarter() {
    setSeeding(true)
    try {
      const result = await createPrettyWiseStarterBible()
      toast.message(result.message)
      if (result.record) router.push(`/artist-bible?recordId=${encodeURIComponent(result.record.id)}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create starter bible")
    } finally {
      setSeeding(false)
    }
  }

  return (
    <ModuleShell>
      <ModulePageHeader
        title="CreatorOps Operating Guide"
        description="A practical step-by-step guide for setting up artists, campaigns, assets, products, analytics, AI agents, and weekly operating rhythms."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setTab("weekly")}>
              Weekly Review
            </Button>
            <Button size="sm" onClick={() => setTab("prettywise")}>
              <Sparkles className="mr-1 size-4" />
              PrettyWise Setup
            </Button>
          </div>
        }
      />

      <ModuleWorkflowTabs tabs={[...TABS]} value={tab} onValueChange={setTab}>
        <ModuleTabPanel value="start">
          <div className="space-y-6">
            <GuideCallout>
              <strong>You do not need to fill every module before using CreatorOps.</strong> Start with
              one artist, one release, one Drive folder, one campaign, and one learning loop.
            </GuideCallout>
            <GuideSection
              title="What CreatorOps is"
              description="A local-first operating system for AI music artists — identity, releases, YouTube, products, analytics, and reusable learnings in one workspace."
            />
            <GuideSection title="What to set up first">
              <GuideBulletList
                items={[
                  "Artist Bible + Visual Identity (who the artist is and how they look)",
                  "A few Lore entries and Song Concepts (creative raw material)",
                  "One Google Drive folder synced and linked as assets",
                  "One release campaign with YouTube packaging",
                  "One learning after your first publish or review",
                ]}
              />
            </GuideSection>
            <GuideSection title="What not to worry about yet">
              <GuideBulletList
                items={[
                  "Perfect data in every module",
                  "Full revenue tracking before first product",
                  "Every automation rule or pattern",
                  "Connecting every historical video on day one",
                ]}
              />
            </GuideSection>
            <GuideSection title="Recommended first 7 days">
              <GuideBulletList
                items={[
                  "Day 1–2: Artist Universe (Bible, Visual, Lore, Songs)",
                  "Day 3: Drive folder + asset linking",
                  "Day 4: First campaign + YouTube package",
                  "Day 5: Publish or import video, run Campaign QA",
                  "Day 6: One product research idea or mockup",
                  "Day 7: Weekly review — learnings, patterns, one playbook tweak",
                ]}
              />
            </GuideSection>
            <GuideSection title="Minimum usable setup">
              <GuideChecklist title="Core checklist" items={START_CHECKLIST} />
              <GuideDoneHint />
            </GuideSection>
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="prettywise">
          <div className="space-y-6">
            <GuideCallout>
              PrettyWise is a dark K-pop / horror pop AI artist under Dorsyth Records. Use this tab to
              seed your first real project without filling every module.
            </GuideCallout>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={seeding} onClick={() => void handlePrettyWiseStarter()}>
                {seeding ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Sparkles className="mr-1 size-4" />}
                Create PrettyWise Starter Bible
              </Button>
            </div>
            <GuideSection title="1. PrettyWise Identity">
              <GuideBulletList
                items={[
                  "Artist: PrettyWise",
                  "Label: Dorsyth Records",
                  "Genre: Dark K-pop, Horror Pop, Dark Pop",
                  "Mood: dark, cinematic, aggressive, mysterious, hypnotic, rebellious, dystopian, emotional, villainous",
                  "Audience: dark electronic, cyberpunk visuals, anime edits, villain playlists, gaming montages, alternative AI music",
                  "Aesthetic: creepy-cute candy horror, red/black cyberpunk, anime-inspired female character, corrupted digital textures",
                ]}
              />
            </GuideSection>
            <GuideSection title="2. PrettyWise Visual Style">
              <p className="text-sm text-muted-foreground">
                Create a Visual Identity profile: red/black palette, glowing eyes, corrupted textures, minimal
                thumbnail text, premium dark merch.
              </p>
            </GuideSection>
            <GuideSection title="3. PrettyWise Lore Seeds">
              <GuideBulletList
                items={[
                  "The Candy Static",
                  "The Red Eye Signal",
                  "No Exit Corridor",
                  "Creepy-Cute Mask",
                  "Sugar Trap",
                ]}
              />
            </GuideSection>
            <GuideSection title="4. PrettyWise Song Vault">
              <GuideBulletList
                items={[
                  "No Exit",
                  "Cotton Candy Skies",
                  "Red Light Lullaby",
                  "Sugar Trap",
                  "Static Dollhouse",
                ]}
              />
            </GuideSection>
            <GuideSection title="5. PrettyWise Asset Folder">
              <p className="text-sm text-muted-foreground">
                Sync a Drive folder named PrettyWise with subfolders for brand refs, covers, thumbnails,
                videos, and mockups (see Assets &amp; Drive tab).
              </p>
            </GuideSection>
            <GuideSection title="6. PrettyWise First Campaign">
              <p className="text-sm text-muted-foreground">
                Create a music release campaign, link artist PrettyWise, attach a song concept, and run
                Release Strategist before packaging.
              </p>
            </GuideSection>
            <GuideSection title="7. PrettyWise Product Collection">
              <GuideBulletList
                items={[
                  "No Exit black/red shirt",
                  "Cotton Candy Skies creepy-cute shirt",
                  "PrettyWise cyber horror poster",
                  "Lyric phrase merch",
                  "Dark K-pop prompt pack or visual pack",
                ]}
              />
            </GuideSection>
            <GuideSection title="8. PrettyWise AI Context">
              <p className="text-sm text-muted-foreground">
                After Bible + Lore + Visual exist, run Release Strategist and Campaign QA with artistName
                PrettyWise. Agents pull Artist Universe context automatically.
              </p>
            </GuideSection>
            <GuideChecklist
              title="PrettyWise setup checklist"
              items={[
                { label: "Artist Bible for PrettyWise", href: "/artist-bible" },
                { label: "Visual Identity profile", href: "/visual-identity" },
                { label: "4+ lore entries", href: "/lore" },
                { label: "4+ song concepts", href: "/song-vault" },
                { label: "Story arc: Candy Horror Era", href: "/story-arcs" },
                { label: "Drive folder synced", href: "/integrations?tab=google-drive" },
                { label: "First release campaign", href: "/campaigns" },
                { label: "Product collection or research", href: "/product-factory" },
              ]}
            />
            <GuideActions actions={PRETTYWISE_ACTIONS} />
            <GuideDoneHint />
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="artist-universe">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground text-pretty">
              Artist Universe keeps songs, visuals, lore, and AI prompts aligned for one IP — not just
              disconnected tracks.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <GuideModuleCard
                title="Artist Bible"
                purpose="Central identity: voice, genre, mood, do/don't rules."
                firstSteps="Artist name, genre, mood, visual rules, brand promise."
                goodEnough="One bible with genre, mood, visual rules, and 3+ do/don't bullets."
                href="/artist-bible"
              />
              <GuideModuleCard
                title="Lore Manager"
                purpose="Worldbuilding, symbols, characters, canon vs flexible ideas."
                firstSteps="3 entries: one world, one symbol, one character."
                goodEnough="Canon status set on 1–2 core lore pieces."
                href="/lore"
              />
              <GuideModuleCard
                title="Song Concept Vault"
                purpose="Hooks, Suno prompts, visuals, release ideas before production."
                firstSteps="Title, concept summary, hook idea, visual concept."
                goodEnough="3 concepts with summary + hook or visual angle."
                href="/song-vault"
              />
              <GuideModuleCard
                title="Release Story Arcs"
                purpose="Connect songs, campaigns, and products across an era."
                firstSteps="One arc title, theme, 3 narrative beats."
                goodEnough="Arc linked to 2+ song concepts or one campaign."
                href="/story-arcs"
              />
              <GuideModuleCard
                title="Visual Identity"
                purpose="Thumbnail, merch, and image prompt rules."
                firstSteps="Profile name, colors, thumbnail rules, forbidden elements."
                goodEnough="Active profile with palette + thumbnail rules."
                href="/visual-identity"
              />
            </div>
            <GuideChecklist
              title="Minimum viable artist universe"
              items={[
                { label: "One Artist Bible", href: "/artist-bible" },
                { label: "One Visual Identity Profile", href: "/visual-identity" },
                { label: "Three Lore Entries", href: "/lore" },
                { label: "Three Song Concepts", href: "/song-vault" },
                { label: "One Story Arc", href: "/story-arcs" },
                { label: "One Drive reference folder", href: "/integrations?tab=google-drive" },
              ]}
            />
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="assets">
          <div className="space-y-6">
            <GuideSection
              title="Recommended Drive folder structure"
              description="Organize PrettyWise (or any artist) under a single root folder."
            >
              <Card className="border-border/80 font-mono text-xs">
                <CardContent className="pt-4">
                  <pre className="whitespace-pre-wrap text-muted-foreground">{`PrettyWise/
  00 Brand References
  01 Covers
  02 Thumbnails
  03 Videos
  04 Merch Mockups
  05 Product Images
  06 Social Graphics
  07 Lyrics and Prompts
  08 Campaign Exports`}</pre>
                </CardContent>
              </Card>
            </GuideSection>
            <GuideSection title="How assets work in CreatorOps">
              <GuideBulletList
                items={[
                  "Sync a folder through Google Drive integration",
                  "Create or link assets from Drive files",
                  "Link assets to campaigns, videos, and products",
                  "Use Asset Auto-Linking suggestions on the Assets page",
                  "Run Data Health to find missing or broken asset links",
                ]}
              />
            </GuideSection>
            <GuideActions
              actions={[
                { label: "Open Google Drive Integration", href: "/integrations?tab=google-drive" },
                { label: "Open Assets", href: "/assets" },
                { label: "Open Data Health", href: "/data-health", variant: "outline" },
              ]}
            />
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="release">
          <div className="space-y-6">
            <GuideSection title="Release workflow">
              <GuideChecklist
                items={[
                  { label: "1. Create campaign", href: "/campaigns" },
                  { label: "2. Set artist name and song title" },
                  { label: "3. Link song concept", href: "/song-vault" },
                  { label: "4. Link Drive folder / assets", href: "/assets" },
                  { label: "5. Create YouTube package", href: "/youtube-packaging" },
                  { label: "6. Create thumbnail prompt", href: "/youtube-thumbnails" },
                  { label: "7. Add product tie-ins", href: "/product-research" },
                  { label: "8. Run Campaign QA Agent", href: agentHref("campaign-qa") },
                  { label: "9. Publish and import/sync video", href: "/videos" },
                  { label: "10. Post-publish review + learnings", href: "/learnings" },
                ]}
              />
            </GuideSection>
            <GuideActions
              actions={[
                { label: "Open Campaigns", href: "/campaigns" },
                { label: "Open Launch Dashboard", href: "/campaigns" },
                { label: "Run Release Strategist", href: agentHref("release-strategist"), variant: "outline" },
              ]}
            />
            <GuideDoneHint />
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="youtube">
          <div className="space-y-6">
            <GuideSection title="YouTube modules">
              <GuideBulletList
                items={[
                  "YouTube API — connect, import, sync stats",
                  "Video Intelligence — manage videos, link campaigns",
                  "YouTube Packaging — titles, descriptions, tags",
                  "YouTube Thumbnails — thumbnail prompt concepts",
                  "Analytics — performance tracking",
                  "Quality Reviews — score packaging quality",
                  "Pattern Detection — find repeatable signals",
                  "Learning Feedback Loop — turn results into learnings",
                ]}
              />
            </GuideSection>
            <GuideSection title="Recommended weekly YouTube process">
              <GuideChecklist
                items={[
                  { label: "Sync video stats", href: "/integrations?tab=youtube-api" },
                  { label: "Review top and bottom videos", href: "/videos" },
                  { label: "Create one learning from a result", href: "/learnings" },
                  { label: "Create one experiment", href: "/experiments" },
                  { label: "Update playbook if pattern repeats", href: "/playbooks" },
                ]}
              />
            </GuideSection>
            <GuideActions
              actions={[
                { label: "Video Intelligence", href: "/videos" },
                { label: "YouTube Packaging", href: "/youtube-packaging" },
                { label: "Run YouTube Growth Strategist", href: agentHref("youtube-growth"), variant: "outline" },
              ]}
            />
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="product">
          <div className="space-y-6">
            <GuideSection title="Commerce modules">
              <GuideBulletList
                items={[
                  "Product Research — opportunities before you build",
                  "Product Factory — pipeline overview",
                  "Product Listings — store-ready listings",
                  "Mockup Prompts — image generation for merch",
                  "Collections — group drops and campaigns",
                  "Revenue Dashboard — manual/CSV revenue",
                  "Product Strategist Agent — planning assistance",
                ]}
              />
            </GuideSection>
            <GuideChecklist
              title="Minimum product setup"
              items={[
                { label: "One product research idea", href: "/product-research" },
                { label: "One product listing", href: "/product-listings" },
                { label: "One mockup prompt", href: "/mockup-prompts" },
                { label: "One mockup image in Drive / Assets", href: "/assets" },
                { label: "One collection", href: "/collections" },
                { label: "Campaign link on listing or collection", href: "/campaigns" },
                { label: "One quality review", href: "/quality" },
              ]}
            />
            <GuideActions
              actions={[
                { label: "Product Factory", href: "/product-factory" },
                { label: "Product Strategist", href: agentHref("product-strategist"), variant: "outline" },
              ]}
            />
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="weekly">
          <div className="space-y-6">
            <GuideSection title="Weekly operating rhythm">
              <GuideChecklist
                items={[
                  { label: "Sync YouTube stats", href: "/integrations?tab=youtube-api" },
                  { label: "Sync Drive folders", href: "/integrations?tab=google-drive" },
                  { label: "Review Data Health", href: "/data-health" },
                  { label: "Review Automation suggestions", href: "/automation" },
                  { label: "Run Pattern Detection", href: "/patterns" },
                  { label: "Run Quality vs Performance", href: "/quality-performance" },
                  { label: "Open Feedback Loop", href: "/feedback-loop" },
                  { label: "Create 1–3 learnings", href: "/learnings" },
                  { label: "Update one playbook", href: "/playbooks" },
                  { label: "Run Learning Synthesizer", href: agentHref("learning-synthesizer") },
                ]}
              />
            </GuideSection>
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="text-base">Friday Review</CardTitle>
              </CardHeader>
              <CardContent>
                <GuideBulletList
                  items={[
                    "What performed?",
                    "What failed?",
                    "What pattern appeared?",
                    "What should we test?",
                    "What should become a learning?",
                    "What should change next week?",
                  ]}
                />
              </CardContent>
            </Card>
            <GuideDoneHint />
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="agents">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  name: "Release Strategist",
                  when: "Before or during release planning",
                  context: "Artist Bible, lore, song concepts, campaigns",
                  result: "Prioritize launch tasks and narrative tie-ins",
                  id: "release-strategist",
                },
                {
                  name: "YouTube Growth Strategist",
                  when: "After video sync or packaging",
                  context: "Videos, analytics, packaging, visual identity",
                  result: "Packaging and growth ideas",
                  id: "youtube-growth",
                },
                {
                  name: "Product Strategist",
                  when: "Merch/collection planning",
                  context: "Product research, listings, collections",
                  result: "Product opportunities and launch fit",
                  id: "product-strategist",
                },
                {
                  name: "Prompt Optimizer",
                  when: "Prompts underperform",
                  context: "Prompt library and recent runs",
                  result: "Sharper prompt templates",
                  id: "prompt-optimizer",
                },
                {
                  name: "Campaign QA",
                  when: "Before publish",
                  context: "Campaign links, assets, checklist",
                  result: "Gap list before launch",
                  id: "campaign-qa",
                },
                {
                  name: "Learning Synthesizer",
                  when: "After weekly review",
                  context: "Learnings, experiments, analytics",
                  result: "Consolidated insights and next tests",
                  id: "learning-synthesizer",
                },
              ].map((agent) => (
                <Card key={agent.id} className="border-border/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{agent.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">When:</span> {agent.when}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Context:</span> {agent.context}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Use result to:</span> {agent.result}
                    </p>
                    <a href={agentHref(agent.id)} className="inline-block pt-2 text-sm text-primary hover:underline">
                      Run {agent.name}
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
            <GuideSection title="Recommended usage">
              <GuideBulletList
                items={[
                  "Before launch: Campaign QA + Release Strategist",
                  "After video sync: YouTube Growth Strategist",
                  "During product planning: Product Strategist",
                  "After weekly review: Learning Synthesizer",
                  "When prompts perform poorly: Prompt Optimizer",
                ]}
              />
            </GuideSection>
            <GuideActions actions={[{ label: "Open Creator AI Agents", href: "/agents" }]} />
          </div>
        </ModuleTabPanel>

        <ModuleTabPanel value="troubleshooting">
          <div className="space-y-6">
            <GuideSection title="Common problems">
              <div className="space-y-4">
                {[
                  {
                    q: "No data showing",
                    a: "Check SQLite is connected (Settings). Run db:migrate. Confirm you created records in the right module.",
                  },
                  {
                    q: "Videos not syncing",
                    a: "Reconnect YouTube API under Integrations. Confirm OAuth and channel selection.",
                  },
                  {
                    q: "Drive folder not syncing",
                    a: "Reconnect Google Drive. Pick folder in Integrations tab. Check Data Health for Drive gaps.",
                  },
                  {
                    q: "Empty tabs",
                    a: "Normal with no records — use empty states to create items. If tabs are blank with no message, refresh and run build.",
                  },
                  {
                    q: "Missing assets",
                    a: "Open Data Health → Missing Assets. Link Drive files or create assets from campaigns.",
                  },
                  {
                    q: "AI provider not configured",
                    a: "Settings → AI provider. Add API key server-side. Pages work without AI; agents show fallback.",
                  },
                ].map((item) => (
                  <Card key={item.q} className="border-border/80">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{item.q}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">{item.a}</CardContent>
                  </Card>
                ))}
              </div>
            </GuideSection>
            <GuideSection title="Useful commands">
              <Card className="border-border/80 font-mono text-xs">
                <CardContent className="space-y-1 pt-4 text-muted-foreground">
                  <p>npx prisma validate</p>
                  <p>npx prisma generate</p>
                  <p>npx prisma migrate status</p>
                  <p>npm run build</p>
                  <p>npm run dev</p>
                </CardContent>
              </Card>
            </GuideSection>
            <GuideActions
              actions={[
                { label: "Backup Center", href: "/backups" },
                { label: "Integrations", href: "/integrations" },
                { label: "Settings", href: "/settings", variant: "outline" },
              ]}
            />
          </div>
        </ModuleTabPanel>
      </ModuleWorkflowTabs>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <BookOpen className="size-3.5" />
        Full markdown version: <code className="rounded bg-muted px-1">docs/CREATOROPS_OPERATING_GUIDE.md</code>
      </p>
    </ModuleShell>
  )
}
