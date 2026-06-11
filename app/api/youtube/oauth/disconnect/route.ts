import { NextResponse } from "next/server"

import { disconnectYouTube } from "@/lib/actions/youtube-integration"

export async function POST() {
  const result = await disconnectYouTube()
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  return NextResponse.redirect(
    new URL(
      `/integrations?tab=youtube-api&${result.success ? "disconnected=1" : "error=disconnect_failed"}`,
      base,
    ),
  )
}

export async function GET() {
  return POST()
}
