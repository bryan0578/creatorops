import { redirect } from "next/navigation"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Alias route — forwards to /runner with the same query string. */
export default async function PromptRunnerAliasPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value)
    else if (Array.isArray(value) && value[0]) query.set(key, value[0])
  }
  const qs = query.toString()
  redirect(qs ? `/runner?${qs}` : "/runner")
}
