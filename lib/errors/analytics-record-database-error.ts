export class AnalyticsRecordDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "AnalyticsRecordDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
