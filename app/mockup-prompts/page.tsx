import { AppShell } from "@/components/app-shell"
import { MockupPromptGenerator } from "@/components/mockup-prompts/mockup-prompt-generator"

export default function MockupPromptsPage() {
  return (
    <AppShell breadcrumb="Mockup Prompts">
      <MockupPromptGenerator />
    </AppShell>
  )
}
