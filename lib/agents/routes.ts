export function agentHref(agentId: string, params?: Record<string, string | undefined>): string {
  const search = new URLSearchParams({ tab: "run", agentId })
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value)
    }
  }
  return `/agents?${search.toString()}`
}
