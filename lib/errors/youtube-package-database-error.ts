export class YouTubePackageDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "YouTubePackageDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
