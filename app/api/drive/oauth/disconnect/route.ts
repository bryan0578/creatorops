import { NextResponse } from "next/server"

import { disconnectDrive } from "@/lib/actions/drive-integration"

export async function POST() {
  const result = await disconnectDrive()
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"
  const params = result.success ? "disconnected=1" : "error=disconnect_failed"
  return NextResponse.redirect(new URL(`/integrations?tab=google-drive&${params}`, base))
}
