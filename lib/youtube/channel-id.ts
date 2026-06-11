const UC_CHANNEL_ID = /^UC[\w-]{10,}$/i

export type ParseYouTubeChannelIdResult =
  | { ok: true; channelId: string }
  | { ok: false; reason: "empty" | "handle_not_supported" | "invalid" }

/**
 * Parse a YouTube channel ID from raw input or /channel/UC... URLs.
 * @handle and /c/ custom URLs are not resolved (requires extra API calls).
 */
export function parseYouTubeChannelIdInput(input: string): ParseYouTubeChannelIdResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: false, reason: "empty" }
  }

  if (UC_CHANNEL_ID.test(trimmed)) {
    return { ok: true, channelId: trimmed }
  }

  try {
    const asUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`
    const url = new URL(asUrl)
    const host = url.hostname.replace(/^www\./, "")
    if (!host.endsWith("youtube.com") && host !== "youtu.be") {
      return { ok: false, reason: "invalid" }
    }

    const channelMatch = url.pathname.match(/\/channel\/(UC[\w-]+)/i)
    if (channelMatch?.[1]) {
      return { ok: true, channelId: channelMatch[1] }
    }

    if (url.pathname.includes("/@") || url.pathname.startsWith("/c/")) {
      return { ok: false, reason: "handle_not_supported" }
    }
  } catch {
    return { ok: false, reason: "invalid" }
  }

  return { ok: false, reason: "invalid" }
}

export function isValidYouTubeChannelIdFormat(channelId: string): boolean {
  return UC_CHANNEL_ID.test(channelId.trim())
}
