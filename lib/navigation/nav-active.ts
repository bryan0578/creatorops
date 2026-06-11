/**
 * Sidebar active-state helpers — pathname + optional query matching.
 */

function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim() || "/"
  if (trimmed.length > 1 && trimmed.endsWith("/")) {
    return trimmed.slice(0, -1)
  }
  return trimmed
}

function hrefPathname(href: string): string {
  const [path] = href.split("?")
  return normalizePathname(path)
}

function hrefSearch(href: string): URLSearchParams {
  const queryIndex = href.indexOf("?")
  if (queryIndex === -1) return new URLSearchParams()
  return new URLSearchParams(href.slice(queryIndex + 1))
}

function pathsMatch(pathname: string, href: string): boolean {
  const target = hrefPathname(href)
  if (target === "/") return pathname === "/"
  if (target === "/runner") return pathname === "/runner"
  return pathname === target || pathname.startsWith(`${target}/`)
}

function queryMatches(
  current: URLSearchParams,
  expected: URLSearchParams,
): boolean {
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) return false
  }
  return true
}

/** Whether a nav item should appear active for the current location. */
export function isNavItemActive(
  href: string,
  pathname: string,
  search = "",
): boolean {
  const normalizedPath = normalizePathname(pathname)
  if (!pathsMatch(normalizedPath, href)) return false

  const expectedQuery = hrefSearch(href)
  if ([...expectedQuery.keys()].length === 0) {
    return true
  }

  const currentQuery = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  )
  return queryMatches(currentQuery, expectedQuery)
}
