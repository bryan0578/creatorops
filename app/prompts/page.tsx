import { AppShell } from "@/components/app-shell"
import { PromptLibrary } from "@/components/prompts/prompt-library"

export default function PromptsPage() {
  return (
    <AppShell breadcrumb="Prompt Library">
      <PromptLibrary />
    </AppShell>
  )
}
