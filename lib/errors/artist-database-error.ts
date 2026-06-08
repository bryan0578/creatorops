export class ArtistDatabaseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = "ArtistDatabaseError"
    if (options?.cause !== undefined) {
      this.cause = options.cause
    }
  }
}
