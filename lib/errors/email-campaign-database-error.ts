export class EmailCampaignDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "EmailCampaignDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
