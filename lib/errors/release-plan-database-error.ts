export class ReleasePlanDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "ReleasePlanDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
