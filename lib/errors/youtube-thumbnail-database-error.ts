export class YouTubeThumbnailDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "YouTubeThumbnailDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
