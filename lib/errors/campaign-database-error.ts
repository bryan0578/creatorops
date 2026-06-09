export class CampaignDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "CampaignDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
